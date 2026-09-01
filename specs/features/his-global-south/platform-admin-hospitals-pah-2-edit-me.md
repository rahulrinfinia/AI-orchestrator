# PAH-2 — Edit hospital and `/me` flags

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `platform-admin-hospitals` |
| **Slice** | PAH-2 |
| **Branch** | `feat/platform-admin-hospitals` (continue PAH-1) |
| **Goal** | Platform admin edits any hospital; every session sees org module flags on `/me` |
| **Depends on** | PAH-1 implemented in the clone |
| **PRD** | [prd.md](../../../prd/his-global-south/platform-admin-hospitals/prd.md) |
| **Technical design** | [technical-design.md](../../../prd/his-global-south/platform-admin-hospitals/technical-design.md) |
| **Slice** | [slice-2.md](../../../prd/his-global-south/platform-admin-hospitals/slices/slice-2.md) |
| **Status** | Planned — Approval empty |

---

## Approval

- [ ] Product: acceptance criteria match PRD US-5, US-6
- [ ] Tech: AD-4, AD-5, AD-8 respected; hospital `super_admin` cannot persist flags
- [ ] Scope: no sidebar/IPD gating by flags

**Approved by:** ___  
**Date:** YYYY-MM-DD

**Agent rule:** Do not implement until all boxes are checked and approver name is filled.

---

## Architecture constraints (immutable)

| ID | Constraint | This slice |
|----|------------|------------|
| AD-4 | Cross-tenant GET/PATCH only for `platform_admin` | Branch existing `getOrganization` / `patchOrganization` |
| AD-5 | CHECK at least one flag true | Validate on platform PATCH; DB still enforces |
| AD-8 | `/me` carries flags; no nav/API gating | Add columns to `getMe` select only |
| HIS | Types in `*.types.ts`; Fastify body/params; mapping not in service | Same as PAH-1 |

Hospital `super_admin` PATCH of own org **must ignore** `opd_enabled` / `ipd_enabled` if those keys appear in the body (TD §5).

---

## Previous slices context (verify in code before coding)

After PAH-1 you should already have:

- `ROLE.PLATFORM_ADMIN`, `assertPlatformAdmin`, flag columns, seed user
- `POST` / `GET` collection + list/create UI at `/platform/hospitals`
- `getOrganization` still `if (requestedId !== orgId) return 403`
- `patchOrganization` still own-org + `assertSuperAdmin`; body schema still name/npi/tax_id/address only
- `getMe` joins org but does **not** select flags
- No `/platform/hospitals/:id` page

If any of the above is missing, stop and finish PAH-1.

---

## Relevant files

### Modify

```text
backend/src/modules/platform/org/org.types.ts          # UpdateOrganizationBody + flags
backend/src/modules/platform/org/org.service.ts         # getOrganization, patchOrganization, getMe
backend/src/modules/platform/org/org.controller.ts      # pass roles or userId into get/patch
backend/src/modules/platform/org/org.mapping.ts         # PATCH field set
backend/src/modules/platform/platform.schema.ts         # extend updateOrganizationBodySchema
backend/src/modules/platform/org/__tests__/org.hospitals.test.ts
src/platform/constants/index.ts                         # HOSPITAL_DETAIL_PATH
src/platform/types/hospitals.ts
src/platform/api/hospitals.service.ts                   # getHospital, patchHospital
src/platform/hooks/useHospitals.ts
src/platform/pages/hospitals/routes.tsx
src/platform/pages/hospitals/list.tsx                   # row → detail
src/services/auth.service.ts                            # only if /me typing is local
```

### New

```text
src/platform/pages/hospitals/edit.tsx
```

### Do not change

```text
SQL is_platform_admin()
payer catalog / assertSuperAdmin on other modules
AppSidebar flag gating
IPD route guards
```

---

## Phases

### Phase A — Backend GET/PATCH branch

1. Extend `UpdateOrganizationBody` with every writable create field (phone, email, active, billing_mode, currency, timezone, locale, date_format, time_format, jurisdiction_code, opd_enabled, ipd_enabled). Types from constants — not `string` for enums.
2. `updateOrganizationBodySchema`:
   - Add those properties; enums from `*_VALUES`
   - `additionalProperties: false` stays
   - Params schema on `/:id`: `{ id: { type: 'string', format: 'uuid' } }` (HIS rule). Add to **both** GET and PATCH if not already present.
