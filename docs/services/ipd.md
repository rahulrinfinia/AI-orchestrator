# IPD

Discovery doc — run `project-discovery ipd` from the orchestrator hub to regenerate.

- **Repo:** `projects/ipd/` → https://github.com/rahulrinfinia/IPD.git
- **Pattern:** Modular monolith — vertical domains aligned FE/BE

## Folder structure

| Layer | Path |
|-------|------|
| Frontend features | `src/features/<domain>/` |
| Frontend pages | `src/pages/` |
| Backend modules | `backend/src/modules/<domain>/` |
| Platform (shared) | `backend/src/modules/platform/` |
| Migrations | `backend/src/db/migrations/` |
| Plugins | `backend/src/plugins/` (auth, db, errors) |

Full tree: hub `docs/conventions/folder-structure.md`

## API

- `GET /api/health` → `{ status, service }` (public)

## Planned domains

- `admissions`, `patients`, `beds`, `clinical` (as slices land)
