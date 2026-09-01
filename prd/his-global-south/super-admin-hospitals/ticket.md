# Intake — Super Admin: create hospital with OPD / IPD module flags

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature key** | `super-admin-hospitals` |
| **Requested by** | Rahul |
| **Date** | 2026-08-19 |
| **Target repo** | `apeiro-care/his-global-south` @ `develop` |

---

## Summary

FlowMD **Super Admin** (flowMD company staff, role `super_admin`) needs to **create a new hospital** (tenant organization) and choose which product modules that hospital uses:

- **OPD enabled** — outpatient modules (registration, clinical, RCM)
- **IPD enabled** — inpatient modules (admissions, bed board, ward — future slices)

Flags are stored on the **existing** `organizations` table. No new database tables for v1.

---

## Problem today

- Hospitals exist only via seed/SQL or manual DB insert.
- Org setup (`/org-setup`) **edits the current org** only — it does not create new hospitals.
- APIs today: `GET` and `PATCH /api/platform/organizations/:id` only — **no create, no list**.
- No UI for Super Admin to onboard a new hospital with module selection.

---

## Acceptance criteria (intake checklist)

- [ ] Super Admin can create a hospital with **name** and **OPD / IPD checkboxes**
- [ ] At least one module flag must be true (OPD-only, IPD-only, or both)
- [ ] Flags persist as `organizations.opd_enabled` and `organizations.ipd_enabled`
- [ ] Super Admin can **list** all hospitals and see their flags
- [ ] Super Admin can **update** flags on an existing hospital
- [ ] Non–super-admin users cannot create or list all hospitals
- [ ] Logged-in user's org exposes flags via `/api/platform/me` (for future UI gating)
- [ ] No new DB tables; extend `organizations` only
- [ ] Follow existing `platform/org` module coding patterns

---

## Explicitly out of scope (v1)

- Sidebar / route hiding based on flags
- IPD API 403 middleware when IPD disabled
- `config_profile_id`, deployment profile selection
- Auto-create `p1_config.facility` when IPD enabled
- Create first hospital admin user on hospital create
- Super Admin impersonation / switch org

---

## References

- [his-global-south architecture §7](../../../docs/architecture/his-global-south.md)
- [flowmd-platform-full-architecture §1.3](../../../docs/architecture/flowmd-platform-full-architecture.md)
- Existing org API: `projects/his-global-south/backend/src/modules/platform/org/`

---

## Intake status

**Awaiting product confirmation** before PRD is marked final for Gate G1.
