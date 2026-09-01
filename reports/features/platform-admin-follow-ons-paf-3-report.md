# PAF-3 — Suspend / reactivate hospital

| Field | Value |
|-------|--------|
| **Plan** | `specs/features/his-global-south/platform-admin-follow-ons-paf-3-suspend.md` |
| **Clone** | `projects/his-global-south/` |
| **Status** | Implemented locally (not committed) |

## Files

- `backend/src/middleware/reject-suspended-hospital.ts`
- `backend/src/middleware/auth-prehandlers.ts` — on `withOrgAuth` and `withOrgAndRoles`
- `backend/src/modules/platform/org/org.constants.ts`, `org.mapping.ts`, `org.service.ts`
- `src/platform/pages/hospitals/edit.tsx`, `HospitalFormFields.tsx`
- `src/utils/apiError.ts`

## Validation

- `vitest` reject-suspended-hospital + org.hospitals — passed
- frontend `tsc --noEmit` — passed

## Behaviour

- Hospital staff on `active = false` get 403 `hospital_suspended`
- `platform_admin` can still manage the tenant
- `PATCH active: false` deletes Better Auth sessions and invalidates auth cache
- Setup complete and resend invite are blocked while suspended
- Edit page has Suspend / Reactivate with confirm
