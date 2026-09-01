# ER-1 — Emergency registration API and database

| Field | Value |
|-------|-------|
| **Project** | `his-global-south` |
| **Feature** | `ipd-emergency-registration` |
| **Slice** | ER-1 |
| **Branch** | `feat/ipd-emergency-registration` (shared with ER-2, ER-3 — do not open a new branch per slice) |
| **Goal** | Persist provisional registration state and expose emergency create API |
| **Depends on** | `ipd-slice-0-scaffold` |
| **Technical design** | [technical-design.md](../../../prd/his-global-south/ipd-emergency-registration/technical-design.md) |
| **Status** | Implemented (uncommitted in clone) |

## Approval

| Role | Name | Date | Status |
|------|------|------|--------|
| Engineering | | | pending |

## Scope

- Add `patients.registration_mode` with `full | emergency`, default `full`.
- Add `patients.dob_estimated`, default `false`.
- Add the check constraint and organization-scoped lookup index.
- Update the Drizzle patient schema and migration.
- Make normal patient creation explicit: `registration_mode=full`, `is_registered=true`.
- Add `POST /api/frontdesk/patients/emergency` behind `withOrgAuth`.
- Add Tier A validation, patient ID generation, unknown-name suffixing, audit logging, and snake_case response fields.
- Extend patient list/detail projections with `registration_mode` and `dob_estimated`.

## API Contract

Request fields:

- `first_name` optional, defaults to `Unknown`.
- `last_name` optional, defaults to the next organization-scoped `Unknown-NNN` value.
- `date_of_birth` or estimated age, required because the database DOB is non-null.
- `dob_estimated`, true by default.
- `gender`, defaults to `unknown`.
- `phone`, optional.
- `registration_note`, optional and stored only in the audit changes payload.

The response is `201` and includes `id`, `patient_id`, `registration_mode`, `is_registered`, and `dob_estimated`.

Reject blank names, invalid dates/gender, missing DOB/age, and Tier B fields that would imply full registration. Scope all persistence to the authenticated organization.

## Files

```text
backend/src/db/migrations/<next>_patient_registration_mode.sql
backend/src/modules/patient/pgschema/patients.pgschema.ts
backend/src/modules/frontdesk/patients/patients.routes.ts
backend/src/modules/frontdesk/patients/patients.controller.ts
backend/src/modules/frontdesk/patients/patients.schema.ts
backend/src/modules/frontdesk/patients/patients.service.ts
backend/src/__tests__/integration/api.integration.test.ts
```

## Acceptance Criteria

- [x] Existing patient rows migrate to `full`, `is_registered` unchanged, and `dob_estimated=false`.
- [x] Emergency create returns `201` with a usable patient UUID.
- [x] Emergency rows have `registration_mode=emergency`, `is_registered=false`, `status=active`.
- [x] Multiple unknown patients receive collision-safe display names.
- [x] Emergency create writes an audit event without logging PHI.
- [x] Cross-organization access is denied by existing auth scoping.
- [x] Existing full registration behavior and API remain green.

## Tests

- Migration/schema verification.
- Emergency defaults and validation.
- Unknown suffix uniqueness.
- Audit event creation.
- Integration create and cross-organization cases.

## Out of Scope

UI, completion promotion, IPD admission handoff, patient merge, and changes to IPD or visit tables.
