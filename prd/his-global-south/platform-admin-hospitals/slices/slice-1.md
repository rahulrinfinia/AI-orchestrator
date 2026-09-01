# Slice PAH-1 — Create and list hospitals

| Field | Value |
|-------|--------|
| **ID** | PAH-1 |
| **Depends on** | — |
| **Spec** | [platform-admin-hospitals-pah-1-create-list.md](../../../../specs/features/his-global-south/platform-admin-hospitals-pah-1-create-list.md) |
| **Tracer** | Login as `platform@flowmd.ai` → **Platform → Hospitals** → **Add hospital** → hospital appears in the list |

## Purpose

Thinnest end-to-end hospital onboard: role + flags in the database, seed account, create/list APIs, list/create screens.

## In scope

- `ALTER TYPE app_role ADD VALUE 'platform_admin'`
- `organizations.opd_enabled` / `ipd_enabled` + CHECK at least one true
- Seed `platform@flowmd.ai` + `user_roles.platform_admin` on the demo org
- `assertPlatformAdmin()` (app layer only)
- `POST /api/platform/organizations` and `GET /api/platform/organizations`
- UI: `/platform/hospitals` list + `/platform/hospitals/new` create
- Sidebar **Hospitals** only when session roles include `platform_admin`

## Out of scope

- Edit screen / cross-tenant GET/PATCH (PAH-2)
- `/me` flags (PAH-2)
- Org setup role picker exclusion + runbook (PAH-3)
- Flag-based IPD/OPD nav gating

## Endpoints this slice

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/platform/organizations` | `platform_admin` |
| GET | `/api/platform/organizations` | `platform_admin` |

Existing `GET/PATCH /api/platform/organizations/:id` stay **own-org** until PAH-2.

## Acceptance (slice)

- [ ] Migration applies; existing orgs get `opd_enabled=true`, `ipd_enabled=false`
- [ ] Demo Flow Health optionally `ipd_enabled=true` (local IPD)
- [ ] `platform@flowmd.ai` / `FlowMD2026!` can sign in and has `platform_admin`
- [ ] Platform admin can create and list hospitals
- [ ] `admin@flowmd.ai` (`super_admin`) gets **403** on create and list
- [ ] Hospitals nav visible only for `platform_admin`
