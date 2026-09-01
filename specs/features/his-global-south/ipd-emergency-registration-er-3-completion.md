# ER-3 — Complete provisional registration

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `ipd-emergency-registration` |
| **Slice** | ER-3 |
| **Branch** | `feat/ipd-emergency-registration` (**same as ER-1 / ER-2** — no new branch) |
| **Clone path** | `projects/his-global-south/` |
| **Goal** | Promote provisional emergency patients through full registration (API + wizard prefill) |
| **Depends on** | [ER-1](./ipd-emergency-registration-er-1-api-db.md), [ER-2](./ipd-emergency-registration-er-2-ui.md) |
| **PRD** | [prd.md](../../../prd/his-global-south/ipd-emergency-registration/prd.md) |
| **Technical design** | [technical-design.md](../../../prd/his-global-south/ipd-emergency-registration/technical-design.md) |
| **Status** | Planned — plan ready, awaiting approval |

---

## Approval

- [ ] Product: acceptance criteria match PRD workflow 3 / US-4
- [ ] Tech: architecture decisions (TD §4.2, §3.2) respected; no IPD or schema creep
- [ ] Scope: completion API + wizard prefill only — no merge, notifications, or admission handoff

**Approved by:** _name_  
**Date:** _YYYY-MM-DD_

_Implement must not start until all boxes are checked and approver is named._

---

## Context (read before coding)

- [his-global-south-patterns.md](../../../docs/conventions/his-global-south-patterns.md) — frontdesk module layout (this slice is **patient/frontdesk**, not IPD)
- [modular-monolith-fastify-react.md](../../../docs/conventions/modular-monolith-fastify-react.md) — routes → controller → service layering
- TD §4.2 defines the **immutable** completion contract; `PUT /api/frontdesk/patients/:id` must **not** promote registration state
- ER-1 adds emergency create + `registration_mode` / `dob_estimated` columns
- ER-2 adds entry choice, emergency form, EMERGENCY badges, and `registerEmergencyPatient` export

---

## Architecture constraints (immutable from technical design)

| ID | Constraint | This slice |
|----|------------|------------|
| TD-§3.2 | Completion sets `registration_mode=full`, `is_registered=true`, `dob_estimated=false` when exact DOB confirmed | `completePatientRegistration` promotion block |
| TD-§4.2 | `POST /api/frontdesk/patients/:id/complete-registration` with full-registration body | New route + handler + schema |
| TD-§4.2 | Load patient in org; reject missing / deceased / already-complete | Service guards before transaction |
| TD-§4.2 | Run dedup; reject **definite** duplicate | Call `dedupPatients`; exclude current patient id from match |
| TD-§4.2 | Validate emergency contact + coverage like normal create | Shared validation helper extracted from `createPatient` path |
| TD-§4.2 | Single transaction: patient update + coverage + promotion + audit | `db.transaction` — do not split |
| TD-§4.2 | Emergency provenance preserved in audit `changes` | Audit includes `registration_promotion: { from: 'emergency', to: 'full' }` |
| TD-§4.3 | Response includes `registration_mode`, `dob_estimated`, `is_registered` | Return full patient row via `getPatientById` |
| TD-§6.3 | After completion, emergency + incomplete badges disappear | UI invalidates queries; badges driven by response fields |
| TD-§7 | No PHI in logs; `withOrgAuth`; org scoping | Same as ER-1 |
| PRD WF-3 | Wizard pre-filled Tier A; Tier B empty; staff replaces Unknown | `PatientRegister` reads `?id=` |
| PRD | No IPD admission call | Forbidden paths listed below |

---

## Previous slices context (code today)

