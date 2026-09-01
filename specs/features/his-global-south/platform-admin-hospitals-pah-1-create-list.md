# PAH-1 — Create and list hospitals

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `platform-admin-hospitals` |
| **Slice** | PAH-1 |
| **Branch** | `feat/platform-admin-hospitals` from `develop` (do **not** implement on `feat/ipd-admissions-atd`) |
| **Goal** | Platform operator can sign in, open Hospitals, create a hospital, and see it in the list |
| **Depends on** | — |
| **PRD** | [prd.md](../../../prd/his-global-south/platform-admin-hospitals/prd.md) |
| **Technical design** | [technical-design.md](../../../prd/his-global-south/platform-admin-hospitals/technical-design.md) |
| **Slice** | [slice-1.md](../../../prd/his-global-south/platform-admin-hospitals/slices/slice-1.md) |
| **Status** | Planned — Approval empty |

---

## Approval

- [x] Product: acceptance criteria match PRD US-2, US-3, US-4, US-7
- [x] Tech: AD-1 … AD-7 respected; no `/me` flags, no edit, no IPD gating
- [x] Scope: no creep beyond this slice file

**Approved by:** User (implement Add Hospital from DB field contract)  
**Date:** 2026-08-23

**Agent rule:** Do not implement until all boxes are checked and approver name is filled.

---

## Architecture constraints (immutable)

| ID | Constraint | This slice |
|----|------------|------------|
| AD-1 | New `app_role` value `platform_admin`; do not reuse `super_admin` | Migration + Drizzle enum |
| AD-2 | App-layer `assertPlatformAdmin()`; leave SQL `is_platform_admin()` alone | Service check only. If RLS blocks `organizations` for the API role, add a **narrow** SELECT/INSERT policy for `platform_admin` on that table only — verify, do not assume |
| AD-3 | Extend `backend/src/modules/platform/org/` | No new backend module |
| AD-4 | Cross-tenant only on new collection routes | POST/GET `/organizations` = platform admin; `GET/PATCH :id` unchanged |
| AD-5 | `opd_enabled` default true, `ipd_enabled` default false; CHECK at least one true | Migration + pgschema |
| AD-6 | Seed-only account `platform@flowmd.ai` / `FlowMD2026!` | `create-admin.ts` + role seed |
| AD-7 | Portable `src/platform/` Hospitals UI | List + create only |
| AD-8 | `/me` flags | **Not this slice** |
| HIS | Constants / types / Fastify schemas / `sql.raw` CHECKs | `.cursor/rules/his-implement-before-code.mdc` |

**Do not:** add `platform_admin` to `INVITE_ROLES`, `PERSONNEL_ROLES`, or `PLATFORM_ADMIN_ROLES`. That last set is hospital `super_admin` settings — adding the new role would grant Org setup powers.

---

## Previous slices / current code

Nothing from this feature exists. Relevant facts in `projects/his-global-south/`:

- `GET/PATCH /api/platform/organizations/:id` in `org.routes.ts` — own-org only; PATCH also `assertSuperAdmin`
- **No** collection `GET/POST /api/platform/organizations`
- `organizations.pgschema.ts` has **no** flag columns
- `app_role` in `backend/src/db/schema/enums.ts` has no `platform_admin`
- `assertSuperAdmin` in `org.service.ts` is any-org `user_roles.role = super_admin`
- `create-admin.ts` signs up demo users via Better Auth; it does **not** insert `user_roles`
- `getMe` already `json_agg` all roles for the user and joins `organizations`
- `usePermissions` treats only `role === "super_admin"` as hospital bypass
- `AppSidebar` `canSeeItem` only checks `requiresSuperAdmin` / `requiresOrgAdmin`
- Clinical / Front Desk / IPD nav items have **no** role gate — a platform-only user would see them unless this slice hides those groups
- IPD portable layout to copy: `src/ipd/` (`constants/`, `api/`, `hooks/`, `types/`, `pages/`, `routes.tsx`)
- Older IPD plan `ipd-slice-1-org-flags.md` proposed the same columns **plus gating**. **This slice owns the columns.** Do not add IPD 403 or sidebar hide-by-flag.

---

## Relevant files

### Modify

