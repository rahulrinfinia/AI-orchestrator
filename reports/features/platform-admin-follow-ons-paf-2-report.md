# PAF-2 — Invite status + update hospital admin

| Field | Value |
|-------|--------|
| **Plan** | `specs/features/his-global-south/platform-admin-follow-ons-paf-2-admin-invite.md` |
| **Clone** | `projects/his-global-south/` |
| **Status** | Implemented locally (not committed) |

## Files

- `backend/src/modules/platform/org/org.constants.ts`, `org.types.ts`, `org.schema.ts`, `org.mapping.ts`, `org.service.ts`, `org.routes.ts`, `org.controller.ts`
- `backend/src/modules/platform/org/__tests__/org.hospitals.test.ts`
- `src/platform/constants/hospitals.ts`, `types/hospitals.ts`, `api/`, `hooks/`, `pages/hospitals/index.tsx`, `edit.tsx`
- `src/components/platform/HospitalAdminFields.tsx`, `hospitalAdminFields.types.ts`

## Validation

- `vitest` org.hospitals.test.ts — 14 passed
- frontend `tsc --noEmit` — passed

## Behaviour

- List/get include admin invite status and identity
- `PUT /api/platform/organizations/:id/admin` — name-only if same email; new email issues setup link
- Replacement: current `super_admin` stays until new admin completes setup, then old → `user`