| Item | Location | State |
|------|----------|--------|
| Emergency create API | `backend/.../patients.service.ts` `createEmergencyPatient` (245–296) | **ER-1 implemented** (uncommitted on branch) |
| Schema columns | `patients.pgschema.ts` — `registration_mode`, `dob_estimated`, `is_registered` | Present |
| Full create | `createPatient` (438–535) — coverage insert + contract check + audit | Reuse coverage block |
| Dedup | `dedupPatients` (537–591) — national ID definite; name+DOB probable/possible | **Not called on create/update today** — wire in completion |
| Partial update | `updatePatient` (704–774) — demographics only; **no** identifiers, coverage, or registration flags | Do **not** use alone for completion |
| Check-in guard | `checkInPatient` — `REGISTRATION_INCOMPLETE` when `!is_registered` (818–824) | Validates promotion value |
| Complete CTA | `PatientDetail.tsx` — navigates `/patients/register?id=${patient.id}` when `!isRegistered` | **Exists**; wizard ignores `id` today |
| Wizard | `PatientRegister.tsx` — 3-step Zod form; submit → `registerPatient` (create) | Must branch to completion when `?id=` |
| Patient type | `src/services/patients.service.ts` — `isRegistered`; ER-2 adds `registrationMode`, `dobEstimated` | Extend if ER-2 not merged yet |
| EMERGENCY badge | ER-2 `isProvisionalEmergency()` on list/detail | Badge removal is automatic when `isRegistered=true` |

**Reuse (do not duplicate):**

- `createPatientBodySchema` fields → alias as `completeRegistrationBodySchema`
- `createPatient` coverage insert block (503–521) and `hasActiveOrgPlanContract` guard (484–500)
- `resolvePatientAdminDivisions` for address/geo validation
- `patchPatientCoverage` deactivate-then-insert pattern (652–673) when active coverage already exists
- Frontend Zod schema + step validation in `PatientRegister.tsx` — same rules for completion submit
- `checkDuplicatePatient` live dedup UX — keep; backend must enforce definite duplicate on completion

**Forbidden:**

- `backend/src/modules/ipd/**`, `src/pages/ipd/**`
- New patient columns or migrations (ER-1 migration sufficient)
- Automatic patient merge
- Changing `PUT /api/frontdesk/patients/:id` to promote registration state

---

## Relevant files

| Action | Path |
|--------|------|
| **Modify** | `backend/src/modules/frontdesk/patients/patients.service.ts` |
| **Modify** | `backend/src/modules/frontdesk/patients/patients.controller.ts` |
| **Modify** | `backend/src/modules/frontdesk/patients/patients.routes.ts` |
| **Modify** | `backend/src/modules/frontdesk/patients/patients.schema.ts` |
| **Modify** | `backend/src/modules/frontdesk/frontdesk.constants.ts` — add error codes if needed |
| **Modify** | `backend/src/modules/frontdesk/__tests__/frontdesk.service.test.ts` |
| **Modify** | `backend/src/__tests__/integration/api.integration.test.ts` |
| **Modify** | `backend/src/__tests__/integration/db-mock-impl.ts` — completion transaction mocks |
| **Modify** | `src/services/patients.service.ts` |
| **Modify** | `src/modules/clinical/index.ts` |
| **Modify** | `src/pages/patients/PatientRegister.tsx` |
| **Modify** | `src/pages/patients/PatientDetail.tsx` — minor CTA copy only if ER-2 not merged |
| **New** | `src/pages/patients/__tests__/PatientRegister.completion.test.tsx` |
| **Modify** | `src/services/__tests__/patients.service.test.ts` |
| **Reference** | `createPatient`, `updatePatient`, `patchPatientCoverage` in `patients.service.ts` |
| **Reference** | ER-2 plan for badge helper and query invalidation keys |

---

## Phases

### Phase 0 — Prerequisite gate

- [ ] Branch `feat/ipd-emergency-registration` checked out in clone
- [ ] ER-1 merged or available locally (`POST /api/frontdesk/patients/emergency`, schema columns)
- [ ] ER-2 merged or available locally (badges, `registerEmergencyPatient`, `registrationMode` on `Patient` type)
- [ ] Manual smoke: create emergency patient → chart shows Complete registration → note wizard currently creates duplicate (confirms ER-3 need)

### Phase 1 — Backend foundation (service + errors)

1. Add error codes to `frontdesk.constants.ts` (if not present):

