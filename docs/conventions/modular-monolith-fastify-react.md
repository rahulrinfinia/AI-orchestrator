# Modular monolith (Fastify + React) — index

Apply in cloned app repos under `projects/<name>/`.

## Convention documents

| Doc | Scope |
|-----|--------|
| [fastify-backend.md](fastify-backend.md) | Routes, handlers, service, SQL, Zod, errors, migrations |
| [react-frontend.md](react-frontend.md) | Features, React Query, forms, a11y, components |
| [api-design.md](api-design.md) | REST shapes, pagination, error envelope, OWASP |
| [hipaa.md](hipaa.md) | PHI handling, audit, encryption (healthcare apps) |
| [security.md](security.md) | General security baseline + pre-review checklist |

## Testing

| Doc | Scope |
|-----|--------|
| [../test/testing-strategy.md](../test/testing-strategy.md) | Honeycomb model, layers, CI gates |

## Architecture decisions

Per-project ADRs: `docs/decisions/<project>/` (IPD: 0001–0004)

## Before implementing

Run **convention-loader** skill with the file list from your plan.

## Repo layout

Full tree: **[folder-structure.md](folder-structure.md)**

```text
src/features/<domain>/          # Frontend vertical slices
backend/src/modules/<domain>/   # API vertical slices (same domain names)
backend/src/plugins/            # auth, db, errors
backend/src/db/migrations/
```

## Backend module

```text
modules/<domain>/
├── index.ts       # plugin registration
├── routes.ts      # ≤150 lines
├── handlers.ts
├── service.ts     # SQL + business logic only
├── schemas.ts
├── constants.ts
├── types.ts
├── __tests__/
└── README.md
```

## Frontend feature

```text
src/features/<domain>/
├── index.ts, routes.ts, api.ts, service.ts, schemas.ts
├── types.ts, constants.ts
├── hooks/             # ↔ backend handlers
├── components/
└── __tests__/
```

See [folder-structure.md](folder-structure.md) for FE ↔ BE file mapping.

## Limits

| File | Max lines |
|------|-----------|
| Page | 100 |
| Feature component | 200 |
| service.ts | 400 |
| Function | 50 |

## API boundary

- Wire: snake_case
- App: camelCase
- Transform: only `src/integrations/api/client.ts`

## Migrations

Every schema change: migration file + `COMMENT ON` in same file.

## Deploy

Path CI: `src/**` → frontend; `backend/**` → API.
