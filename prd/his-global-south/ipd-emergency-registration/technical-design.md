# Technical Design: Emergency patient registration

| Field | Value |
|-------|-------|
| **Project** | `his-global-south` |
| **Feature** | `ipd-emergency-registration` |
| **PRD** | [prd.md](./prd.md) |
| **Target repo** | `projects/his-global-south/` @ `develop` |
| **Status** | Approved for implementation planning |
| **Date** | 2026-08-20 |

## 1. Design Summary

Add an emergency registration path to the existing Front Desk patient domain. Emergency registration creates the same `patients` entity as normal registration, but records a provisional state:

```text
registration_mode = emergency
is_registered     = false
dob_estimated     = true
status            = active
```

Normal registration keeps its current workflow and becomes explicit:

```text
registration_mode = full
is_registered     = true
dob_estimated     = false
```

The change is additive to the patient domain. It does not add IPD tables or modify IPD routes. The returned patient UUID is the handoff contract for a later IPD admission slice.

## 2. Scope and Boundaries

### In scope

- Add registration metadata to `public.patients`.
- Add a dedicated emergency create API with a small Tier A request contract.
- Add a completion API that validates and promotes a provisional patient through the normal registration rules.
- Add the two registration entry buttons and emergency Tier A form.
- Show emergency/incomplete state in patient list and chart.
- Preserve the existing full registration path and duplicate-check behavior.
- Add service, route, integration, and focused UI tests.

### Out of scope

- IPD admission creation or IPD UI.
- Changes to `visit_admissions`, platform beds, or IPD tables.
- Automatic merge of unknown patients.
- SMS/email notifications, mass-casualty numbering, or external HIE changes.

### Ownership

| Concern | Owner | Change |
|---------|-------|--------|
| Patient persistence | `backend/src/modules/patient/pgschema/` | Additive columns only |
| Patient API | `backend/src/modules/frontdesk/patients/` | New emergency and completion operations |
| Registration UI | `src/pages/patients/PatientRegister.tsx` | Add entry selection and Tier A form |
| Patient badges | `src/pages/patients/PatientList.tsx`, `PatientDetail.tsx` | Read existing response fields |
| IPD | `backend/src/modules/ipd/`, `src/pages/ipd/` | No changes |

## 3. Data Model

### 3.1 Migration

Add the following columns to `public.patients`:

```sql
ALTER TABLE public.patients
  ADD COLUMN registration_mode text NOT NULL DEFAULT 'full',
  ADD COLUMN dob_estimated boolean NOT NULL DEFAULT false;

ALTER TABLE public.patients
  ADD CONSTRAINT patients_registration_mode_check
  CHECK (registration_mode IN ('full', 'emergency'));

CREATE INDEX idx_patients_registration_mode
  ON public.patients (organization_id, registration_mode, is_registered);
```

The migration must backfill existing rows to `registration_mode = 'full'` and `dob_estimated = false` before enforcing `NOT NULL`. Add matching Drizzle fields in `backend/src/modules/patient/pgschema/patients.pgschema.ts`.

`registration_note` is deliberately not a new patient column in v1. Store the optional emergency note in the existing patient audit record's `changes` JSON for traceability without expanding the PHI-bearing patient row. If reporting needs a first-class note later, that is a separate decision.

### 3.2 State rules

| Operation | `registration_mode` | `is_registered` | `dob_estimated` |
|-----------|---------------------|-----------------|-----------------|
| Existing/full create | `full` | `true` | `false` unless explicitly supported by current contract |
| Emergency create | `emergency` | `false` | `true` by default; `false` only when exact DOB is supplied and confirmed |
| Complete registration | `full` | `true` | `false` when exact DOB is confirmed |

Completion is the one-way v1 promotion from provisional to full. This resolves the PRD's open choice in favor of `registration_mode = full` after successful completion; emergency provenance remains available in the audit log.

The `patients` row remains `status = active` on emergency creation. Existing check-in protection for `is_registered = false` remains unchanged; IPD admission will use the patient ID directly in its own future contract.

