# Code Review — PR #60 (his-global-south)

| Field | Value |
|-------|--------|
| **PR** | [#60](https://github.com/apeiro-care/his-global-south/pull/60) |
| **Branch** | `feat/rbac-v2` → `develop-l2` (inferred from merge commit) |
| **HEAD (local)** | `565b0a8` — *Refactor RBAC catalogue integration and remove deprecated Vite alias* |
| **Scope** | UI resource-access RBAC: catalogue, `/me` + admin override APIs, route guards, admin permission editor |
| **Related hub docs** | [rbac-adding-permissions.md](../../projects/his-global-south/docs/rbac-adding-permissions.md), [IAM slice-5](../../prd/his-global-south/iam-resource-groups/slices/slice-5.md) (future; not this PR) |
| **Reviewer** | AI code-review (hub) |
| **Date** | 2026-09-09 |
| **Verdict** | **REQUEST CHANGES** |

---

## 1. GitHub review comments — source

**Live GitHub thread not fetched** (`gh` unauthenticated in this environment).

Reconciliation is based on:

- Local branch `pr-60-review` (fetched via `git fetch origin pull/60/head`)
- Commit `565b0a8` message and diff (post-review fix)
- Hub coding rules (`.cursor/rules/his-pr-review-lessons.mdc`, `docs/conventions/`)

To export unresolved threads before merge:

```bash
gh auth login
gh api repos/apeiro-care/his-global-south/pulls/60/comments --paginate
gh api repos/apeiro-care/his-global-south/issues/60/comments --paginate
```

---

## 2. PR scope

| Metric | vs `develop-l2` |
|--------|-----------------|
| Files changed | **41** (+2,110 / −9) |
| Commits | 3 (+ merge) |

### Deliverable

Per-user **UI resource access** overrides on top of a code-defined catalogue:

- Backend `resource-access` module: `GET /api/resource-access/me`, admin GET/toggle
- Shared resolver in `backend/src/shared/rbac/`
- Migration `032_user_resource_overrides.sql` with `COMMENT ON`
- Frontend: `ResourceAccessProvider`, `PagePermissionLayout`, sidebar/dashboard gating, `UserPermissionEditor`

### Explicitly out of scope (documented)

- API write authorization — UI hide only unless routes add `requirePermission` separately
- Full IAM resource-group model (`prd/his-global-south/iam-resource-groups/`)

---

## 3. Validation run (local, HEAD `565b0a8`)

| Check | Result |
|-------|--------|
| `backend npm test -- src/modules/resource-access` | **4/4 passed** |
| `backend npm run build` | **Pass** |
| `npx tsc -b` | **Pass** |
| `npm run lint` | **1 error**, 20 warnings (pre-existing warnings) |

**Lint blocker:**

```
src/lib/rbac/useResourceAccess.tsx:118:10
  error  React Hook "useResourceAccessState" is called conditionally  react-hooks/rules-of-hooks
```

---

## 4. Reviewer comment reconciliation (inferred)

| Theme | Status at `565b0a8` | Evidence |
|-------|---------------------|----------|
| Remove Vite alias `@flowmd/catalogue-data` importing backend into frontend | **Fixed** | `565b0a8` — removed alias from `vite.config.ts`, `tsconfig*.json`, docker-compose mount |
| Frontend should not depend on backend path at build time | **Fixed** | New `src/lib/rbac/catalogueData.ts` + `catalogueHelpers.ts` mirror |
| Document catalogue sync strategy | **Fixed** | `docs/rbac-adding-permissions.md` updated with two-mirror table |
| Consolidate imports through `@/lib/rbac/catalogue` | **Fixed** | `UserPermissionEditor`, `useResourceAccess` updated |
| Structured module (routes → controller → service) | **Fixed** (initial commit) | `1bbc078` — MCH/clinicalForms-style sub-plugins |
| Response schemas on routes | **Fixed** (initial commit) | Admin + me routes declare 200 + error envelopes |
| Title Case AJV messages on body/params | **Fixed** (initial commit) | e.g. `Resource ID is required`, `User ID is required` |

If GitHub threads asked for anything beyond catalogue alias / module structure, re-verify with `gh` export above.

---

## 5. Findings

### BLOCKER

#### B1 — Conditional React Hook in `useResourceAccess`

```115:118:src/lib/rbac/useResourceAccess.tsx
export function useResourceAccess(): ResourceAccessContextValue {
  const context = useContext(ResourceAccessContext);
  if (context) return context;
  return useResourceAccessState();
}
```

Calling `useResourceAccessState()` only when context is null violates Rules of Hooks and fails `npm run lint`. Even with `ResourceAccessProvider` at app root, this pattern is unsafe if any caller renders outside the provider.

**Fix:** Always call hooks unconditionally — e.g. always invoke `useResourceAccessState()` inside the provider and pass via context; export a thin `useResourceAccess()` that throws if context is null (or returns a documented test stub without conditional hook calls).

---

### CRITICAL

#### C1 — Admin endpoints do not verify target user belongs to caller's org

`getUserResourceAccess` / `toggleResourceAccess`:

- `findUser(userId)` checks global `users` table only
- `fetchUserRolesForOrg` returns `[]` when user has no roles in org — **does not 404**
- Overrides are still written with admin's `organizationId`

An org admin can read/write override rows for **any** user id that exists globally, including users who are not members of their hospital. When that user later joins the org, dormant overrides apply.

**Fix:** After role fetch, if `roles.length === 0`, return `404 USER_NOT_FOUND` (or `403` with a clear code). Match platform admin patterns that scope by `user_roles.organization_id`.

#### C2 — Hardcoded API base paths in route registration

```5:8:backend/src/modules/resource-access/resource-access.routes.ts
export async function resourceAccessRoutes(fastify: FastifyInstance): Promise<void> {
  await fastify.register(meRoutes, { prefix: '/api/resource-access' });
  await fastify.register(adminRoutes, { prefix: '/api/admin/resource-access' });
}
```

Hub convention (PR #50 / route registration lessons): define `RESOURCE_ACCESS_API_BASE` and `RESOURCE_ACCESS_ADMIN_API_BASE` in `resource-access.constants.ts`; build every path from those constants — same pattern as `SCREENING_API_BASE`.

---

### WARNING

#### W1 — Invalid `resource_id` accepted on toggle

`toggleResourceAccess` does not verify `resourceId` exists in `APP_CATALOGUE.tree`. Unknown ids still upsert a deny/allow row. `getDescendantResourceIds` silently no-ops for unknown ids.

**Fix:** Validate against flattened catalogue; `400` with `BAD_REQUEST` if unknown.

#### W2 — Override batch writes not transactional

`batchUpdateOverrides` loops sequential upserts/deletes without a DB transaction. Partial failure leaves inconsistent override state.

**Fix:** Wrap in `db.transaction()` (fast-follow acceptable if toggle is single-item only today, but document).

#### W3 — No integration tests for HTTP surface

Only unit tests for `computeAllowedResourceIdsMultiRole` / overrides math. Missing:

- Auth: 403 without admin role
- Org scoping (once C1 fixed)
- Response schema serialization (Fastify integration)

#### W4 — Dual catalogue mirror drift risk

Backend `catalogue-data.ts` and frontend `catalogueData.ts` must stay manually in sync. Data trees match today; no CI guard.

**Suggestion:** Add a small test that compares resource ids + paths from both files (or generate frontend from backend at build time in a follow-up).

#### W5 — Hybrid nav: static RBAC + resource access

`AppSidebar.tsx` still uses `useRoleAccess` / role-specific nav groups **and** `useResourceAccess().canAccessPath`. `appRoutes.tsx` still imports `useRoleAccess` for landing redirect. Product may intend gradual migration, but behaviour can diverge (static nav shows item, catalogue denies path, or vice versa).

Document in PR body which roles/nav paths are catalogue-driven vs static until IAM slice-5.

#### W6 — `UserPermissionEditor.tsx` size

~265 lines — exceeds 200-line feature component guideline. Consider splitting tree node vs data-fetch hook (non-blocking).

#### W7 — Swagger tag for resource-access routes

`build-app.ts` transform falls through to `Other` tag for `/api/resource-access/*`. Add explicit tag mapping for discoverability.

---

### SUGGESTION

- **S1:** `adminUserIdParamsSchema` — use `format: 'uuid'` (or whatever Better Auth user ids use) instead of `minLength: 1`, with message *User ID must be a valid UUID* if applicable.
- **S2:** Admin routes: add `500: resourceAccessErrorResponseSchema` to match me route pattern.
- **S3:** `export async function` in service — team preference from PR #58 is arrow exports; align in a chore if desired.
- **S4:** Reply on GitHub review threads for catalogue alias fix with commit `565b0a8` reference.

---

## 6. Security checklist

| Check | Status |
|-------|--------|
| Auth on all new routes | **Pass** — `withOrgAndRoles` + admin role gate |
| Org scope on reads/writes | **Fail** — C1 |
| Parameterized SQL | **Pass** — Drizzle only in overrides service |
| PHI in logs | **Pass** — no patient data |
| UI-only RBAC documented | **Pass** — README + migration COMMENT |
| Response schemas (success + errors) | **Pass** on new routes |
| Migration COMMENT ON | **Pass** |

---

## 7. What went well

- Clean module layout matching clinicalForms/MCH pattern (aggregator + sub-plugins + named handlers).
- Migration is well-documented; override table correctly org-scoped at DB level.
- Resolver logic is testable and covered for god-mode, role domains, allow/deny overrides.
- Post-review catalogue refactor (`565b0a8`) correctly removes fragile cross-layer Vite alias — aligns with modular monolith FE/BE boundary.
- AJV messages use Title Case labels on toggle body/params.
- Frontend route guard (`PagePermissionLayout`) + block-level gating on dashboard is a sensible first slice.

---

## 8. Verdict

| Gate | Status |
|------|--------|
| Inferred review fixes (catalogue alias, module structure, schemas) | **Fixed** |
| Lint / CI | **Fail** — B1 |
| Org-scoped admin security | **Fail** — C1 |
| Route registration conventions | **Fail** — C2 |
| Tests | **Partial** — unit only |

**REQUEST CHANGES** — fix B1 + C1 + C2 before merge; W1–W3 strongly recommended in same PR.

---

## 9. Recommended fixes (author)

1. **B1:** Refactor `useResourceAccess` to never conditionally call hooks.
2. **C1:** In `getUserResourceAccess` / `toggleResourceAccess`, require target user has ≥1 role in `organizationId`; else `404`.
3. **C2:** Add `RESOURCE_ACCESS_API_BASE` constants; use in `resource-access.routes.ts` and frontend API paths (optional FE constant in `src/lib/rbac/constants.ts`).
4. **W1:** Validate `resource_id` against catalogue before write.
5. Run `npm run lint` + `npx tsc -b` + `backend npm test` before re-requesting review.
6. Post threaded replies on GitHub for catalogue alias threads → `565b0a8`.

---

## 10. Test plan (QA after fixes)

- [ ] Receptionist: sidebar shows frontdesk only; direct URL to `/encounters` → `/access-denied`
- [ ] Super admin: all catalogue resources allowed; admin editor shows god-mode message
- [ ] Admin toggles deny on `visits` for receptionist → sidebar hides Patient Flow; re-allow restores
- [ ] Admin attempts toggle for user id **not in org** → 404 (after C1)
- [ ] Invalid `resource_id` in PATCH body → 400
- [ ] `npm run lint` zero errors