```text
backend/src/db/schema/enums.ts
backend/src/modules/platform/pgschema/organizations.pgschema.ts
backend/src/modules/platform/platform.constants.ts
backend/src/modules/platform/platform.schema.ts
backend/src/modules/platform/org/org.types.ts
backend/src/modules/platform/org/org.service.ts
backend/src/modules/platform/org/org.controller.ts
backend/src/modules/platform/org/org.routes.ts
backend/src/middleware/role-priority.ts
backend/src/db/seeds/create-admin.ts
backend/src/db/schema/__tests__/pgschema.test.ts
src/routes/appRoutes.tsx
src/components/layout/AppSidebar.tsx
src/modules/platform/index.ts          # re-export hospitals barrel only if needed
```

### New

```text
backend/src/db/migrations/004_platform_admin_and_org_flags.sql
  # Confirm next number by listing backend/src/db/migrations/ first
backend/src/modules/platform/org/org.mapping.ts
backend/src/modules/platform/org/__tests__/org.hospitals.test.ts
backend/src/db/seeds-drizzle/platform-admin.ts   # or equivalent SQL/fixture — see Seed
src/platform/constants/index.ts
src/platform/constants/hospitals.ts
src/platform/types/hospitals.ts
src/platform/api/hospitals.service.ts
src/platform/hooks/useHospitals.ts
src/platform/pages/hospitals/list.tsx
src/platform/pages/hospitals/new.tsx
src/platform/pages/hospitals/routes.tsx
src/platform/routes.tsx
src/platform/index.ts
```

### Reference only (do not rewrite)

```text
backend/src/modules/platform/org/org.service.ts          # getOrganization / patchOrganization
src/pages/admin/                                        # Org setup field layout to reuse visually
src/ipd/                                                # portable module layout
src/integrations/api/client.ts                          # camelCase FE ↔ snake_case wire
docs/conventions/his-global-south-patterns.md
```

---

## Phases

### Phase A — Foundation (migration + constants + pgschema)

1. List `backend/src/db/migrations/` and take the next number. Planned name: `004_platform_admin_and_org_flags.sql`.
2. SQL (order matters — enum before role seed; columns before CHECK):
   - `ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'platform_admin';`  
     If the migrator wraps everything in one transaction and the project Postgres is older than 12, split the enum change to its own migration (older Postgres cannot `ADD VALUE` inside a transaction).
   - `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS opd_enabled boolean NOT NULL DEFAULT true;`
   - `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS ipd_enabled boolean NOT NULL DEFAULT false;`
   - `ALTER TABLE organizations ADD CONSTRAINT organizations_module_flags_check CHECK (opd_enabled OR ipd_enabled);`
   - `COMMENT ON COLUMN` for both flags.
   - Optional: `UPDATE organizations SET ipd_enabled = true WHERE id = '<demo Flow Health uuid>';` — resolve the demo org id from existing seed (`00000000-0000-0000-0000-000000000001` in the PRD if that is still the live id).
3. `enums.ts` — add `'platform_admin'` to the `app_role` pgEnum array.
4. `platform.constants.ts`:
   - `ROLE.PLATFORM_ADMIN = 'platform_admin'`
   - **Do not** add it to `USER_ROLES`, `INVITE_ROLES`, `PERSONNEL_ROLES`, `PLATFORM_ADMIN_ROLES`
   - Add `BILLING_MODE` + `BILLING_MODE_VALUES` (`dpc`, `fee_for_service`, `hybrid`) — today the CHECK is hardcoded in pgschema
   - Add `ORG_MODULE_FLAG` defaults if useful (`OPD_ENABLED_DEFAULT`, `IPD_ENABLED_DEFAULT`)
5. `organizations.pgschema.ts` — two boolean columns with those defaults; CHECK via `sql.raw` / boolean OR from constants — **never** interpolate a bound param into a CHECK (HIS rule). Existing `billing_mode` CHECK should be switched to `BILLING_MODE_VALUES` in the same file if you touch it; do not change the constraint name.
6. `pgschema.test.ts` — assert `organizations.opd_enabled` and `organizations.ipd_enabled` exist.

### Phase B — Seed

