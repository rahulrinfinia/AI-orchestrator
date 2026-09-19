# PR #60 — File-wise inline review comments

**Branch HEAD:** `565b0a8`  
**Use:** Copy the **Comment** column into GitHub line comments on the matching file + line.

**Severity:** 🔴 BLOCKER · 🟠 CRITICAL · 🟡 WARNING · 🔵 SUGGESTION · ✅ PASS

---

## Summary verdict

**REQUEST CHANGES** — fix 🔴 B1, 🟠 C1, 🟠 C2 before merge.

---

## Backend

### `backend/src/modules/resource-access/resource-access.constants.ts`

| Line | Sev | Comment |
|------|-----|---------|
| *(new)* | 🟠 | Add `RESOURCE_ACCESS_API_BASE = '/api/resource-access'` and `RESOURCE_ACCESS_ADMIN_API_BASE = '/api/admin/resource-access'`. Route registration and frontend should import from here — same pattern as `SCREENING_API_BASE` in screening module. |

---

### `backend/src/modules/resource-access/resource-access.routes.ts`

| Line | Sev | Comment |
|------|-----|---------|
| 5–7 | 🟠 | Hardcoded prefixes `/api/resource-access` and `/api/admin/resource-access`. Use constants from `resource-access.constants.ts` instead of repeating the base path (hub route-registration rule). |
| 5 | 🔵 | Prefer `export const resourceAccessRoutes: FastifyPluginAsync = async (fastify) => { … }` to match arrow-function convention used elsewhere post PR #58. |

---

### `backend/src/modules/resource-access/resource-access.service.ts`

