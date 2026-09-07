# IAM-2 — Effective access resolver + API

| Field | Value |
|-------|--------|
| **Feature** | `iam-resource-groups` |
| **Slice** | 2 |
| **Depends on** | IAM-1 |
| **Technical design** | [../technical-design.md](../technical-design.md) §5, §4, AD-2, AD-10 |
| **Goal** | Single resolver merges group memberships; expose via API; legacy permissions shim |

---

## Purpose

Implement `access.service.resolveEffectiveAccess()` — union of group permissions, capabilities, ui_access. Expose `GET /api/iam/me/access`. Shim `GET /api/platform/permissions` to use resolver. Extend auth cache.

---

## User stories addressed

| Story | Coverage |
|-------|----------|
| US-2 Add/remove members | Full — cache invalidation on member change |
| US-4 Effective access on login | Full — API returns merged policy |
| US-5 Backend enforcement | Partial — attachEffectiveAccess preHandler stub for IAM-4 |

---

## Scope

### Backend

- `access/access.service.ts` — merge algorithm per TD §5
- `access/access.controller.ts` — getMeAccessHandler
- `access/access.schema.ts` — response schema (permissions[], capabilities[], ui_access, groups[])
- `GET /api/iam/me/access` — `withOrgAuth`
- Legacy shim in `org.controller.getPermissionsHandler` → delegate to access service
- Extend `GET /api/platform/me` with `groups`, `ui_access` optional fields
- `auth-context-cache.ts` — `auth:access:{userId}:{orgId}` get/set/invalidate
- `attachEffectiveAccess` preHandler — sets `req.auth.effectiveAccess` (used in IAM-4)

### Backend — groups API (complete CRUD)

| Method | Path |
|--------|------|
| GET | `/api/iam/groups/:id` |
| PATCH | `/api/iam/groups/:id` — update permissions, capabilities, ui_access |

### Frontend

- `src/modules/iam/api/access.service.ts` — `getEffectiveAccess()`
- `src/modules/iam/hooks/useEffectiveAccess.ts` — wraps API (not wired to sidebar yet)

### Tests

- Unit: merge two groups — OR on module booleans; capability union
- Integration: user in `opd_doctor` → prescribe capability true, encounters CRUD
- Integration: user in zero groups → empty permissions
- Integration: super_admin → full bypass

---

## Out of scope

- Admin UI (IAM-3)
- Route `requirePermission` enforcement (IAM-4)
- Sidebar switch (IAM-5)

---

## Acceptance criteria

- [ ] `resolveEffectiveAccess` matches system template for seeded demo users
- [ ] `/api/iam/me/access` returns valid schema
- [ ] Legacy `/api/platform/permissions` returns same effective data
- [ ] Member add/remove invalidates access cache
- [ ] super_admin bypass tested

---

## Approval

- [ ] Product — US-4 API contract
- [ ] Tech — AD-2, AD-10; cache invalidation paths
- [ ] **Approved by:** ___
- [ ] **Date:** YYYY-MM-DD