## 4. API Design

All routes use the existing `withOrgAuth` middleware, derive `organization_id` from the session, and return snake_case JSON.

### 4.1 Emergency create

```text
POST /api/frontdesk/patients/emergency
```

Request body:

```json
{
  "first_name": "Unknown",
  "last_name": "Unknown-001",
  "date_of_birth": "1985-01-01",
  "dob_estimated": true,
  "gender": "unknown",
  "phone": "",
  "registration_note": "MVA, unidentified patient"
}
```

Contract rules:

- `first_name` and `last_name` default to `Unknown`; trim and reject blank values.
- `date_of_birth` is required because the database column is non-null.
- Accept either an estimated age converted to a bounded date or an estimated date supplied by the client; the API persists only the resulting ISO date and `dob_estimated` flag.
- `gender` defaults to `unknown` and uses the existing allowed gender values.
- Ignore/reject Tier B fields rather than silently treating them as complete registration data.
- Generate the existing patient display ID.
- Return `201` with the created patient, including `id`, `patient_id`, `registration_mode`, `is_registered`, and `dob_estimated`.

The service writes a `patient_audit_log` create event. The optional note is included in the audit changes payload, with no note or PHI written to application logs.

### 4.2 Complete registration

```text
POST /api/frontdesk/patients/:id/complete-registration
```

The body uses the existing full-registration fields. The handler first loads the patient within the authenticated organization and rejects missing, deceased, or already-complete records with the existing error envelope.

The service must:

1. Run the existing duplicate check using the submitted national ID/name/DOB.
2. Reject a definite duplicate with the existing duplicate error behavior.
3. Validate the full registration requirements, including emergency contact and coverage rules already enforced by the normal flow.
4. Update Tier A and Tier B patient fields in one transaction.
5. Set `registration_mode = 'full'`, `is_registered = true`, and `dob_estimated = false` when an exact DOB is confirmed.
6. Create/update active `patient_coverage` using the existing coverage service behavior.
7. Write an audit update containing the promotion and changed fields.

A successful response is `200` with the updated patient. The existing `PUT /api/frontdesk/patients/:id` remains available for ordinary edits and does not itself promote registration state.

### 4.3 List and detail responses

Extend existing patient list/detail projections with:

```text
registration_mode: 'full' | 'emergency'
dob_estimated: boolean
```

The existing `is_registered` filter remains supported. Add an optional `registration_mode=emergency` list filter only if the current list UI needs it; it is not required for the first create/complete path.

## 5. Backend File Plan

### New or changed files in the app clone

```text
backend/src/db/migrations/<next>_patient_registration_mode.sql
backend/src/modules/patient/pgschema/patients.pgschema.ts
backend/src/modules/frontdesk/patients/patients.routes.ts
backend/src/modules/frontdesk/patients/patients.controller.ts
backend/src/modules/frontdesk/patients/patients.schema.ts
backend/src/modules/frontdesk/patients/patients.service.ts
backend/src/modules/frontdesk/patients/__tests__/patients.service.test.ts
backend/src/__tests__/integration/api.integration.test.ts
```

Keep all changes inside the patient/frontdesk boundary. Do not modify IPD modules or OPD visit/admission behavior.

Recommended service functions:

```text
createEmergencyPatient(organizationId, userId, body)
completePatientRegistration(id, organizationId, userId, body)
```

The existing `createPatient` function should set the explicit full defaults but retain its public behavior and endpoint. Shared helpers should be extracted only where they prevent divergence between full and emergency persistence.

## 6. Frontend Design

### 6.1 Registration entry

`PatientRegister.tsx` starts with an entry choice before the existing wizard:

- `Register patient`: existing default button and existing three-step wizard.
- `Emergency register`: existing `Button` with the `destructive` variant, red background, and white text.

Choosing emergency renders a Tier A form in the same page shell. Cancel returns to the entry choice without changing the existing full wizard state.

### 6.2 Emergency form

Fields:

