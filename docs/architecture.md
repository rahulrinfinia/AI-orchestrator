# Architecture (workspace index)

Fill this as you add projects. One section per cloned monolith.

## Projects

| Project | Path | Frontend | Backend | Status |
|---------|------|----------|---------|--------|
| ipd | `projects/ipd/` | `src/` (Vite) | `backend/` (Fastify) | Registered — https://github.com/rahulrinfinia/IPD |

## Per-project template

### flowmd (example)

- **Repo:** `projects/flowmd/`
- **Pattern:** Modular monolith — Fastify API + React SPA
- **Wire:** REST `/api/*`, snake_case JSON; frontend camelCase via `src/integrations/api/client.ts`
- **Domains:** frontdesk, clinical, rcm, pharmacy, patient, platform, orchestration
- **Data:** PostgreSQL 16, hand-written SQL migrations
- **Deploy:** Separate artifacts — Nginx (SPA) + Fastify (API); path-based CI

## Cross-project rules

- Planning artifacts stay in **this hub** only.
- No application source committed to the hub repo.
- Coding standards: `docs/conventions/` — run **convention-loader** before implement.
- IPD ADRs: `docs/decisions/ipd/` (Postgres, Better Auth, deploy split, audit logging).
