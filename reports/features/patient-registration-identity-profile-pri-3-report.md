# PRI-3 — Registration Step 1 identity UI

| Field | Value |
|-------|--------|
| **Plan** | `specs/features/his-global-south/patient-registration-identity-profile-pri-3-registration-ui.md` |
| **Clone** | `projects/his-global-south/` |
| **Branch** | `feat/ipd-emergency-registration` |
| **Status** | Implemented (local, uncommitted) |

## Files changed

- `src/services/patients.service.ts` — `getIdentityProfile`, types
- `src/modules/clinical/index.ts`
- `src/pages/patients/PatientRegister.tsx` — locked nationality, profile doc types, HIE unchanged
- `src/pages/patients/__tests__/PatientRegister.identity-profile.test.tsx`
- `src/services/__tests__/patients.service.test.ts`
- `src/pages/patients/__tests__/PatientRegister.emergency.test.tsx` (mock update)

## Validation

```text
✓ PatientRegister.identity-profile.test.tsx (3 tests)
✓ PatientRegister.emergency.test.tsx (5 tests) — emergency path unchanged
✓ patients.service.test.ts getIdentityProfile
```
