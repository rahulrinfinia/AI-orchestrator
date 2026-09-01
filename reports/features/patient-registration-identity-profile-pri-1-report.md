# PRI-1 — Patient identity columns and service persistence

| Field | Value |
|-------|--------|
| **Plan** | `specs/features/his-global-south/patient-registration-identity-profile-pri-1-api-db.md` |
| **Clone** | `projects/his-global-south/` |
| **Branch** | `feat/ipd-emergency-registration` |
| **Status** | Implemented (local, uncommitted) |

## Files changed

- `backend/src/db/migrations/003_patient_identity_profile.sql`
- `backend/src/modules/patient/pgschema/patients.pgschema.ts`
- `backend/src/modules/frontdesk/patients/patients.service.ts`
- `backend/src/modules/frontdesk/patients/patients.schema.ts`
- `backend/src/modules/frontdesk/patients/identity-profile.service.ts` (org nationality helper)
- `backend/src/modules/frontdesk/frontdesk.constants.ts`
- `backend/src/db/schema/__tests__/pgschema.test.ts`
- `backend/src/modules/frontdesk/__tests__/frontdesk.service.test.ts`

## Validation

```text
✓ backend unit: frontdesk.service.test.ts, pgschema.test.ts (25 tests)
```

## Notes

- `createPatient`, `completePatientRegistration`, and `updatePatient` persist identity columns and sync `identifiers` for `national_id`.
- `dedupPatients` matches on `identification_number` column.
- Emergency create unchanged.