7. `create-admin.ts` — add `{ email: 'platform@flowmd.ai', name: 'Platform Admin', password: 'FlowMD2026!' }`.
8. Role row is **not** created by Better Auth signup. Inspect `seeds-drizzle/fixtures.ts`, `demo-org-bulk.ts`, and `scripts/apply-demo-seed.mjs` for how `admin@flowmd.ai` gets `super_admin`. Mirror that:
   - Look up user by email
   - Ensure `profiles.organization_id` = demo org (FK only)
   - `INSERT … user_roles (user_id, organization_id, role)` with `platform_admin`
   - Idempotent (`ON CONFLICT DO NOTHING` on the unique `(user_id, role, organization_id)`)
9. Document run order in the seed file comment: `db:seed:auth-users` then drizzle seed (or whatever the existing admin path is). If the user is missing, log a skip — do not fail the whole seed.

`fetchUserRolesForOrg` is **org-scoped**. The role row **must** sit on the same org the session uses (demo org), or `GET /api/platform/permissions` will not see `platform_admin`.

### Phase C — Backend API

10. `org.types.ts` — `CreateOrganizationBody` with every writable field from the PRD field contract (typed; **no** `Record<string, unknown>`). Booleans and `billing_mode` as unions from constants.
11. `org.mapping.ts` — normalize address (`street` / `street_line`, `county` / `state`, `postal_code` / `zip`) the same way `patchOrganization` does today. Do not re-export mapping from the service.
12. `platform.schema.ts` — `createOrganizationBodySchema` and `listOrganizationsQuerySchema` (optional `limit`/`offset` from existing list constants). Body: `additionalProperties: false`; `name` required `minLength: 1`; enums from `BILLING_MODE_VALUES`, `ALLOWED_CURRENCIES`, `TIME_FORMATS`; `opd_enabled` / `ipd_enabled` booleans. Params not needed on collection routes.
13. `assertPlatformAdmin(userId)` next to `assertSuperAdmin` — same query pattern, `ROLE.PLATFORM_ADMIN`. Return boolean; handlers map false → 403 `{ error: 'platform_admin only' }`.
14. `createOrganization(userId, body)`:
    - Assert platform admin
    - Reject if both flags explicitly false (400/422)
    - Insert with DB defaults when keys omitted
    - 409 on unique NPI (`23505`) — same message as existing PATCH
    - Return full row via `getTableColumns(organizations)`
15. `listOrganizations(userId)`:
    - Assert platform admin
    - Select list columns from TD: name, npi, active, billing_mode, currency, jurisdiction_code, flags, created_at (+ `id`)
    - Order by `name` or `created_at` desc — pick one and keep it
16. Controller handlers + `sendResult`.
17. Routes — register **collection** paths (no conflict with `/:id`):

```text
POST /api/platform/organizations   schema.body = createOrganizationBodySchema
GET  /api/platform/organizations   optional querystring schema
```

Same `withOrgAuth` as other org routes. Auth is still session + org context; **authorization** is `assertPlatformAdmin`.

