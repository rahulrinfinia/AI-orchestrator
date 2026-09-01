# PRI-5 — Identity profile tests and regression

| Field | Value |
|-------|--------|
| **Plan** | `specs/features/his-global-south/patient-registration-identity-profile-pri-5-tests.md` |
| **Clone** | `projects/his-global-south/` |
| **Branch** | `feat/ipd-emergency-registration` |
| **Status** | Implemented (local, uncommitted) |

## Test coverage added/updated

| Layer | File | Focus |
|-------|------|-------|
| Backend unit | `frontdesk.service.test.ts` | dedup column, parseIdentityInput |
| Backend unit | `identity-profiles.test.ts` | KE profile, fallback |
| Backend unit | `pgschema.test.ts` | identity columns |
| Backend integration | `api.integration.test.ts` | identity-profile + register payload |
| Frontend | `PatientRegister.identity-profile.test.tsx` | locked nationality, profile types, HIE button |
| Frontend | `patients.service.test.ts` | getIdentityProfile |
| Regression | emergency/completion tests | mocks updated; paths unchanged |

## Validation run

```text
✓ npm --prefix backend run test (targeted PRI files): 25 passed
✓ npm run test (frontend PRI files): 38 passed
⚠ npm --prefix backend run test:integration — blocked by pre-existing missing
  `./admissions/admissions.routes.js` in IPD module (unrelated to PRI work)
```

## Follow-up

Apply migration `003_patient_identity_profile.sql` on dev DB before manual E2E registration test.
