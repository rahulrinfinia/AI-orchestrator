# Report — platform-admin-hospitals (PAH-1 / PAH-2 / PAH-3)

| Field | Value |
|-------|--------|
| **Plan** | `specs/features/his-global-south/platform-admin-hospitals-pah-1-create-list.md` (+ pah-2, pah-3) |
| **Clone** | `projects/his-global-south/` |
| **Branch** | `feat/platform-admin-hospitals` (local only — not committed) |
| **Date** | 2026-08-23 |

## What shipped

Add Hospital matches every writable `organizations` column plus the two new module flags. Values come from `org.constants.ts` / `src/platform/constants/hospitals.ts` — not hardcoded in the form or service.

## Files (clone)

**New**

- `backend/src/db/migrations/003_platform_admin_and_org_flags.sql`
- `backend/src/modules/platform/org/org.constants.ts`
- `backend/src/modules/platform/org/org.mapping.ts`
- `backend/src/modules/platform/org/org.schema.ts`
- `backend/src/modules/platform/org/__tests__/org.hospitals.test.ts`
- `backend/src/db/seeds-drizzle/platform-admin.ts`
- `docs/platform/PLATFORM-ADMIN-RUNBOOK.md`
- `src/platform/**` (constants, types, api, hooks, hospitals pages/routes)
- `src/routes/platformRoutes.tsx`

**Changed**

- `backend/src/db/schema/enums.ts` — `platform_admin`
- `backend/src/modules/platform/pgschema/organizations.pgschema.ts` — flags + CHECK from constants
- `backend/src/modules/platform/platform.constants.ts` — `ROLE.PLATFORM_ADMIN` (not in invite/personnel lists)
- `backend/src/modules/platform/org/org.service.ts` / `org.controller.ts` / `org.routes.ts` / `org.types.ts`
- `backend/src/modules/platform/platform.schema.ts` — re-exports org PATCH schema
- `backend/src/middleware/role-priority.ts`
- `backend/src/db/seeds/create-admin.ts` — `platform@flowmd.ai`
- `backend/src/db/seeds-drizzle/run.ts`
- `src/routes/appRoutes.tsx` — `/platform/*`
- `src/components/layout/AppSidebar.tsx` — Hospitals + platform-only filter
- `src/lib/queryKeys.ts`

## Validation

- `org.hospitals.test.ts` — 9 passed
- `role-priority.test.ts` — 4 passed
- `tsc --noEmit` (backend) — passed
- eslint on touched frontend/org files — passed
- Shared `pgschema.test.ts` still fails on a **pre-existing** missing `patient-related-persons.pgschema.js` import (not this work)

## Convention compliance

- Domain literals in `org.constants.ts` + `*_VALUES`; Fastify enums from those arrays
- Types in `org.types.ts` / `src/platform/types/hospitals.ts`
- Mapping in `org.mapping.ts` / `src/platform/api/hospitals.mapping.ts`
- Drizzle CHECK via `sql.raw` / `textInArrayCheck`
- Portable `src/platform/` (same shape as `src/ipd/`)
- camelCase FE / snake_case wire via `api/client.ts`
- `platform_admin` not in `INVITE_ROLES` / Org setup pickers; PUT roles rejects it

## Not done here

- No git commit / push / PR
- Browser smoke (dev server not exercised)
- Apply migration + `db:seed:auth-users` + `db:seed` on a live local DB (operator step)
