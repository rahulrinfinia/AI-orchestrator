# Slices — patient-registration-identity-profile

| Field | Value |
|-------|-------|
| **Project** | `his-global-south` |
| **Feature** | `patient-registration-identity-profile` |
| **Branch** | `feat/ipd-emergency-registration` |
| **PRD** | [../prd.md](../prd.md) |
| **Technical design** | [../technical-design.md](../technical-design.md) |
| **G3 status** | **Approved** — 2026-08-20 |

## Dependency graph

```text
PRI-1 (migration + service persist)
  └── PRI-2 (identity profile config + GET API + validation)
        └── PRI-3 (registration Step 1 UI)
              └── PRI-4 (detail/list + complete-registration identity)
                    └── PRI-5 (tests)
```

## Slice index

| Slice | Spec | Goal |
|-------|------|------|
| PRI-1 | [specs/features/his-global-south/patient-registration-identity-profile-pri-1-api-db.md](../../../../specs/features/his-global-south/patient-registration-identity-profile-pri-1-api-db.md) | DB columns + patient service read/write + dedup sync |
| PRI-2 | [specs/features/his-global-south/patient-registration-identity-profile-pri-2-identity-profile-api.md](../../../../specs/features/his-global-south/patient-registration-identity-profile-pri-2-identity-profile-api.md) | KE/default JSON + `GET /identity-profile` + validation |
| PRI-3 | [specs/features/his-global-south/patient-registration-identity-profile-pri-3-registration-ui.md](../../../../specs/features/his-global-south/patient-registration-identity-profile-pri-3-registration-ui.md) | Locked nationality + profile doc type UI |
| PRI-4 | [specs/features/his-global-south/patient-registration-identity-profile-pri-4-display-completion.md](../../../../specs/features/his-global-south/patient-registration-identity-profile-pri-4-display-completion.md) | Detail/list + complete-registration identity |
| PRI-5 | [specs/features/his-global-south/patient-registration-identity-profile-pri-5-tests.md](../../../../specs/features/his-global-south/patient-registration-identity-profile-pri-5-tests.md) | Backend + frontend + regression tests |

## PRD acceptance coverage

| AC | Slices |
|----|--------|
| AC-1 Profile | PRI-2 |
| AC-2 Registration UI | PRI-3 |
| AC-3 Database | PRI-1, PRI-4 |
| AC-4 Regression | PRI-5 |
| AC-5 Tests | PRI-5 |

## Out of scope (all slices)

- HIE / DHA adapter changes
- IPD modules
- Emergency Tier A field changes
