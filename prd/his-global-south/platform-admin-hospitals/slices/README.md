# Slices — platform-admin-hospitals

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `platform-admin-hospitals` |
| **Branch** | `feat/platform-admin-hospitals` (from `develop` — **not** the IPD admissions branch) |
| **PRD** | [../prd.md](../prd.md) |
| **Technical design** | [../technical-design.md](../technical-design.md) |
| **G3 status** | **Pending** — fill Approval on each spec before implement |

## Dependency graph

```text
PAH-1  Migration + seed + create/list API + list/create UI
  └── PAH-2  Cross-tenant GET/PATCH + edit UI + /me flags
        └── PAH-3  Role exclusion + 403 tests + runbook
```

Each slice is a **vertical tracer**. PAH-1 is the thinnest path: sign in as platform operator → see Hospitals → create a hospital → see it in the list.

## Slice index

| Slice | Spec | Goal |
|-------|------|------|
| PAH-1 | [platform-admin-hospitals-pah-1-create-list.md](../../../../specs/features/his-global-south/platform-admin-hospitals-pah-1-create-list.md) | Enum + org flags + seed + POST/GET collection + list/create UI |
| PAH-2 | [platform-admin-hospitals-pah-2-edit-me.md](../../../../specs/features/his-global-south/platform-admin-hospitals-pah-2-edit-me.md) | Cross-tenant GET/PATCH + edit UI + `/me` flags |
| PAH-3 | [platform-admin-hospitals-pah-3-hardening.md](../../../../specs/features/his-global-south/platform-admin-hospitals-pah-3-hardening.md) | Role cannot be granted from Org setup; 403 matrix; ops runbook |

## PRD user-story coverage

| US | Slices |
|----|--------|
| US-1 New `platform_admin` role | PAH-1 (enum), PAH-3 (not assignable) |
| US-2 Static credentials | PAH-1 (seed), PAH-3 (runbook) |
| US-3 Create hospital | PAH-1 |
| US-4 List all hospitals | PAH-1 |
| US-5 Edit any hospital | PAH-2 |
| US-6 `/me` flags | PAH-2 |
| US-7 Existing orgs keep OPD defaults | PAH-1 (migration defaults + optional demo `ipd_enabled=true`) |
| US-8 `super_admin` unchanged | PAH-1 (own-org routes untouched), PAH-2 (hospital PATCH flags ignored), PAH-3 (403 + regression) |

## Out of scope (all slices)

- Email invite / first hospital admin password
- Changing SQL `is_platform_admin()` or payer RLS
- Sidebar or IPD API gating by `ipd_enabled` (later IPD work; **do not** implement IPD slice-1 gating here)
- Auto-create hospital `super_admin` on create
- Payer catalog, Personnel, clinical modules

## Conflict with older IPD plan

`specs/features/his-global-south/ipd-slice-1-org-flags.md` also proposed `opd_enabled` / `ipd_enabled` **and** nav/API 403 gating. That slice is **superseded** for column ownership. **PAH-1 owns the columns.** IPD gating (if ever) only **reads** flags.

## After you approve

Fill the Approval block on **PAH-1** first, then say: implement PAH-1. Do not implement until that block is filled.

## Follow-on (not this epic)

Invite mail reliability, invite status, suspend, tenant health, IPD/OPD gating: [platform-admin-follow-ons/plan.md](../../platform-admin-follow-ons/plan.md). Public Register is **not** in that plan.
