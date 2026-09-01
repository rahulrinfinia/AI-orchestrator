# PAF-3 — Suspend / reactivate hospital

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Clone** | `projects/his-global-south/` |
| **Epic** | [platform-admin-follow-ons](../../../prd/his-global-south/platform-admin-follow-ons/plan.md) |
| **Depends on** | PAF-2 |

## Goal

`organizations.active === false` blocks hospital staff. Platform admin can still list and edit the tenant.

## Locked rules

- After session + org resolve: inactive org + caller is not `platform_admin` → **403** `{ error, code: hospital_suspended }`.
- Check `organizations.active` every request (do not trust the 120s profile cache).
- On `PATCH active: false`: invalidate auth context cache and delete Better Auth `sessions` for that org’s users (skip `platform_admin`).
- Edit UI: explicit **Suspend** / **Reactivate** with confirm. Hide the Active checkbox on edit.
- Disable copy-invite while suspended. Block setup complete and resend invite while suspended.
- Do not delete the org or patients.

## Approval

- [x] Product: Wave A first (user 2026-08-23)
- [x] Tech: middleware on `withOrgAuth` / `withOrgAndRoles`; session delete on suspend
- [x] Scope: PAF-3 only (not IPD/OPD gating)

**Approved by:** user (chat)  
**Date:** 2026-08-23
