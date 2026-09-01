# IPD slice 0 — scaffold report

| Field | Value |
|-------|--------|
| Spec | `specs/features/his-global-south/ipd-slice-0-scaffold.md` |
| Branch | `develop-ipd` (in `projects/his-global-south/`) |
| Status | Implemented locally — PR not opened |

## Delivered

### Backend
- `backend/src/modules/ipd/` — plugin, constants, health route, README
- `backend/src/build-app.ts` — register `ipdPlugin`, Swagger IPD tag, `/health` modules list

### Frontend
- `src/pages/ipd/v1/index.tsx` — dashboard shell with health probe
- `src/services/ipd.service.ts` — `getIpdHealth()`
- `src/modules/ipd/index.ts` — barrel + `IPD_UI_BASE`
- `src/routes/appRoutes.tsx` — `/ipd/v1` route
- `src/components/layout/AppSidebar.tsx` — "Inpatient (IPD)" nav link

### Tests
- Added `GET /api/v1/ipd/health` case in `api.integration.test.ts`

## Validation

Backend vitest run hit timeouts loading full `buildApp()` in this environment (pre-existing slow suite). Manual smoke: start backend and hit `/api/v1/ipd/health`.

## Next

1. Commit + push `develop-ipd` in `projects/his-global-south/`
2. `gh pr create` → `develop`
3. Update `status.yaml` → `in_review` with PR URL