3. Change signatures so authorization can see roles. Preferred: pass `userId` + `callerOrgId` and call `assertPlatformAdmin` / `assertSuperAdmin` inside the service (PATCH already has `userId`).
   - **GET:** if `assertPlatformAdmin(userId)` → allow any `requestedId`; else keep `requestedId !== orgId` → 403
   - **PATCH:** if platform admin → allow any id, persist flags + all writable fields; else keep own-org + `assertSuperAdmin`, and **strip/ignore** flag keys
4. Platform PATCH validation: both flags false → 400/422 before update (do not rely only on DB CHECK).
5. PATCH `returning` must include the two flags (and any newly writable columns you persist). Use `getTableColumns(organizations)` if that stays consistent with create.
6. Persist phone/email/active/billing_mode/regional fields on **platform** PATCH. Hospital `super_admin` PATCH: keep today’s field set (name, npi, tax_id, address) unless those extra keys are already accepted — **do not expand hospital PATCH** in this slice. Extra keys on the shared schema are ignored for hospital admin because `additionalProperties: false` will **reject** them if sent.  
   **Locked:** one shared PATCH schema that includes flags + full writable set. Hospital Org setup today only sends name/npi/tax_id/address — still valid. If Org setup later sends flags, they are ignored in the service for non–platform-admin. Extra regional keys from a hospital client are allowed by schema but **must not be written** unless you already write them today (you do not). Implement: apply regional/flag columns **only** when `assertPlatformAdmin` is true; hospital path keeps the current `.set({ name, npi, tax_id, address })`.
7. Unique NPI 409 path unchanged.

### Phase B — `/me` flags

8. In `getMe`, add to the select from the already-joined `organizations`:
   - `opd_enabled: organizations.opd_enabled`
   - `ipd_enabled: organizations.ipd_enabled`
9. Do not add a nested `organization` rewrite unless the frontend already expects it. `useAuth` copies unknown org keys only from `data.organization`. Flags on the top-level `/me` object are enough for US-6. If you also want them on `organization` in the client, set them in `applyProfile` in a later polish — **not required**.
10. No sidebar or IPD API reads these flags in this slice.

### Phase C — Frontend edit

11. `getHospital(id)` / `patchHospital(id, body)` in `src/platform/api/hospitals.service.ts`.
12. Detail route `/platform/hospitals/:id` — edit form = same fields as create, prefilled. Submit PATCH. Invalid UUID → 404/error state.
13. List rows link to detail. After save, invalidate list + detail queries.
14. Client: same name + at-least-one-flag rules as create.

### Phase D — Tests

15. Platform admin GET/PATCH a **different** org id → 200.
16. Hospital `super_admin` GET/PATCH a different org id → 403.
17. Hospital `super_admin` PATCH own org with `{ opd_enabled: false, ipd_enabled: false }` (if schema allows) → 200 and **flags unchanged**.
18. Platform admin PATCH both flags false → 400/422.
19. `getMe` includes both booleans matching the user’s org.

---

## Testing strategy

| Layer | What |
|-------|------|
| Unit | Ignore flags for hospital PATCH; apply flags for platform PATCH |
| Integration | Cross-tenant 200 vs 403; `/me` flags |
| Regression | Org setup own-org PATCH (name/npi/tax/address) still works |
| UI smoke | Open created hospital → change name + IPD flag → list updates |

---

## Validation commands

```powershell
npm --prefix projects/his-global-south/backend run test -- src/modules/platform/org/__tests__/org.hospitals.test.ts
npm --prefix projects/his-global-south/backend run lint
npm --prefix projects/his-global-south/backend exec -- tsc --noEmit
```

---

## Acceptance criteria

| # | Criterion | How to verify |
|---|-----------|----------------|
| 1 | Platform admin GET any org | Test + UI |
| 2 | Platform admin PATCH any writable field + flags | Test + UI |
| 3 | Hospital admin cannot GET/PATCH another org | Test |
| 4 | Hospital admin cannot change flags | Test (values unchanged) |
| 5 | Both flags false rejected for platform PATCH | Test |
| 6 | `/me` has `opd_enabled` and `ipd_enabled` | Test |
| 7 | No IPD/sidebar gating added | Code review |

---

## Out of scope

- PAH-3 role lock / runbook
- Flag-based nav or IPD 403
- Expanding hospital Org setup to edit flags
