# Slice PAH-2 — Edit hospital + session flags

| Field | Value |
|-------|--------|
| **ID** | PAH-2 |
| **Depends on** | PAH-1 |
| **Spec** | [platform-admin-hospitals-pah-2-edit-me.md](../../../../specs/features/his-global-south/platform-admin-hospitals-pah-2-edit-me.md) |
| **Tracer** | Platform admin opens a hospital from the list → edits name/flags → save → list and detail show new values; any logged-in user sees flags on `/me` |

## Purpose

Add depth on the working create/list system: cross-tenant read/update and expose flags for a later gating slice.

## In scope

- `GET /api/platform/organizations/:id` — `platform_admin` any id; others own org only (today)
- `PATCH /api/platform/organizations/:id` — platform admin any id + all writable fields including flags; hospital `super_admin` own org only, **ignore flag keys**
- `GET /api/platform/me` includes `opd_enabled`, `ipd_enabled` from the user’s organization
- UI: `/platform/hospitals/:id` edit form

## Out of scope

- Sidebar / IPD API 403 when `ipd_enabled=false`
- Role exclusion / runbook (PAH-3)
- Hospital admin editing flags

## Endpoints this slice

| Method | Path | Change |
|--------|------|--------|
| GET | `/api/platform/organizations/:id` | Branch: platform admin bypasses own-org check |
| PATCH | `/api/platform/organizations/:id` | Same + flags only if `platform_admin`; extend body schema |
| GET | `/api/platform/me` | Add two booleans from joined org |

## Acceptance (slice)

- [ ] Platform admin GET/PATCH any org id
- [ ] Hospital `super_admin` still 403 on another org’s GET/PATCH
- [ ] Hospital PATCH of `opd_enabled`/`ipd_enabled` is ignored
- [ ] Both flags false → 400/422
- [ ] `/me` returns flags matching the user’s org row
