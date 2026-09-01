# PRI-2 — Identity profile config and GET API

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `patient-registration-identity-profile` |
| **Slice** | PRI-2 |
| **Branch** | `feat/ipd-emergency-registration` |
| **Goal** | Ship KE/default profiles and expose locked nationality + doc types to UI |
| **Depends on** | [PRI-1](./patient-registration-identity-profile-pri-1-api-db.md) |
| **Technical design** | [technical-design.md](../../../prd/his-global-south/patient-registration-identity-profile/technical-design.md) |
| **Status** | Approved — G3 slices approved 2026-08-20 |

---

## Approval

- [x] Product: KE document types match PRD config schema
- [x] Tech: AD-2, AD-3, AD-6; validation rejects types not in profile
- [x] Scope: no registration UI (PRI-3)

**Approved by:** User  
**Date:** 2026-08-20

---

## Scope

- Add config files:

```text
backend/src/config/identity-profiles/KE.json
backend/src/config/identity-profiles/default.json
backend/src/config/identity-profiles/index.ts
```

- KE profile document types: `national_id`, `passport`, `alien_id`, `birth_certificate` (per PRD)
- Loader: `loadIdentityProfile(jurisdictionCode)`, `resolveOrgIdentityProfile(organizationId)`
- **`GET /api/frontdesk/identity-profile`** — `withOrgAuth`, register before `:id` routes
- Server validation in create/update/complete:
  - Reject `identification_type` not in active profile
  - Require `identification_number` when type present (v1: always required on create/complete)
  - Force `nationality` from org (ignore client)
- Map legacy `national_id` body → `identification_type=national_id` + `identification_number` if new fields absent

## API contract

```text
GET /api/frontdesk/identity-profile
→ 200 { jurisdiction_code, nationality, nationality_label, nationality_editable: false, document_types[] }
```

## Files

```text
backend/src/config/identity-profiles/KE.json
backend/src/config/identity-profiles/default.json
backend/src/config/identity-profiles/index.ts
backend/src/modules/frontdesk/patients/identity-profile.service.ts  # optional thin module
backend/src/modules/frontdesk/patients/patients.routes.ts
backend/src/modules/frontdesk/patients/patients.controller.ts
backend/src/modules/frontdesk/patients/patients.service.ts
backend/src/modules/frontdesk/patients/patients.schema.ts
backend/src/__tests__/integration/api.integration.test.ts
```

## Acceptance criteria

- [ ] `KE.json` and `default.json` ship with PRD schema
- [ ] GET returns locked nationality for org jurisdiction
- [ ] Invalid identification_type rejected on create with 400
- [ ] Nationality always org jurisdiction regardless of client body
- [ ] HIE routes untouched

## Tests

- Unit: loader fallback default.json; validation helper
- Integration: GET identity-profile returns 200 with document_types

## Validation

```powershell
npm --prefix projects/his-global-south/backend run test:integration -- -t "identity-profile"
```
