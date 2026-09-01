# PAF-4 — Read-only hospital health

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Clone** | `projects/his-global-south/` |
| **Epic** | [platform-admin-follow-ons](../../../prd/his-global-south/platform-admin-follow-ons/plan.md) |
| **Depends on** | PAF-3 |

## Goal

Platform admin can see whether a tenant is alive without opening Personnel or any chart.

## Endpoint

`GET /api/platform/organizations/:id/health` — `assertPlatformAdmin`, `:id` uuid.

Allowed fields only: `user_count`, `role_counts`, `has_super_admin`, `last_session_at`, `opd_enabled`, `ipd_enabled`, `active`, `created_at`.

Forbidden: patient list, visits, names, emails of patients, chart data.

## UI

Panel on `/platform/hospitals/:id`.

## Approval

- [x] Product: Wave A first (user 2026-08-23)
- [x] Tech: aggregates only; no PHI
- [x] Scope: PAF-4 only (not support view / impersonation)

**Approved by:** user (chat)  
**Date:** 2026-08-23
