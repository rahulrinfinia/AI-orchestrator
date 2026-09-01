# IPD slice 0 — implementation report

| Field | Value |
|-------|--------|
| Spec | `specs/features/his-global-south/ipd-slice-0-scaffold.md` |
| Branch | `feat/his-global-south-slice-0-scaffold` |
| PR | https://github.com/apeiro-care/his-global-south/compare/develop...feat/his-global-south-slice-0-scaffold |
| Commit | `b634902` |

## Files changed (14)

### Backend
- `backend/src/modules/ipd/` — plugin, constants, health route, README
- `backend/src/build-app.ts` — register ipdPlugin, Swagger IPD tag
- `backend/src/__tests__/integration/api.integration.test.ts` — IPD health test

### Frontend
- `src/routes/ipdRoutes.tsx` — IPD entry router
- `src/pages/ipd/v1/routes.tsx`, `constants.ts`, `index.tsx`
- `src/services/ipd.service.ts`
- `src/modules/ipd/index.ts`
- `src/routes/appRoutes.tsx` — `/ipd/v1/*` mount only
- `src/components/layout/AppSidebar.tsx` — nav link

## Validation

- Integration test `GET /api/v1/ipd/health` added; local `beforeAll` hook timed out (slow `buildApp()` load) — manual smoke recommended
- No OPD route/service files modified except additive IPD touches listed above

## Convention compliance

- ADR 0006 embedded IPD, ADR 0009 naming (`/api/v1/ipd`, `/ipd/v1`)
- IPD routing locked per `his-global-south-patterns.md`
