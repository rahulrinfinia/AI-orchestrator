# ER-2 — Emergency registration UI (implementation report)

| Field | Value |
|-------|-------|
| **Plan** | `specs/features/his-global-south/ipd-emergency-registration-er-2-ui.md` |
| **Clone** | `projects/his-global-south/` @ `feat/ipd-emergency-registration` |
| **Date** | 2026-08-20 |
| **Status** | Implemented (uncommitted) |

## Summary

Emergency registration UI on `/patients/register`: entry choice (full vs emergency), Tier A emergency form, `registerEmergencyPatient` service, EMERGENCY badges on list and chart.

## Files changed (clone)

**New**

- `src/pages/patients/emergency-registration.constants.ts`
- `src/pages/patients/components/RegistrationEntryChoice.tsx`
- `src/pages/patients/components/EmergencyRegistrationForm.tsx`
- `src/pages/patients/__tests__/PatientRegister.emergency.test.tsx`
- `src/pages/patients/__tests__/PatientList.emergency-badge.test.tsx`

**Modified**

- `src/services/patients.service.ts` — `registrationMode`, `dobEstimated`, `EmergencyRegisterPayload`, `registerEmergencyPatient`
- `src/modules/clinical/index.ts` — exports
- `src/pages/patients/PatientRegister.tsx` — view state machine
- `src/pages/patients/PatientList.tsx` — EMERGENCY badge
- `src/pages/patients/PatientDetail.tsx` — EMERGENCY badge + est. DOB hint
- `src/services/__tests__/patients.service.test.ts`

## Validation

```text
npm run lint:frontend          — pass (0 errors)
npm test -- …ER-2 test files…  — 35 passed
npm run build                  — (see below)
```

## Not done

- No commit/push/PR (per user rule)
- ER-3 completion API + wizard prefill not in scope

## Next step

Implement ER-3 or ask to commit ER-1 + ER-2 on `feat/ipd-emergency-registration`.
