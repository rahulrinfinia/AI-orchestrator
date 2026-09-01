# PAF-4 — Read-only hospital health

| Field | Value |
|-------|--------|
| **Plan** | `specs/features/his-global-south/platform-admin-follow-ons-paf-4-health.md` |
| **Clone** | `projects/his-global-south/` |
| **Status** | Implemented locally (not committed) |

## Files

- `backend/src/modules/platform/org/org.types.ts`, `org.mapping.ts`, `org.service.ts`, `org.controller.ts`, `org.routes.ts`
- `src/platform/types/hospitals.ts`, `api/`, `hooks/useHospitals.ts`
- `src/platform/pages/hospitals/edit.tsx`
- `src/lib/queryKeys.ts`

## Validation

- `vitest` org.hospitals (health 403) — passed
- frontend `tsc --noEmit` — passed

## Behaviour

- `GET /api/platform/organizations/:id/health` — platform_admin only
- Aggregates: user count, role histogram, has_super_admin, last_session_at, flags, created_at
- No PHI
