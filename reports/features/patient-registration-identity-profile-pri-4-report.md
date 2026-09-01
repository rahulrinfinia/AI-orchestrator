# PRI-4 — Patient display and complete-registration identity

| Field | Value |
|-------|--------|
| **Plan** | `specs/features/his-global-south/patient-registration-identity-profile-pri-4-display-completion.md` |
| **Clone** | `projects/his-global-south/` |
| **Branch** | `feat/ipd-emergency-registration` |
| **Status** | Implemented (local, uncommitted) |

## Files changed

- `src/pages/patients/PatientDetail.tsx` — nationality, document type, document number in demographics
- `src/pages/patients/PatientList.tsx` — doc type/number subtitle on name row
- `src/pages/patients/PatientRegister.tsx` — completion prefill for identity fields
- `src/pages/patients/identity-display.utils.ts`
- `src/pages/patients/__tests__/PatientRegister.completion.test.tsx` (mock update)

## Validation

```text
✓ PatientRegister.completion.test.tsx (2 tests)
```

## Manual check

Complete emergency patient via `?id=` wizard → identity fields submitted on `completePatientRegistration`.