```typescript
DUPLICATE_PATIENT: 'DUPLICATE_PATIENT',           // 409 — definite dedup on completion
REGISTRATION_ALREADY_COMPLETE: 'REGISTRATION_ALREADY_COMPLETE', // 409
COMPLETION_NOT_PROVISIONAL: 'COMPLETION_NOT_PROVISIONAL',       // 422 — full patient, not emergency/incomplete
```

2. Extract shared helper (private in `patients.service.ts` or small `patients-registration.helpers.ts` if >40 lines):

```typescript
function buildPatientIdentifiers(nationalId: unknown): Array<{ system: string; value: string }>
function assertCompleteRegistrationCoverage(body, organizationId, tx): Promise<void>
function insertOrReplaceActiveCoverage(patientId, organizationId, body, tx): Promise<void>
```

Reuse logic from `createPatient` (438–521) without changing create behavior.

3. Implement **`completePatientRegistration(id, organizationId, userId, body)`**:

```text
1. SELECT patient WHERE id AND organization_id
   → NOT_FOUND (404) if missing
   → PATIENT_DECEASED (422) if status = deceased
   → REGISTRATION_ALREADY_COMPLETE (409) if is_registered AND registration_mode = full
   → COMPLETION_NOT_PROVISIONAL (422) if is_registered OR registration_mode not in {emergency} with incomplete intent
     (Allow: registration_mode=emergency && !is_registered; also legacy !is_registered full-mode rows if any)

2. Validate required fields (mirror createPatientBodySchema intent):
   - first_name, last_name, date_of_birth, gender
   - emergency_contact_name, emergency_contact_relationship, emergency_contact_phone
   - insurer_id (+ member/plan rules for non-self-pay)

3. dedupPatients(org, { national_id, first_name, last_name, dob })
   → if DEFINITE and matched patient.id !== id → DUPLICATE_PATIENT (409)

4. db.transaction:
   a. UPDATE patients SET all Tier A+B fields from body
   b. SET identifiers from national_id (replace jsonb array like createPatient)
   c. SET registration_mode='full', is_registered=true,
      dob_estimated=false when body supplies exact DOB (always false on completion per TD)
   d. INSERT or replace patient_coverage (deactivate prior active row if exists)
   e. INSERT patient_audit_log UPDATE with:
      - registration_promotion: { from: old.registration_mode, to: 'full' }
      - field deltas (same tracked fields as updatePatient)
   f. RETURN updated row

5. Return getPatientById(id, organizationId)
```

**Identifiers note:** `updatePatient` today does not update `identifiers`. Completion must set `identifiers` from `national_id` when provided (same as `createPatient` 446–448).

**Coverage note:** Emergency patients have no active coverage row. Use insert path from `createPatient`. If a partial coverage row exists, follow `patchPatientCoverage` deactivate + insert.

### Phase 2 — Backend HTTP surface

1. **`patients.schema.ts`** — add:

```typescript
export const completeRegistrationBodySchema = {
  ...createPatientBodySchema,
  required: ['first_name', 'last_name', 'date_of_birth', 'gender',
             'emergency_contact_name', 'emergency_contact_relationship', 'emergency_contact_phone',
             'insurer_id'],
} as const;
```

Adjust `required` to match what full registration enforces in practice (align with frontend Zod step 2–3).

2. **`patients.routes.ts`** — register **before** generic `:id` routes if ordering matters:

```typescript
fastify.post(
  '/api/frontdesk/patients/:id/complete-registration',
  { preHandler: [...withOrgAuth], schema: { body: completeRegistrationBodySchema } },
  completeRegistrationHandler,
);
```

3. **`patients.controller.ts`** — `completeRegistrationHandler`:

- Cast body; `isValidDateOfBirth` guard (same as create/update)
- Call `completePatientRegistration(req.auth.organizationId!, req.auth.profile!.id, id, body)`
- `200` + patient JSON; map `PatientServiceError` via `sendPatientServiceError`

### Phase 3 — Backend tests

