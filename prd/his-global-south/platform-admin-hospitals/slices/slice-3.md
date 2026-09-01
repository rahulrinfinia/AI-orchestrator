# Slice PAH-3 — Hardening (role lock, 403 matrix, runbook)

| Field | Value |
|-------|--------|
| **ID** | PAH-3 |
| **Depends on** | PAH-2 |
| **Spec** | [platform-admin-hospitals-pah-3-hardening.md](../../../../specs/features/his-global-south/platform-admin-hospitals-pah-3-hardening.md) |
| **Tracer** | Hospital `super_admin` cannot grant `platform_admin`; ops can add/remove the role from the runbook; automated 403 matrix is green |

## Purpose

Close the product lock: the new role is seed/SQL only, hospital admin flows are unchanged, and the feature is documented for ops.

## In scope

- `INVITE_ROLES` / Org setup `ROLE_OPTIONS` / `PUT /api/platform/users/:id/roles` reject `platform_admin`
- Do **not** add `platform_admin` to `PLATFORM_ADMIN_ROLES` (that set is hospital `super_admin` settings)
- Integration 403/201 matrix + org-setup regression
- Runbook: add/remove platform admin via SQL
- Document seed credentials next to other demo users (POST-SETUP or backend seed comments)

## Out of scope

- New product behaviour (no new fields or screens)
- Email invite
- Changing `is_platform_admin()` SQL

## Acceptance (slice)

- [ ] Org setup UI has no `platform_admin` option
- [ ] Role update API returns 400 if body includes `platform_admin`
- [ ] `admin@flowmd.ai` create/list hospitals = 403; own-org PATCH still works
- [ ] Runbook exists and matches the seed SQL pattern
