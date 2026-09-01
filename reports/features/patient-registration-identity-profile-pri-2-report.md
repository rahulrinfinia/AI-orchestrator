# PRI-2 — Identity profile config and GET API

| Field | Value |
|-------|--------|
| **Plan** | `specs/features/his-global-south/patient-registration-identity-profile-pri-2-identity-profile-api.md` |
| **Clone** | `projects/his-global-south/` |
| **Branch** | `feat/ipd-emergency-registration` |
| **Status** | Implemented (local, uncommitted) |

## Files changed

- `backend/src/config/identity-profiles/KE.json`
- `backend/src/config/identity-profiles/default.json`
- `backend/src/config/identity-profiles/index.ts`
- `backend/src/config/nationality-labels.ts`
- `backend/src/modules/frontdesk/patients/identity-profile.service.ts`
- `backend/src/modules/frontdesk/patients/patients.routes.ts`
- `backend/src/modules/frontdesk/patients/patients.controller.ts`
- `backend/src/modules/frontdesk/patients/patients.service.ts` (validation)
- `backend/src/config/identity-profiles/__tests__/identity-profiles.test.ts`
- `backend/src/__tests__/integration/api.integration.test.ts`

## Validation

```text
✓ identity-profiles.test.ts (3 tests)
✓ GET /api/frontdesk/identity-profile added to integration suite (suite blocked by pre-existing IPD admissions import — see PRI-5)
```

## API

`GET /api/frontdesk/identity-profile` — locked nationality + profile document types.
