# IAM-5 — Frontend sync (API-driven nav)

| Field | Value |
|-------|--------|
| **Feature** | `iam-resource-groups` |
| **Slice** | 5 |
| **Depends on** | IAM-2, IAM-3 (recommended) |
| **Technical design** | [../technical-design.md](../technical-design.md) §7, AD-9 |
| **Goal** | Sidebar, landing, triage buttons, approval tabs from `/me/access`; remove runtime static RBAC |

---

## Purpose

Single hook `useEffectiveAccess()` drives all frontend authorization. Delete runtime dependency on `staticRoleAccess.ts`. Admin group edits immediately reflect in nav after cache TTL / reload.

---

## User stories addressed

| Story | Coverage |
|-------|----------|
| US-4 Effective access on login | Full — UI |

---

## Scope

### Frontend

- Wire `AppSidebar` to `useEffectiveAccess().uiAccess`
- Wire `RootLanding` / `appRoutes.tsx` landing redirect to `uiAccess.landingPath`
- Orders approval tab preference from capabilities
- Triage form buttons from `uiAccess.triageForm`
- Replace `usePermissions` + `useRoleAccess` usages with `useEffectiveAccess` (barrel export from `@/modules/iam`)
- `RequirePermission` component replaces `RequireRole` where module-based
- Mark `staticRoleAccess.ts` deprecated; remove imports (file may remain as template reference only or deleted)

### Backend

- Ensure `ui_access` JSON shape matches former `ResolvedRoleAccess` fields
- Remove legacy shim flag if `IAM_GROUP_RBAC_ENABLED` always on

### Tests

- Update `usePermissions.test.ts` → `useEffectiveAccess.test.ts`
- Sidebar snapshot: receptionist seed → front desk nav only
- Module boundary test: `@/modules/iam` barrel exports

---

## Out of scope

- Remaining route enforcement (IAM-6)
- Custom groups UI (IAM-6)

---

## Acceptance criteria

- [ ] No production import of `STATIC_ROLE_ACCESS` or `useRoleAccess` from static file
- [ ] Demo `@flowmd.dev` accounts match pre-migration nav behaviour
- [ ] Admin edits group ui_access → user sees nav change after reload
- [ ] `npm run lint` + `npx tsc -b` pass

---

## Approval

- [ ] Product — nav parity with current static RBAC
- [ ] Tech — AD-9 complete
- [ ] **Approved by:** ___
- [ ] **Date:** YYYY-MM-DD
