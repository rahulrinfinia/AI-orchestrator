# Slice 0 — IPD scaffold (health + UI shell)

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `ipd` |
| Branch | `develop` |
| Goal | Empty IPD module; health API; placeholder UI — **zero OPD changes** |

---

## Approval

| Role | Name | Date | Status |
|------|------|------|--------|
| Engineering | Rahul | 2026-08-19 | **approved** |

## Approval
- [x] Product — acceptance criteria match intent
- [x] Tech — AD constraints respected
- **Approved by:** Rahul
- **Date:** 2026-08-19

---

## Context (read before coding)

- [his-global-south.md](../../docs/architecture/his-global-south.md)
- [his-global-south-patterns.md](../../docs/conventions/his-global-south-patterns.md)
- ADR [0006](../../docs/decisions/his-global-south/0006-embedded-in-his-global-south.md), [0009](../../docs/decisions/his-global-south/0009-ipd-naming-and-versioning.md)

**Clone path (runnable app):** `projects/his-global-south/`

**Implemented code (visible in this hub — open in sidebar):**

```text
specs/features/his-global-south/ipd-slice-0-scaffold/code/
```

Start at [code/README.md](./code/README.md). Edits to existing OPD files: [additive-touches.md](./additive-touches.md).

**Two-pane workspace:** open [ai-orchestrator-workspace.code-workspace](../../../ai-orchestrator-workspace.code-workspace) from repo root.

---

## In scope

### Backend (new under `backend/src/modules/ipd/`)

- `index.ts` — Fastify plugin `{ name: 'ipd' }`
- `ipd.constants.ts` — `IPD_API_BASE = '/api/v1/ipd'`
- `GET /api/v1/ipd/health`
- `README.md`

### Backend (additive touch)

- `backend/src/build-app.ts` — register `ipdPlugin`

### Frontend (new)

Follow **IPD routing (locked)** in [his-global-south-patterns.md](../../docs/conventions/his-global-south-patterns.md):

- `src/routes/ipdRoutes.tsx` — IPD entry (delegates to v1)
- `src/pages/ipd/v1/routes.tsx` — v1 sub-router (index + future `admissions/*`, `capacity/*`)
- `src/pages/ipd/v1/constants.ts` — `IPD_UI_BASE = '/ipd/v1'`
- `src/pages/ipd/v1/index.tsx` — v1 home shell
- `src/services/ipd.service.ts`
- `src/modules/ipd/index.ts`

### Frontend (additive touch — IPD only)

- `src/routes/appRoutes.tsx` — **one line only:** `<Route path="/ipd/v1/*" element={<IpdRoutes />} />`
- `src/components/layout/AppSidebar.tsx` — IPD nav link → `/ipd/v1`

---

## Out of scope

- Migrations, events, org flags, admissions/capacity logic
- Any OPD file changes (see deny list in prior spec)

---

## Acceptance criteria

- [x] `GET /api/v1/ipd/health` → 200
- [x] `/ipd/v1` loads in authenticated layout
- [x] No OPD route/service diffs
- [ ] PR to `develop` — branch pushed; open manually: https://github.com/apeiro-care/his-global-south/compare/develop...feat/his-global-south-slice-0-scaffold

---

## Status tracking

Update [prd/his-global-south/ipd/slices/status.yaml](../../prd/his-global-south/ipd/slices/status.yaml) after merge.
