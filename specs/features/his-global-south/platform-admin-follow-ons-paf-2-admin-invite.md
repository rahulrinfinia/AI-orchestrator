# PAF-2 — Invite status + update hospital admin

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Clone** | `projects/his-global-south/` |
| **Epic** | [platform-admin-follow-ons](../../../prd/his-global-south/platform-admin-follow-ons/plan.md) |
| **Depends on** | PAH-1…3 (hospitals CRUD + invite create) |

## Goal

Platform admin sees whether the first admin finished setup, and can **change or replace** that admin without setting a password.

## Locked rules

- Pending: edit name/email → new one-use token.
- Accepted + same email: name-only profile update.
- Accepted + new email: replacement invite; **current `super_admin` stays until the new person completes setup**, then old admin → `user`.
- Existing login email → 409.
- Platform never sets/resets the hospital admin password.

## Files

- `backend/src/modules/platform/org/org.constants.ts`, `org.types.ts`, `org.schema.ts`, `org.mapping.ts`, `org.service.ts`, `org.routes.ts`, `org.controller.ts`
- `src/platform/constants/hospitals.ts`, `types/hospitals.ts`, `api/`, `hooks/`, `pages/hospitals/`
- `src/components/platform/HospitalAdminFields.tsx`

## Approval

- [x] Product: Wave A first; include update hospital admin (user 2026-08-23)
- [x] Tech: keep old admin until replacement accepts; no password on platform form
- [x] Scope: PAF-2 only (not suspend, health, gating, Register)

**Approved by:** user (chat)  
**Date:** 2026-08-23