18. `role-priority.ts` — `ROLE.PLATFORM_ADMIN` at priority **below** `super_admin` (e.g. `0.5` is not valid — use `0` for super_admin and insert platform_admin as `0` only if dual-role should badge as platform… **Use priority `-1` or keep `super_admin` at 0 and `platform_admin` at 0.5** — integers only: give `platform_admin` **1** and shift others down **or** give it `-1` so a dual-role user still badges as `super_admin` if they have both. **Locked for this plan:** `super_admin` stays highest (0). `platform_admin` = 1; shift current 1+ by +1. A dual-role user (not default) still looks like hospital super admin in `usePermissions`. A platform-only user gets `role === 'platform_admin'` → `isSuperAdmin === false`.

### Phase D — Frontend

19. `src/platform/constants/index.ts` — UI + API paths only:

```text
PLATFORM_UI_BASE = '/platform'
PLATFORM_HOSPITALS_PATH = '/platform/hospitals'
PLATFORM_HOSPITALS_NEW_PATH = '/platform/hospitals/new'
PLATFORM_ORGANIZATIONS_API = '/api/platform/organizations'
```

20. `src/platform/constants/hospitals.ts` — mirror `BILLING_MODE_*`, currency/locale/timezone/date/time options already on Org setup (`src/pages/admin/constants.ts`). Import or duplicate the **values** (not page-local constants). Flag labels: OPD enabled / IPD enabled. Default form: `opdEnabled: true`, `ipdEnabled: false`.
21. `src/platform/types/hospitals.ts` — camelCase DTOs (`HospitalListItem`, `CreateHospitalBody`, `HospitalFormState`). Unions from constants.
22. `api/hospitals.service.ts` — `listHospitals`, `createHospital`. Pass snake_case keys; `api` client converts. Types stay camelCase on the TS side per existing client convention — follow how `admin.service` maps org fields.
23. Hooks: list query + create mutation; invalidate list on success. Query keys read hospital constants (do not hardcode `'hospitals'` in the page).
24. Pages: thin. List table columns = PRD US-4. Create form = PRD writable field contract + two checkboxes. Client-side: name required; at least one flag checked. Reuse Org setup field grouping/visuals; **do not** put this form inside `/org-setup`.
25. `appRoutes.tsx` — lazy `PlatformRoutes` at `/platform/*` (same pattern as IPD).
26. Sidebar:
    - Extend `SidebarItem` with `requiresPlatformAdmin?: boolean`
    - Add **Hospitals** under the existing Platform group → `/platform/hospitals`
    - `canSeeItem`: show Hospitals only if `profile.roles` includes `platform_admin` (useAuth already exposes `profile.roles` from `/me`)
    - If the user has `platform_admin` and is **not** `isSuperAdmin` / `isOrgAdmin`, hide Front Desk, Clinical, Revenue Cycle, IPD, Organization, and Dev groups; on Platform show **only** Hospitals (hide Payer catalog / Terminology)

### Phase E — Tests (minimum for this slice)

27. Unit: `assertPlatformAdmin` true/false; create rejects both flags false; create schema enums from constants.
28. Service/integration if the repo has a Fastify test helper: platform admin POST 201 + GET list includes row; `super_admin` POST/GET list 403.
29. pgschema column test (Phase A).

Full 403 matrix and Org setup exclusion = PAH-3.

---

## Testing strategy

| Layer | What |
|-------|------|
| Unit | Flag validation; assert helpers; schema enum source |
| Schema | New columns on `organizations` |
| Integration | 201 create + 200 list for platform admin; 403 for `admin@flowmd.ai` |
| Regression | Existing `GET/PATCH /organizations/:id` own-org behaviour **unchanged** (no test rewrite required if you do not touch those functions) |
| UI smoke (manual) | Login `platform@flowmd.ai` → Hospitals → create → appears |

---

## Validation commands

```powershell
npm --prefix projects/his-global-south/backend run test -- src/modules/platform/org/__tests__/org.hospitals.test.ts src/db/schema/__tests__/pgschema.test.ts src/middleware/__tests__/role-priority.test.ts
npm --prefix projects/his-global-south/backend run lint
npm --prefix projects/his-global-south/backend exec -- tsc --noEmit
```

Frontend: project’s existing lint/test scripts for touched files only.

---

## Acceptance criteria

| # | Criterion | How to verify |
|---|-----------|----------------|
| 1 | `platform_admin` on `app_role` | Migration + `enums.ts` |
| 2 | Flag columns + CHECK + defaults | Migration + pgschema test |
| 3 | Existing orgs: OPD on, IPD off | Defaults; optional demo IPD on |
| 4 | Seed user can sign in with `platform_admin` on demo org | Seed + login |
| 5 | POST create persists all writable fields + flags | Unit + UI smoke |
| 6 | GET list returns all orgs for platform admin | Unit + UI smoke |
| 7 | Hospital `super_admin` create/list = 403 | Test |
| 8 | Hospitals nav only for `platform_admin` | Sidebar logic |
| 9 | Platform-only user does not see hospital clinical/admin nav | Sidebar filter |
| 10 | `GET/PATCH :id` still own-org | Code review — functions not branched yet |

---

## Out of scope

- Edit page and cross-tenant GET/PATCH
- `/me` flags
- Rejecting `platform_admin` on `PUT …/roles` (PAH-3)
- Runbook file (PAH-3)
- Email invite, auto hospital admin, IPD gating