| Test file | Cases |
|-----------|--------|
| `frontdesk.service.test.ts` | Promotes emergency → full; sets `dob_estimated=false`; writes audit with promotion; rejects definite duplicate; rejects deceased; rejects already complete; rejects wrong org (via missing row) |
| `api.integration.test.ts` | `POST .../complete-registration` → 200 with `registration_mode=full`, `is_registered=true`; cross-org → 404 |
| `db-mock-impl.ts` | Mock patient load, dedup none/definite, update returning promoted row, coverage insert |

Regression: existing emergency create + full create integration tests stay green.

### Phase 4 — Frontend service layer

1. **`patients.service.ts`**:

```typescript
export async function completePatientRegistration(
  id: string,
  data: RegisterPatientPayload,
): Promise<Patient> {
  return api.post<Patient>(`/api/frontdesk/patients/${id}/complete-registration`, data);
}
```

2. Export from `src/modules/clinical/index.ts` (function + reuse `RegisterPatientPayload`).

3. Unit test: POST path and camelCase payload shape in `patients.service.test.ts`.

### Phase 5 — Frontend wizard prefill + submit branch

**`PatientRegister.tsx`** changes:

1. Read query param:

```typescript
const [searchParams] = useSearchParams();
const completionPatientId = searchParams.get('id') ?? undefined;
const isCompletionMode = Boolean(completionPatientId);
```

2. On mount when `completionPatientId`:

```typescript
useEffect(() => {
  if (!completionPatientId) return;
  getPatient(completionPatientId)
    .then((p) => {
      reset({
        firstName: p.firstName,
        lastName: p.lastName,
        middleName: p.middleName ?? '',
        dateOfBirth: p.dateOfBirth ?? '',
        gender: p.gender ?? '',
        phone: p.phone ?? '',
        // Tier B left empty unless already on record:
        emergencyContactName: p.emergencyContactName ?? '',
        ...
      });
      // Banner when isProvisionalEmergency(p)
    })
    .catch(() => { toast.error(...); navigate('/patients'); });
}, [completionPatientId]);
```

3. Page title / submit button when `isCompletionMode`:

- Title: **Complete registration**
- Submit (step 3): call `completePatientRegistration(completionPatientId, payload)` instead of `registerPatient`
- Success: `invalidateQueries({ queryKey: queryKeys.patients.all })` + `invalidateQueries` for detail key + `navigate(`/patients/${completionPatientId}`)`
- Keep duplicate-warning UX; block definite duplicate client-side **and** surface `DUPLICATE_PATIENT` from API

4. **Do not** show ER-2 entry choice when `?id=` present — go straight to wizard step 1.

5. Map payload identically to existing `onSubmit` (memberNumber → insurerMemberNumber, filter empties).

**`PatientDetail.tsx`:** No route change needed if ER-2 merged (CTA already navigates with `?id=`). Optional: toast hint "Complete all three steps" on click.

### Phase 6 — Frontend tests

| Test file | Cases |
|-----------|--------|
| `PatientRegister.completion.test.tsx` | With `?id=`, loads patient into form; submit calls `completePatientRegistration` not `registerPatient`; success navigates to chart; definite duplicate blocked |
| `patients.service.test.ts` | Service POST URL |

Mock `@/modules/clinical`, wrap with `QueryClientProvider` + `MemoryRouter` + `?id=` route.

Badge removal: covered indirectly — after completion mock returns `isRegistered: true`, `registrationMode: 'full'`; list/detail tests can assert badge helper returns false (optional if ER-2 tests exist).

---

## Step-by-step task list (implement order)

1. Confirm ER-1 + ER-2 on branch (or implement ER-2 badge/type prerequisites first)
2. Add `FRONTDESK_ERROR` codes (if new)
3. Extract coverage/identifier helpers from `createPatient` (minimal refactor)
4. Implement `completePatientRegistration` in `patients.service.ts`
5. Add `completeRegistrationBodySchema` + route + controller handler
6. Backend unit tests (`frontdesk.service.test.ts`)
7. Integration test + `db-mock-impl` updates
8. Frontend `completePatientRegistration` + clinical barrel export + service test
9. `PatientRegister.tsx` — `?id=` load, prefill, submit branch, invalidation
10. Frontend component tests
11. Manual QA checklist
12. **Stop** — report changed files; wait for explicit user approval before commit/push/PR

