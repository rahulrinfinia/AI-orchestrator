# PAH-3 — Role lock, 403 matrix, runbook

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `platform-admin-hospitals` |
| **Slice** | PAH-3 |
| **Branch** | `feat/platform-admin-hospitals` (continue PAH-2) |
| **Goal** | `platform_admin` cannot be granted from the product; 403 matrix is automated; ops can add/remove the role from a runbook |
| **Depends on** | PAH-2 implemented in the clone |
| **PRD** | [prd.md](../../../prd/his-global-south/platform-admin-hospitals/prd.md) |
| **Technical design** | [technical-design.md](../../../prd/his-global-south/platform-admin-hospitals/technical-design.md) |
| **Slice** | [slice-3.md](../../../prd/his-global-south/platform-admin-hospitals/slices/slice-3.md) |
| **Status** | Planned — Approval empty |

---

## Approval

- [ ] Product: US-1 assignability + US-2 runbook + US-8 regression accepted
- [ ] Tech: AD-1, AD-2, AD-6; no change to `is_platform_admin()` SQL
- [ ] Scope: no new screens or fields

**Approved by:** ___  
**Date:** YYYY-MM-DD

**Agent rule:** Do not implement until all boxes are checked and approver name is filled.

---

## Architecture constraints (immutable)

| ID | Constraint | This slice |
|----|------------|------------|
| AD-1 | New role; hospital `super_admin` unchanged | Regression tests only |
| AD-2 | Do not retarget SQL `is_platform_admin()` | Grep the clone; zero edits to that function |
| AD-6 | No API to grant the role | Reject on `updateUserRoles`; no new endpoint |
| AD-3 | Invite / personnel pickers must not include `platform_admin` | FE + BE enums |

---

## Previous slices context (verify in code)

After PAH-2:

- Create/list/edit + `/me` flags work for `platform@flowmd.ai`
- `INVITE_ROLES` / `PERSONNEL_ROLES` / Org setup `ROLE_OPTIONS` still have no `platform_admin` (PAH-1 forbade adding it). This slice **proves** that and **rejects** the value if a client sends it anyway
- `updateUserRoles` inserts `sql\`${role}::app_role\`` with no allow-list beyond Fastify schema — confirm `inviteUserBodySchema` / roles PUT schema uses `INVITE_ROLES` only

---

## Relevant files

### Modify

```text
backend/src/modules/platform/org/org.service.ts         # reject ROLE.PLATFORM_ADMIN in updateUserRoles
backend/src/modules/platform/platform.schema.ts         # confirm PUT roles enum = INVITE_ROLES (no platform_admin)
backend/src/modules/platform/org/__tests__/org.hospitals.test.ts
backend/src/middleware/__tests__/role-priority.test.ts  # if not already covering new role
src/pages/admin/constants.ts                            # ROLE_OPTIONS — assert no platform_admin
src/constants/personnelRoles.ts                         # must stay hospital-only
```

### New

```text
projects/his-global-south/docs/platform/PLATFORM-ADMIN-RUNBOOK.md
  # If docs/platform/ does not exist, create it. Hub copy is optional and out of scope.
```

### Grep / do not edit

```text
is_platform_admin
PLATFORM_ADMIN_ROLES          # must remain Set([super_admin])
payer catalog policies
```

---

## Phases

### Phase A — Cannot grant the role

1. Read `putUserRoles` schema. If roles items are open `string`, change enum to `[...INVITE_ROLES]` (`additionalProperties` N/A on arrays).
2. In `updateUserRoles`, before delete/insert: if `body.roles` includes `ROLE.PLATFORM_ADMIN` → 400 `{ error: 'platform_admin cannot be assigned' }` (or equivalent). Defense in depth even after schema reject.
3. Confirm `ROLE_OPTIONS` in `src/pages/admin/constants.ts` is `[...PERSONNEL_ROLES, ...CREDENTIALED_CLINICAL_ROLES]` and neither list contains `platform_admin`.
4. Do **not** add a Platform Admin option anywhere in Org setup.

