# PRI-5 — Identity profile tests and regression

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `patient-registration-identity-profile` |
| **Slice** | PRI-5 |
| **Branch** | `feat/ipd-emergency-registration` |
| **Goal** | Automated coverage for identity profile feature + regressions |
| **Depends on** | PRI-1 through [PRI-4](./patient-registration-identity-profile-pri-4-display-completion.md) |
| **Technical design** | [technical-design.md](../../../prd/his-global-south/patient-registration-identity-profile/technical-design.md) |
| **Status** | Approved — G3 slices approved 2026-08-20 |

---

## Approval

- [x] Product: AC-5 from PRD covered
- [x] Tech: HIE and emergency regression included
- [x] Scope: tests only — no feature changes unless fixing failures

**Approved by:** User  
**Date:** 2026-08-20

---

## Scope

### Backend unit

- Nationality forced from org on create
- Invalid identification_type rejected (PRI-2 validation)
- Identifiers JSONB sync for national_id
- Dedup on identification_number

### Backend integration

- `GET /api/frontdesk/identity-profile` → 200 with KE types
- `POST /api/frontdesk/patients` persists identity columns
- `POST .../complete-registration` persists identity columns
- `GET /api/frontdesk/patients/hie-check` unchanged (stub still works)

### Frontend

- Disabled/read-only nationality in registration
- Profile-driven document type select
- HIE Search button still renders
- Identity fields on patient detail (smoke)

### Regression

- Emergency register flow (ER-2) unchanged
- Registration steps 2–3 submit unchanged
- Dedup by national ID still works

## Files

```text
backend/src/modules/frontdesk/__tests__/frontdesk.service.test.ts
backend/src/config/identity-profiles/__tests__/identity-profiles.test.ts
backend/src/__tests__/integration/api.integration.test.ts
src/pages/patients/__tests__/PatientRegister.identity-profile.test.tsx
src/services/__tests__/patients.service.test.ts
```

## Acceptance criteria

- [ ] All new tests pass in CI/local
- [ ] No regressions in existing frontdesk/emergency tests
- [ ] Integration db-mock updated for identity-profile route

## Validation

```powershell
npm --prefix projects/his-global-south/backend run test
npm --prefix projects/his-global-south/backend run test:integration
npm --prefix projects/his-global-south run test
npm --prefix projects/his-global-south run build
```