| Line | Sev | Comment |
|------|-----|---------|
| 37–44 | 🟠 | `findUser` only checks global `users` table. Admin endpoints must also verify the target user has at least one row in `user_roles` for the caller's `organizationId`. Otherwise any admin can read/write overrides for users outside their org. |
| 63–98 | 🟠 | After `fetchUserRolesForOrg` (L76): if `roles.length === 0`, throw `404 USER_NOT_FOUND` (or `403`) — user is not a member of this org. Do not return 200 with empty roles and still expose override UI state. |
| 76–88 | 🟡 | `role: roles[0] ?? 'user'` — synthetic `'user'` role when org membership is missing masks the org-scoping bug above. Prefer failing fast instead of defaulting. |
| 101–123 | 🟡 | `batchUpdateOverrides` runs upsert/delete in a loop without `db.transaction()`. Partial failure leaves inconsistent override rows. Wrap in a transaction. |
| 125–161 | 🟡 | `toggleResourceAccess` does not validate `resourceId` exists in `APP_CATALOGUE.tree`. Unknown ids still write to `user_resource_overrides`. Validate with `flattenResourceTree` / lookup and return `400 BAD_REQUEST` if missing. |
| 131–132 | 🟠 | Same org-membership check needed here before `assertEditable` — empty roles still pass today. |
| 47–61 | 🔵 | Team convention (PR #58): prefer `export const getMyResourceAccess = async (…) => { … }` arrow exports in service files. |
| 26–35 | ✅ | `assertEditable` correctly blocks overrides for god-mode roles. |

---

### `backend/src/modules/resource-access/admin/admin.schema.ts`

| Line | Sev | Comment |
|------|-----|---------|
| 5 | 🔵 | `userId` uses `minLength: 1` only. If Better Auth ids are UUIDs, use `format: 'uuid'` + `errorMessage: 'User ID must be a valid UUID'`. |
| 14–17 | 🟡 | Schema validates presence of `resource_id` but not catalogue membership. Consider documenting that service-layer validation is required (see service L125–161). |
| 10–28 | ✅ | Title Case AJV messages on body fields — good. |
| 61–100 | ✅ | Response schemas for 200 + error envelope — good. |

---

### `backend/src/modules/resource-access/admin/admin.routes.ts`

| Line | Sev | Comment |
|------|-----|---------|
| 22–34 | ✅ | GET admin route: `preHandler`, params schema, response 200/400/403/404 — good. |
| 36–49 | ✅ | PATCH toggle: body + response schemas wired — good. |
| 26–31, 41–46 | 🔵 | Add `500: resourceAccessErrorResponseSchema` for parity with `me.routes.ts` (unexpected errors from `sendResourceAccessError` rethrow). |

---

### `backend/src/modules/resource-access/admin/admin.controller.ts`

| Line | Sev | Comment |
|------|-----|---------|
| 6–17 | ✅ | Delegates to service; uses `orgAuthWithRoles` for org scope on caller — good. |
| 19–37 | ✅ | Toggle handler passes body fields correctly — good. |

---

### `backend/src/modules/resource-access/me/me.routes.ts`

| Line | Sev | Comment |
|------|-----|---------|
| 10–19 | ✅ | `withOrgAndRoles` + response 200/500 — good. |
| 13–16 | 🔵 | Consider adding `401` / `403` to response schema if auth middleware can return them on this path. |

---

### `backend/src/modules/resource-access/me/me.controller.ts`

| Line | Sev | Comment |
|------|-----|---------|
| 11–15 | ✅ | Uses session roles from `orgAuthWithRoles` — correct for `/me`. |
| 12–15 | 🔵 | Logs error on 500 — good; ensure no user email/PHI in log context (currently only `{ err }` — OK). |

---

### `backend/src/modules/resource-access/overrides/overrides.service.ts`

| Line | Sev | Comment |
|------|-----|---------|
| *(all)* | ✅ | Drizzle-only CRUD, org-scoped WHERE clauses, upsert on conflict — good. |
| 79–87 | 🟡 | `deleteOverridesForResourceIds` — safe no-op on empty array — good. |

---

### `backend/src/modules/resource-access/pgschema/user-resource-overrides.pgschema.ts`

| Line | Sev | Comment |
|------|-----|---------|
| *(all)* | ✅ | Unique `(user_id, organization_id, resource_id)` matches service semantics. |

---

### `backend/src/db/migrations/032_user_resource_overrides.sql`

| Line | Sev | Comment |
|------|-----|---------|
| 3–12 | ✅ | Table + CHECK on effect + index — good. |
| 14–40 | ✅ | `COMMENT ON` for table and every column — meets migration convention. |
| 17–18 | ✅ | Comment clarifies UI-only, not API auth — important for security reviewers. |

---

### `backend/src/shared/rbac/resolve-access.ts`

| Line | Sev | Comment |
|------|-----|---------|
| 15–35 | ✅ | Override path walk (deny/allow along ancestor chain) — logic looks correct. |
| 38–72 | ✅ | God-mode short-circuit + role domain + override merge — good. |
| 74–84 | ✅ | `computeAllowedResourceIdsMultiRole` — tested. |

---

### `backend/src/shared/rbac/catalogue-data.ts`

| Line | Sev | Comment |
|------|-----|---------|
| 1–4 | ✅ | Documents frontend mirror in `src/lib/rbac/catalogueData.ts` — good after `565b0a8` fix. |
| *(tree)* | 🟡 | Any new tile/block here must be duplicated in `src/lib/rbac/catalogueData.ts`. Consider a CI test that compares resource ids + paths across both files. |

---

### `backend/src/shared/rbac/catalogue.ts`

| Line | Sev | Comment |
|------|-----|---------|
| 97–107 | 🟡 | `getDescendantResourceIds` returns `[]` for unknown `resourceId` — callers must validate id first (service toggle does not today). |

---

### `backend/src/modules/resource-access/__tests__/resolve-access.test.ts`

| Line | Sev | Comment |
|------|-----|---------|
| *(all)* | ✅ | Unit coverage for god-mode, receptionist domain, deny/allow overrides — good. |
| *(new)* | 🟡 | Missing integration tests: admin 403 without role, org-scoped 404 for foreign userId, invalid resource_id 400, response schema serialization. |

---

### `backend/src/build-app.ts`

| Line | Sev | Comment |
|------|-----|---------|
| 28 | ✅ | Plugin imported and registered — good. |
| 187 | ✅ | `resourceAccessPlugin` registered after auth — good order. |
| 147–166 | 🟡 | Swagger `transform` has no branch for `/api/resource-access` or `/api/admin/resource-access` — routes fall through to tag `Other`. Add explicit tag e.g. `Resource Access`. |
| 204 | 🔵 | `/health` modules list includes `resource-access` — good for ops. |

---

## Frontend

### `src/lib/rbac/useResourceAccess.tsx`

| Line | Sev | Comment |
|------|-----|---------|
| 115–118 | 🔴 | **BLOCKER:** Conditional hook call — `useResourceAccessState()` only runs when context is null. Violates Rules of Hooks; fails `npm run lint`. Fix: remove fallback hook call; throw if used outside provider, or always use context from provider-only export. |
| 55 | 🟡 | Hardcoded `/api/resource-access/me`. Prefer constant shared with backend base (e.g. `RESOURCE_ACCESS_API_BASE` in a frontend constants file). |
| 86–94 | ✅ | `canAccessPath` strict mode used by route guard — good. |
| 90 | 🔵 | While `loading`, non-strict returns `true` (permissive). Document that sidebar uses non-strict during load — items may flash briefly. |
| 108–112 | ✅ | Provider wraps state once — correct pattern once B1 fixed. |
| 127–131 | ✅ | `CanAccess` component — clean API. |

---

### `src/lib/rbac/runtime.tsx`

| Line | Sev | Comment |
|------|-----|---------|
| 22–56 | ✅ | `PagePermissionLayout`: unguarded paths → unlisted paths → error → loading → deny redirect — solid flow. |
| 51–52 | ✅ | Uses `canAccessPath(pathname, { strict: true })` — matches security intent. |
| 58–60 | 🔵 | `ResourceAccessGate` duplicates provider if used alongside `App.tsx` provider — ensure only one wrapper in tree (currently App.tsx is canonical). |

---

### `src/lib/rbac/catalogueData.ts`

| Line | Sev | Comment |
|------|-----|---------|
| 1–4 | ✅ | Mirror comment pointing to backend file — good fix for review feedback. |
| *(RESOURCE_TREE)* | 🟡 | Must stay in sync with `backend/src/shared/rbac/catalogue-data.ts`. Diff today matches on ids/paths — add CI guard to prevent drift. |
| *(ROLE_DOMAIN_GRANTS)* | ✅ | Mirrors backend grants including clinical roles — good. |

---

### `src/lib/rbac/catalogueHelpers.ts`

| Line | Sev | Comment |
|------|-----|---------|
| *(all)* | ✅ | Frontend-only helpers extracted from shared logic — clean split after alias removal. |

---

### `src/lib/rbac/catalogue.ts`

| Line | Sev | Comment |
|------|-----|---------|
| 1–4 | ✅ | Single import barrel for UI code — good. |
| *(exports)* | ✅ | Re-exports data + helpers — matches post-review structure from `565b0a8`. |

---

### `src/components/admin/UserPermissionEditor.tsx`

| Line | Sev | Comment |
|------|-----|---------|
| 161 | 🟡 | Hardcoded admin API path. Use constant from `resource-access` frontend constants. |
| 172 | 🔵 | `console.error(err)` — prefer `useApiErrorToast` or structured logging without dumping full error in production. |
| 202–204 | 🟡 | Hardcoded PATCH path + inline URL template. Centralize in `src/lib/rbac/api.ts` (React Query pattern). |
| 198–211 | 🔵 | Optimistic revert on error — good UX. |
| 1–265 | 🟡 | File is ~265 lines — over 200-line component guideline. Split `PermissionTreeNode` to its own file. |
| *(overall)* | ✅ | Tree UI, god-mode disable, source badges — well done. |

---

### `src/components/layout/AppSidebar.tsx`

| Line | Sev | Comment |
|------|-----|---------|
| 37 | ✅ | Imports `useResourceAccess` — catalogue gating integrated. |
| 282–283 | ✅ | Destructures `canAccessPath`, `isResourceSuperAdmin`, `loading`. |
| 284–302 | 🟡 | Still uses `useRoleAccess()` for role-specific nav groups (ED, lab, radiology, etc.). Hybrid with catalogue can diverge — document which roles use static nav vs catalogue until IAM slice-5. |
| 430–438 | ✅ | `canSeeItem` applies catalogue path gate after role flags — reasonable layering. |
| 435–436 | 🔵 | During `resourceAccessLoading`, catalogue check is skipped — nav items may show until `/me` returns. Acceptable if intentional; consider strict hide. |

---

### `src/components/layout/Navigation.tsx`

| Line | Sev | Comment |
|------|-----|---------|
| *(dashboard quick actions)* | ✅ | Filters items with `canAccessResource(item.resourceId)` — good block-level gating. |

---

### `src/components/dashboard/StatsOverview.tsx`

| Line | Sev | Comment |
|------|-----|---------|
| *(stat cards)* | ✅ | Each stat gated by `DASHBOARD_STAT_BLOCKS.*` resource id — good. |

---

### `src/App.tsx`

| Line | Sev | Comment |
|------|-----|---------|
| *(ResourceAccessProvider)* | ✅ | Provider wraps routes inside `AuthProvider` — correct order. |

---

### `src/routes/appRoutes.tsx`

| Line | Sev | Comment |
|------|-----|---------|
| *(PagePermissionLayout)* | ✅ | Route guard wrapper added — good. |
| *(useRoleAccess import)* | 🟡 | Still uses static role access for landing redirect. Plan migration to catalogue-only or document interim dual system. |

---

### `src/pages/admin/index.tsx`

| Line | Sev | Comment |
|------|-----|---------|
| 309–319 | ✅ | `UserPermissionEditor` wired for super admin + selected user — good. |
| 315–318 | 🔵 | Editor only shown for `isSuperAdmin` — confirm product wants provider_admin blocked from UI overrides (backend allows provider_admin). |

---

### `src/pages/AccessDenied.tsx`

| Line | Sev | Comment |
|------|-----|---------|
| *(all)* | ✅ | Access denied page for route guard redirects — good UX. |

---

## Config / docs (review fix commit `565b0a8`)

### `vite.config.ts`

| Line | Sev | Comment |
|------|-----|---------|
| *(removed alias)* | ✅ | **Review fix:** Removed `@flowmd/catalogue-data` alias importing backend into frontend — correct FE/BE boundary. |

---

### `tsconfig.json` / `tsconfig.app.json`

| Line | Sev | Comment |
|------|-----|---------|
| *(removed alias)* | ✅ | **Review fix:** Alias removed — matches Vite change. |

---

### `docker-compose.dev.yml`

| Line | Sev | Comment |
|------|-----|---------|
| *(removed volume)* | ✅ | **Review fix:** No longer mounts `backend/src/shared/rbac` into frontend container — correct. |

---

### `docs/rbac-adding-permissions.md`

| Line | Sev | Comment |
|------|-----|---------|
| *(two-mirror table)* | ✅ | **Review fix:** Documents backend + frontend catalogue files and sync requirement — good. |

---

## Copy-paste: top 3 GitHub comments (highest priority)

### 1 — `src/lib/rbac/useResourceAccess.tsx` L115–118 🔴

```
BLOCKER: Conditional hook call — `useResourceAccessState()` runs only when context is null (react-hooks/rules-of-hooks). This fails lint and is unsafe.

Fix: remove the fallback. Either:
- `useResourceAccess()` only reads context and throws if null, or
- export a separate hook for tests that always mounts inside ResourceAccessProvider.

Do not call hooks after a conditional return.
```

### 2 — `backend/src/modules/resource-access/resource-access.service.ts` L76–77 🟠

```
CRITICAL (org scope): `fetchUserRolesForOrg` returns [] when the target user is not in the admin's org, but we still return 200 and allow override writes.

After fetching roles, if `roles.length === 0`, throw 404 USER_NOT_FOUND (user not in this organization). Same check needed in `toggleResourceAccess` before assertEditable.

Today an admin can PATCH overrides for any global user id.
```

### 3 — `backend/src/modules/resource-access/resource-access.routes.ts` L6–7 🟠

```
CRITICAL (convention): Hardcoded API prefixes. Add to resource-access.constants.ts:

  RESOURCE_ACCESS_API_BASE = '/api/resource-access'
  RESOURCE_ACCESS_ADMIN_API_BASE = '/api/admin/resource-access'

Register sub-plugins with those constants (see SCREENING_API_BASE pattern). Frontend should import the same paths from a mirror constant.
```
