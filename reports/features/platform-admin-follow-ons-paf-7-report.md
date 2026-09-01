# PAF-7 — Audited hospital support view

| Field | Value |
|-------|--------|
| **Plan** | `specs/features/his-global-south/platform-admin-follow-ons-paf-7-support.md` |
| **Clone** | `projects/his-global-south/` |
| **Status** | Implemented locally (not committed) |

## Files created

- `backend/src/db/migrations/005_platform_support_access.sql`
- `backend/src/modules/platform/pgschema/platform-support-access.pgschema.ts`

## Files changed

- `backend/src/modules/platform/org/org.constants.ts`, `org.types.ts`, `org.mapping.ts`, `org.service.ts`, `org.controller.ts`, `org.routes.ts`
- `backend/src/modules/platform/pgschema/index.ts`
- `backend/src/modules/platform/org/__tests__/org.hospitals.test.ts`
- `src/platform/constants/hospitals.ts`, `types/hospitals.ts`, `api/hospitals.mapping.ts`, `api/hospitals.service.ts`, `hooks/useHospitals.ts`
- `src/lib/queryKeys.ts`
- `src/platform/pages/hospitals/edit.tsx`

## Validation

- `vitest` org.hospitals — 22 passed
- frontend `tsc --noEmit` — passed
- `npm run db:migrate` — applied `005_platform_support_access.sql`
- Live API: platform health/support 200; hospital admin 403 on both; bad id 400; unknown org 404; second hospital support 200; no PHI keys
- frontend `eslint` on touched PAF-7 files — clean

## Convention compliance

- Constants + `*_VALUES` for action, staff max, forbidden payload keys
- Types in `*.types.ts`; mapping in `*.mapping.ts` (no types from service/page)
- Fastify `params` uuid on `GET .../support`
- Wire snake_case; camelCase only after `api/client.ts`
- New table + `COMMENT ON`; CHECK from `SUPPORT_ACCESS_ACTION_VALUES` via `sql.raw`
- Audit fail-closed; no `patients` join; `/health` unchanged
- PAF-6 (terminology) not touched

## How to try

Restart `flowmd-api`. Sign in as `platform@flowmd.ai` → Platform → Hospitals → open a hospital. Staff table is under health. Hospital `admin@flowmd.ai` must get 403 on `/support`.
