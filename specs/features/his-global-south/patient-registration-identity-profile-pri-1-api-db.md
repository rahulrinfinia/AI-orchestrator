# PRI-1 — Patient identity columns and service persistence

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `patient-registration-identity-profile` |
| **Slice** | PRI-1 |
| **Branch** | `feat/ipd-emergency-registration` |
| **Goal** | Add DB columns and persist identity fields on patient create/update/complete/read |
| **Depends on** | — |
| **Technical design** | [technical-design.md](../../../prd/his-global-south/patient-registration-identity-profile/technical-design.md) |
| **Status** | Approved — G3 slices approved 2026-08-20 |

---

## Approval

- [x] Product: matches PRD AC-3 database write requirements
- [x] Tech: AD-1, AD-4, AD-5, AD-8 respected; HIE unchanged (AD-7)
- [x] Scope: no identity-profile JSON or UI in this slice

**Approved by:** User  
**Date:** 2026-08-20

---

## Scope

- Migration `003_patient_identity_profile.sql`
- Drizzle columns on `patients.pgschema.ts`
- Extend `createPatient`, `updatePatient`, `completePatientRegistration` to:
  - Resolve org nationality from `organizations.jurisdiction_code` (fallback address country → ISO)
  - Persist `nationality`, `identification_type`, `identification_number`
  - Sync `identifiers` JSONB when type is `national_id`
- Extend `dedupPatients` — definite match on `identification_number` + org (in addition to JSONB path)
- List/detail projections include new columns via existing `getTableColumns(patients)`
- Extend `createPatientBodySchema` / `completeRegistrationBodySchema` with optional identity fields (validation against profile deferred to PRI-2)

## Out of scope

- `identity-profiles/*.json` and `GET /identity-profile` (PRI-2)
- Registration UI changes (PRI-3)
- Profile-based rejection of invalid type codes (PRI-2)
- HIE changes

## Files

```text
backend/src/db/migrations/003_patient_identity_profile.sql
backend/src/modules/patient/pgschema/patients.pgschema.ts
backend/src/modules/frontdesk/patients/patients.service.ts
backend/src/modules/frontdesk/patients/patients.schema.ts
backend/src/db/schema/__tests__/pgschema.test.ts
backend/src/modules/frontdesk/__tests__/frontdesk.service.test.ts
```

## Acceptance criteria

- [ ] Migration adds three nullable text columns + index + COMMENT ON
- [ ] Full create persists identity columns and sets nationality from org
- [ ] Complete-registration persists identity columns
- [ ] Update persists identity fields when provided
- [ ] `identifiers` synced for `national_id` type
- [ ] Dedup matches on `identification_number`
- [ ] GET patient/list return new fields
- [ ] Emergency create unchanged (no identity columns required)

## Tests

- Unit: create with identity fields; nationality forced; identifiers sync; dedup by identification_number
- Schema: columns present on pgschema

## Validation

```powershell
npm --prefix projects/his-global-south/backend run test -- src/modules/frontdesk/__tests__/frontdesk.service.test.ts src/db/schema/__tests__/pgschema.test.ts
```