- First name, default `Unknown`.
- Last name, default `Unknown` or the next display suffix.
- Estimated age or date of birth, required.
- Gender, default `unknown`.
- Phone, optional.
- Registration note, optional.

The form calls a new public service function from the clinical module barrel, not a deep service import. On success it invalidates the patient list query and offers:

- `Create only`: navigate to `/patients`.
- IPD handoff remains a later slice; no live IPD admission call is made here.

### 6.3 Badges and completion

`PatientList.tsx` and `PatientDetail.tsx` use the response fields with this rule:

```text
registration_mode === 'emergency' && is_registered === false
  => red EMERGENCY badge plus existing INCOMPLETE badge
```

The patient detail CTA becomes `Complete registration` for both incomplete modes and opens the existing wizard pre-filled with the patient. On successful completion, invalidate patient list/detail queries; the emergency badge disappears when the response returns `registration_mode = full` and `is_registered = true`.

## 7. Security, Audit, and Privacy

- Require `withOrgAuth` on both new routes.
- Scope every read/update by `organization_id` to prevent cross-organization access.
- Do not log names, notes, DOBs, identifiers, or request bodies.
- Record create and promotion/update activity in `patient_audit_log`.
- Keep provisional patients out of normal check-in unless the existing explicit override is used.
- Do not store emergency notes in browser local storage or session storage.
- Apply existing request size, date, gender, email, and coverage validation conventions.

## 8. Testing Strategy

### Backend unit tests

- Emergency create applies defaults and persists `emergency`, `false`, and estimated DOB.
- Emergency create accepts a known name and optional phone/note.
- Emergency create rejects missing DOB and invalid gender/date.
- Generated patient IDs remain unique under repeated emergency creates.
- Completion promotes a provisional patient and clears `dob_estimated`.
- Completion rejects definite duplicates and missing/deceased patients.
- Existing full create still persists `full` and `true`.

### Integration tests

- `POST /api/frontdesk/patients/emergency` returns `201` for an authenticated organization.
- The response includes the patient ID required by a future IPD admission.
- Cross-organization patient completion returns the existing not-found behavior.
- `POST /api/frontdesk/patients/:id/complete-registration` returns `200` and removes provisional state.
- Existing full registration endpoint regression test remains green.

### Frontend tests

- Both entry buttons render before the wizard.
- Emergency button uses the destructive style.
- Emergency form submits Tier A only and displays the returned patient ID/status.
- List and chart render the emergency badge for provisional records.
- Completion pre-fills the wizard and removes the badge after success.

## 9. Rollout and Migration

1. Add and review the migration; existing patients receive `full` / `false` defaults.
2. Deploy backend schema and API changes.
3. Deploy UI after API availability.
4. Verify normal registration and patient list/detail behavior.
5. Verify one emergency create and one completion in a test organization.
6. Monitor audit events and API validation errors.

No data reset or seed dependency is required. The migration is backward-compatible for existing rows and can be rolled out before the UI.

## 10. Decisions and Open Questions for Gate G2

| Decision | Proposed answer | Status |
|----------|-----------------|--------|
| Completion mode | Set `registration_mode = full`; preserve emergency provenance in audit | Proposed |
| Emergency note storage | Audit `changes` JSON, not a new patient column | Proposed |
| Emergency age input | Convert age to an estimated ISO DOB at API boundary | Proposed |
| IPD handoff | Separate IPD slice; no admission call in this feature | Locked by PRD |
| Unknown suffix ownership | API generates the next organization-scoped suffix to avoid collisions | Proposed |

Approval of this document should confirm the proposed choices and authorize the ER-1, ER-2, and ER-3 implementation slices.

## References

- [Emergency registration PRD](./prd.md)
- [Intake ticket](./ticket.md)
- [his-global-south architecture](../../../docs/architecture/his-global-south.md)
- [his-global-south patterns](../../../docs/conventions/his-global-south-patterns.md)
- [IPD admission-to-bed tracer](../../../docs/journeys/his-global-south/ipd/admission-to-bed-tracer.md)
