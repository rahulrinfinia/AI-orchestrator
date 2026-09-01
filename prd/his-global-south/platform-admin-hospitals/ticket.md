# Intake — Platform Admin: onboard & manage hospitals (OPD / IPD flags)

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature key** | `platform-admin-hospitals` |
| **Requested by** | Rahul |
| **Date** | 2026-08-20 |
| **Target repo** | `apeiro-care/his-global-south` @ `develop` |
| **Supersedes** | `super-admin-hospitals` (used `super_admin`; replaced by new `platform_admin` role) |

---

## Summary

Introduce a **new role `platform_admin`** for flowMD company staff who **onboard and manage hospitals (tenants)** across the platform — without changing existing **`super_admin`** (hospital-scoped admin).

Platform admin credentials are **static / seed-only**: provisioned in the database (seed or manual SQL). **No UI** to grant or revoke `platform_admin`.

---

## Problem today

- Hospitals are created only via seed/SQL — not from the product.
- Existing `super_admin` is a **hospital-internal** highest admin (one org, users, org profile, staff).
- There is no cross-tenant operator who can create hospitals and set OPD/IPD module flags.
- `is_platform_admin()` in DB is only an alias for `super_admin` — no dedicated role exists.

---

## Acceptance criteria (intake checklist)

- [ ] New enum value `platform_admin` on `app_role` (migration)
- [ ] **Existing `super_admin` behaviour unchanged** (Org setup, Personnel, payer catalog, module bypass, etc.)
- [ ] Platform admin can **create** hospital (name + OPD/IPD checkboxes)
- [ ] Platform admin can **list all** hospitals and see flags
- [ ] Platform admin can **update** OPD/IPD flags on any hospital
- [ ] Flags persist as `organizations.opd_enabled` and `organizations.ipd_enabled`
- [ ] At least one module flag must be true on create/update
- [ ] `GET /api/platform/me` exposes org module flags for logged-in hospital users (future nav)
- [ ] **Static platform admin account(s)** in seed — e.g. dedicated email/password in `demo.sql` / `create-admin.ts`
- [ ] **No UI or API** for hospital staff or `super_admin` to assign `platform_admin`
- [ ] Adding/removing platform admins only via **DB seed, migration, or manual SQL** (documented runbook)
- [ ] No new tables; extend `organizations` + enum only

---

## Explicitly out of scope (v1)

- Changing or migrating existing `super_admin` users
- Sidebar / route gating by OPD/IPD flags
- IPD clinical workflows (admissions, beds)
- Auto-create first hospital admin on hospital create
- Platform admin self-sign-up or invite flow
- UI to manage platform admin users
- Kenya/UAE region picker, `config_profile_id`
- Payer catalog access for `platform_admin` (stays `super_admin` for now)

---

## References

- Superseded PRD: `../super-admin-hospitals/prd.md`
- Architecture: `docs/architecture/flowmd-platform-full-architecture.md` §1
- Existing org API: `projects/his-global-south/backend/src/modules/platform/org/`
- DB alias note: `is_platform_admin()` — migration 001 comment

---

## Intake status

**Awaiting product confirmation** before PRD Gate G1.
