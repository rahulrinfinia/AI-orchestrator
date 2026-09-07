# IAM-1 — Schema + system groups + member tracer

| Field | Value |
|-------|--------|
| **Feature** | `iam-resource-groups` |
| **Slice** | 1 |
| **Depends on** | — |
| **Technical design** | [../technical-design.md](../technical-design.md) §2, AD-1, AD-5, AD-8 |
| **Goal** | Database + iam module scaffold; system groups exist; users backfilled; thinnest API to list groups and add member |

---

## Purpose

Tracer bullet: create IAM tables, seed system resource groups per org, migrate existing `user_roles` to group memberships, scaffold `backend/src/modules/iam/` and minimal groups/members API — **no** frontend nav switch or route enforcement yet.

---

## User stories addressed

| Story | Coverage |
|-------|----------|
| US-1 System resource groups | Full — seed + backfill |
| US-2 Add/remove members | Partial — POST/DELETE member API only |
| US-6 Migrate user_roles | Full — backfill script in migration |

---

## Scope

### Backend — module scaffold

- `backend/src/modules/iam/index.ts` — fastify plugin
- `backend/src/modules/iam/iam.routes.ts` — aggregator
- `backend/src/modules/iam/iam.constants.ts` — `IAM_API_BASE = '/api/iam'`
- `backend/src/modules/iam/iam.types.ts`
- Register plugin in `build-app.ts`

### Backend — migration

- `032_iam_resource_groups.sql` — tables per TD §2.1
- Drizzle pgschema files under `iam/pgschema/`
- `groups/systemGroupTemplates.ts` — ported from `staticRoleAccess.ts` + role sets
- `groups/groups.service.ts` — `seedSystemResourceGroups(orgId)`, `listGroups(orgId)`
- `members/members.service.ts` — `addMember`, `removeMember`, `listMembers`

### Backend — routes (minimal)

| Method | Path | Handler |
|--------|------|---------|
| GET | `/api/iam/groups` | listGroupsHandler |
| GET | `/api/iam/groups/:id/members` | listMembersHandler |
| POST | `/api/iam/groups/:id/members` | addMemberHandler |
| DELETE | `/api/iam/groups/:id/members/:userId` | removeMemberHandler |

All mutations: `assertSuperAdmin`. Response schemas for 200/201/403/404.

### Backfill

- Migration or seed script: all existing orgs → `seedSystemResourceGroups`
- For each `user_roles` row → insert `resource_group_members` via `ROLE_TO_GROUP_SLUG` map

### Hotfix (can ship in same PR)

- Protect `GET/POST/PATCH /api/platform/module-permissions` with `assertSuperAdmin` in `org.service.ts`

### Frontend

- Stub only: export `IAM_UI_BASE` constant in `src/modules/iam/index.ts` (empty barrel OK)
- No UI changes in slice 1

### Tests

- Unit: `seedSystemResourceGroups` creates 11 system groups with permissions
- Integration: backfill user with `doctor` role → member of `opd_doctor` group
- Integration: add member → row in `resource_group_members`

---

## Out of scope

- `access.service` / `/me/access` (IAM-2)
- Admin UI (IAM-3)
- `requirePermission` middleware (IAM-4)
- Frontend nav (IAM-5)
- Custom groups create (IAM-6)

---

## Acceptance criteria

- [ ] Migration applies on empty + seeded DB
- [ ] 11 system groups per org with permissions/capabilities/ui_access from templates
- [ ] Existing `user_roles` backfilled to group memberships
- [ ] GET `/api/iam/groups` returns org groups for super_admin
- [ ] POST add member persists and invalidates auth cache
- [ ] `module-permissions` CRUD requires super_admin
- [ ] Backend build + tests pass

---

## Modules / files (reference)

| Area | Path |
|------|------|
| Module root | `backend/src/modules/iam/` |
| Migration | `backend/src/db/migrations/032_iam_resource_groups.sql` |
| Templates | `iam/groups/systemGroupTemplates.ts` |
| Plugin register | `backend/src/build-app.ts` |

---

## Approval

- [ ] Product — US-1, US-6; tracer proves group model
- [ ] Tech — AD-1, AD-5, AD-8; migration before code deploy
- [ ] **Approved by:** ___
- [ ] **Date:** YYYY-MM-DD

**Agent rule:** Do not implement until all boxes are checked.