### Phase B — Tests (403 / 400 matrix)

5. Cover in `org.hospitals.test.ts` (and FE unit if there is an existing roles-options test):

| Caller | Action | Expected |
|--------|--------|----------|
| `platform_admin` | POST /organizations | 201 |
| `platform_admin` | GET /organizations | 200 |
| `platform_admin` | GET/PATCH other org `:id` | 200 |
| `super_admin` (admin@flowmd.ai) | POST /organizations | 403 |
| `super_admin` | GET /organizations | 403 |
| `super_admin` | GET/PATCH **other** org | 403 |
| `super_admin` | PATCH **own** org (name) | 200 (existing) |
| `super_admin` | PUT user roles including `platform_admin` | 400 |
| doctor / unauthenticated | collection routes | 403 / 401 (match existing auth style) |

6. `role-priority.test.ts` — platform-only user primary role is `platform_admin`; dual-role user with `super_admin` still picks `super_admin` (PAH-1 priority lock).
7. Regression: payer catalog / Personnel not imported or rewritten. If a cheap existing test file runs in CI, leave it green — do not add payer tests unless one fails because of an accidental constant change.

### Phase C — Runbook

8. Add `projects/his-global-south/docs/platform/PLATFORM-ADMIN-RUNBOOK.md`:
   - Dev seed: `platform@flowmd.ai` / `FlowMD2026!` (same family as other demo users)
   - Order: migrate → `db:seed:auth-users` → drizzle/SQL role insert
   - Staging/prod: SQL to (1) ensure Better Auth user exists, (2) profile on a real org for FK, (3) `INSERT INTO user_roles (user_id, organization_id, role) VALUES (…, 'platform_admin')`
   - Remove: `DELETE FROM user_roles WHERE user_id = … AND role = 'platform_admin'`
   - Explicit: hospital Org setup cannot grant this; never add to `INVITE_ROLES`
   - Explicit: SQL function `is_platform_admin()` is **not** this role — do not alter it
9. One-line pointer from existing setup doc if `POST-SETUP.md` or backend README lists demo users (`admin@flowmd.ai`). Do not invent a new hub-level doc.

### Phase D — Close-out

10. Update `prd/his-global-south/platform-admin-hospitals/slices/status.yaml` to `in_review` / `merged` only when the user asks after the PR exists. During implement, set PAH-3 `in_progress` in that file if you touch status (optional).
11. No new UI.

---

## Testing strategy

| Layer | What |
|-------|------|
| Unit | `updateUserRoles` rejects `platform_admin`; schema enum |
| Integration | Full 403/201/400 matrix above |
| Regression | Own-org Org setup PATCH; `assertSuperAdmin` endpoints untouched |
| Docs | Runbook steps match the seed you actually shipped |

---

## Validation commands

```powershell
npm --prefix projects/his-global-south/backend run test -- src/modules/platform/org/__tests__/org.hospitals.test.ts src/middleware/__tests__/role-priority.test.ts
npm --prefix projects/his-global-south/backend run lint
npm --prefix projects/his-global-south/backend exec -- tsc --noEmit
```

---

## Acceptance criteria

| # | Criterion | How to verify |
|---|-----------|----------------|
| 1 | Org setup has no `platform_admin` option | Code + optional UI glance |
| 2 | Role API rejects granting it | Test 400 |
| 3 | No grant endpoint added | Code review |
| 4 | `super_admin` cannot create/list hospitals | Test 403 |
| 5 | `super_admin` own-org flows still work | Test / smoke |
| 6 | `is_platform_admin()` SQL unchanged | `git grep` / diff |
| 7 | Runbook exists and matches seed | File review |

---

## Out of scope

- Email invite (see `prd/.../suggestion-email-invite-onboarding.md`)
- Flag-based navigation
- Changing payer RLS
- Implementing PAH-1/2 behaviour that was skipped
