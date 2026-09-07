# IAM-3 — Resource Groups admin UI

| Field | Value |
|-------|--------|
| **Feature** | `iam-resource-groups` |
| **Slice** | 3 |
| **Depends on** | IAM-2 |
| **Technical design** | [../technical-design.md](../technical-design.md) §7 |
| **Goal** | Super_admin manages groups, permissions, and members in Org Setup — primary admin workflow |

---

## Purpose

Replace per-user permission matrix as **primary** admin path with Resource Groups UI. Admin selects group → edits module CRUD + capabilities → adds/removes members.

---

## User stories addressed

| Story | Coverage |
|-------|----------|
| US-2 Add/remove members | Full — UI |
| US-3 Edit group permissions | Full — group-level matrix + capabilities checkboxes |

---

## Scope

### Frontend — `src/modules/iam/pages/resource-groups/`

- `index.tsx` — list groups (name, slug, member count, system badge)
- `detail.tsx` — tabs: Members | Permissions | Capabilities | Navigation preview
- `components/GroupMemberPicker.tsx` — search org users, add/remove
- `components/GroupPermissionMatrix.tsx` — module CRUD switches (group level)
- `components/CapabilityChecklist.tsx` — prescribe, approve_lab, etc.
- `routes.tsx` — `/org-setup/resource-groups`, `/org-setup/resource-groups/:id`

### Frontend — Org Setup integration

- Add **Resource Groups** as primary tab in `src/pages/admin/index.tsx`
- Demote legacy Users & Roles matrix to collapsed "Legacy overrides" (read-only or hidden v1)

### API wiring

- `api/groups.service.ts`, `api/members.service.ts`
- `hooks/useResourceGroups.ts`, `useGroupDetail.ts`

### Tests

- Component: permission matrix saves PATCH
- E2E (optional): add user to OPD Doctor → `/me/access` reflects change

---

## Out of scope

- Custom group create (IAM-6)
- Sidebar still uses staticRoleAccess until IAM-5
- Backend route enforcement (IAM-4)

---

## Acceptance criteria

- [ ] Super_admin lists all system groups
- [ ] Edit group permissions persists via PATCH
- [ ] Add/remove member updates member list
- [ ] Non-super_admin cannot access page (RequireRole)
- [ ] System groups show badge; slug read-only for system groups

---

## Approval

- [ ] Product — US-2, US-3 admin UX
- [ ] Tech — routes under `/org-setup/resource-groups`
- [ ] **Approved by:** ___
- [ ] **Date:** YYYY-MM-DD
