# ER-1 — Emergency registration API and database

| Field | Value |
|-------|-------|
| **Project** | `his-global-south` |
| **Feature** | `ipd-emergency-registration` |
| **Slice** | ER-1 |
| **Branch** | `feat/ipd-emergency-registration` |
| **Date** | 2026-08-20 |
| **Status** | Implemented (uncommitted in clone) |

## Summary

Backend support for provisional emergency patient registration: schema columns, migration, `POST /api/frontdesk/patients/emergency`, and tests.

## Changes (clone: `projects/his-global-south/`)

- **Migration:** `backend/src/db/migrations/002_patient_registration_mode.sql` — adds `registration_mode`, `dob_estimated`, check constraint, index.
- **Schema:** `patients.pgschema.ts` — Drizzle columns and constraints.
- **API:** emergency route, controller handler, JSON schema, service (`createEmergencyPatient`, `resolveEmergencyDateOfBirth`, `nextUnknownLastName`).
- **Full registration:** `createPatient` sets `registration_mode=full`, `dob_estimated=false`, `is_registered=true`.
- **List/detail:** `getTableColumns(patients)` already projects new fields.
- **Tests:** unit (frontdesk service), schema (pgschema), integration (emergency create via inject + db mock).

## Validation

```text
npm run test -- src/modules/frontdesk/__tests__/frontdesk.service.test.ts src/db/schema/__tests__/pgschema.test.ts
npm run test:integration -- -t emergency
```

All passed on 2026-08-20.

## Not done (by design)

- No commit, push, or PR (per user rule).
- ER-2 UI not started.
- ER-3 completion API not started.

## Next step

User approval to commit on `feat/ipd-emergency-registration`, then ER-2 UI after plan Approval section is filled.