---

## Testing strategy

| Layer | What |
|-------|------|
| Unit (backend) | Promotion transaction, guards, dedup reject, audit payload shape |
| Integration | HTTP 200/404/409 paths via inject + db mock |
| Unit (frontend) | Service URL; completion submit branch |
| Component | Prefill from `?id=`; no duplicate create on completion |
| Regression | ER-1 emergency create; full `POST /api/frontdesk/patients`; `PUT` patient ordinary edit unchanged |
| Manual | End-to-end provisional → complete → badges gone |

---

## Validation commands

From `projects/his-global-south/backend/`:

```powershell
npm run test -- src/modules/frontdesk/__tests__/frontdesk.service.test.ts src/db/schema/__tests__/pgschema.test.ts
npm run test:integration -- -t "complete-registration|emergency|patients list"
```

From `projects/his-global-south/`:

```powershell
npm run lint:frontend
npm test -- src/pages/patients/__tests__/PatientRegister.completion.test.tsx src/services/__tests__/patients.service.test.ts
npm run build
```

Optional full suites: `npm run test` (backend), `npm test` (frontend).

---

## Acceptance criteria

| # | Criterion | Validation |
|---|-----------|------------|
| AC-1 | `POST /api/frontdesk/patients/:id/complete-registration` returns `200` with promoted patient | Integration test |
| AC-2 | Successful completion sets `registration_mode=full`, `is_registered=true`, `dob_estimated=false` | Unit + integration |
| AC-3 | Tier B fields + coverage persisted in same transaction | Unit test mocks insert/update + coverage |
| AC-4 | Audit log records promotion (`registration_promotion`) without logging PHI to app logs | Unit test audit insert payload |
| AC-5 | Definite duplicate rejected with `DUPLICATE_PATIENT` | Unit + integration |
| AC-6 | Deceased patient rejected (`PATIENT_DECEASED`) | Unit test |
| AC-7 | Already-complete patient rejected (`REGISTRATION_ALREADY_COMPLETE`) | Unit test |
| AC-8 | Cross-organization completion returns `404 NOT_FOUND` | Integration test |
| AC-9 | Chart **Complete registration** opens wizard with Tier A prefilled via `?id=` | Component test + manual |
| AC-10 | Completion submit calls completion API, not create | Component test |
| AC-11 | EMERGENCY + INCOMPLETE badges gone after success | Manual + badge helper unit test |
| AC-12 | Full registration (`POST /api/frontdesk/patients`) unchanged | Regression integration test |
| AC-13 | `PUT /api/frontdesk/patients/:id` does not promote registration state | Code review + unit |
| AC-14 | No IPD admission API call | Code review forbidden paths |

---

## Manual QA (after ER-1 + ER-2 + ER-3)

1. Emergency-create a patient → list shows EMERGENCY + INCOMPLETE
2. Open chart → **Complete registration**
3. Wizard step 1 shows prefilled Unknown / estimated DOB; replace with real identity
4. Complete steps 2–3 (emergency contact + insurer)
5. Submit → land on chart with **Active Profile** only (no emergency/incomplete badges)
6. Attempt check-in → no `REGISTRATION_INCOMPLETE` block
7. Try completing again → API returns already-complete error
8. Full registration from `/patients/register` (no `?id=`) still creates new patient normally

---

## Out of scope

- IPD admission API/UI and deep-link handoff
- Automatic merge of duplicate patients
- SMS/email notifications
- Mass-casualty numbering
- New DB columns or migrations beyond ER-1
- List filter `registration_mode=emergency` (optional PRD item — defer)

---

## Status tracking

After implement: update [status.yaml](../../../prd/his-global-south/ipd/slices/status.yaml) → `ipd-emergency-registration-er-3-completion` = `implemented`.
