# Modular monolith folder structure

Industry-standard layout for Fastify + React monoliths under `projects/<name>/`.

**Principles**

- **Vertical domains** — same name in `backend/src/modules/<domain>/` and `src/features/<domain>/`
- **Shared kernel** — cross-cutting code in `plugins/`, `lib/`, `platform` module
- **Thin edges** — pages and routes compose features; API routes delegate to handlers → service
- **Colocated tests** — tests next to the code they cover
- **One repo, two deploy units** — `src/**` frontend, `backend/**` API

---

## Full tree

```text
<project>/                          # e.g. ipd/
├── .cursor/rules/                  # Agent coding rules (backend, frontend, security)
├── .github/workflows/              # CI — path-filtered frontend vs backend
├── docs/                           # App-specific notes (hub holds org-wide standards)
├── e2e/                            # Playwright — critical journeys only
├── public/                         # Static assets (favicon, images)
│
├── src/                            # ── FRONTEND (React + Vite) ──
│   ├── app/                        # App shell — providers, router bootstrap
│   │   ├── AppProviders.tsx        # QueryClient, auth, theme
│   │   └── router.tsx              # Route tree definition
│   ├── pages/                      # Thin page shells (≤100 lines each)
│   │   └── <domain>/
│   │       └── <Page>Page.tsx      # Composes feature components only
│   ├── features/                   # Vertical domain UI (mirrors backend modules)
│   │   └── <domain>/
│   │       ├── index.ts            # Public exports
│   │       ├── routes.ts           # App + API path constants
│   │       ├── api.ts              # React Query / fetch (↔ routes + handlers)
│   │       ├── service.ts          # Pure client logic (↔ service.ts)
│   │       ├── schemas.ts          # Zod forms/filters (↔ schemas.ts)
│   │       ├── types.ts
│   │       ├── constants.ts
│   │       ├── hooks/              # UI orchestration (↔ handlers)
│   │       ├── components/
│   │       ├── __tests__/
│   │       └── README.md
│   ├── components/
│   │   └── ui/                     # Shared design system (Button, Input, …)
│   ├── hooks/                      # Shared hooks (not domain-specific)
│   ├── lib/                        # Pure utils (formatDate, cn, …)
│   ├── integrations/               # External boundaries
│   │   └── api/
│   │       └── client.ts           # ONLY snake_case ↔ camelCase transform
│   ├── routes/                     # Optional: route path constants
│   ├── types/                      # Shared frontend types
│   ├── test/                       # MSW handlers, render helpers, setup
│   ├── main.tsx
│   └── index.css
│
├── backend/                        # ── BACKEND (Fastify API) ──
│   └── src/
│       ├── server.ts               # Entry — listen()
│       ├── app.ts                  # buildApp() — register plugins + modules
│       ├── config/
│       │   └── env.ts              # Zod-validated environment variables
│       ├── plugins/                # Cross-cutting Fastify plugins
│       │   ├── auth.ts             # Session verification (Better Auth)
│       │   ├── db.ts               # Postgres pool
│       │   └── error-handler.ts    # Global error envelope
│       ├── lib/                    # Shared backend utilities
│       │   ├── errors.ts           # AppError class
│       │   └── audit.ts            # PHI audit helper
│       ├── db/
│       │   ├── migrations/         # YYYYMMDDHHMMSS_description.sql
│       │   └── seeds/              # Dev-only seed scripts
│       ├── modules/                # Vertical domain API modules
│       │   ├── platform/           # Shared: audit, health, internal utilities
│       │   │   └── health/
│       │   └── <domain>/           # e.g. admissions, beds, patients
│       │       ├── index.ts        # Plugin export — register in app.ts
│       │       ├── routes.ts       # Route table (≤150 lines)
│       │       ├── handlers.ts     # HTTP layer — no SQL
│       │       ├── service.ts      # Business logic + SQL (≤400 lines)
│       │       ├── schemas.ts      # Zod request/response
│       │       ├── constants.ts
│       │       ├── types.ts
│       │       ├── __tests__/
│       │       └── README.md       # Domain boundary + endpoints
│       └── __tests__/
│           └── integration/        # API + real Postgres (Testcontainers)
│
├── docker-compose.dev.yml          # Local Postgres (+ optional services)
├── package.json                    # Frontend root
├── vite.config.ts
├── tsconfig.json
├── eslint.config.js
└── README.md
```

---

## Domain alignment (critical)

Frontend and backend domains **must use the same names**:

| Domain | Backend module | Frontend feature |
|--------|----------------|------------------|
| Platform / health | `modules/platform/health/` | `features/health/` |
| Admissions | `modules/admissions/` | `features/admissions/` |
| Patients | `modules/patients/` | `features/patients/` |
| Beds | `modules/beds/` | `features/beds/` |

Agents and slice plans should reference both paths in the same slice.

---

## Parallel module files (FE ↔ BE)

Every domain uses the **same file roles** on both sides:

| Backend `modules/<domain>/` | Frontend `features/<domain>/` | Purpose |
|-----------------------------|-------------------------------|---------|
| `index.ts` | `index.ts` | Public exports / plugin entry |
| `routes.ts` | `routes.ts` | URL paths (API + app routes) |
| `handlers.ts` | `hooks/` + thin components | Orchestration layer |
| `service.ts` | `service.ts` | Domain logic (SQL vs pure TS) |
| `schemas.ts` | `schemas.ts` | Zod validation |
| `types.ts` | `types.ts` | TypeScript types |
| `constants.ts` | `constants.ts` | Enums, query keys |
| `components/` | — | — (frontend only) |
| — | `api.ts` | HTTP / React Query (maps to routes+handlers) |

**Rule:** When adding a domain, scaffold **all files** on both sides before implementing slice 1 — even as stubs.

---

## Module boundaries

```text
                    ┌─────────────────────────────────┐
                    │           app.ts                │
                    │  plugins: auth, db, errors      │
                    └───────────────┬─────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          ▼                         ▼                         ▼
   ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
   │ admissions  │          │  patients   │          │  platform   │
   │  module     │          │  module     │          │  (audit)    │
   └──────┬──────┘          └──────┬──────┘          └─────────────┘
          │                        │
          ▼                        ▼
      PostgreSQL              PostgreSQL
      (shared DB,             (shared DB,
       domain tables)          domain tables)
```

**Rules**

- Modules do **not** import each other's `service.ts` directly
- Shared logic → `lib/` or `modules/platform/`
- Cross-domain workflows → orchestrate in one module or a dedicated `orchestration` module

---

## Backend module file roles

| File | Responsibility |
|------|----------------|
| `index.ts` | Fastify plugin; exported for `app.ts` |
| `routes.ts` | URL + method + schema + preHandler wiring |
| `handlers.ts` | Extract user/request context; call service; set status |
| `service.ts` | Business rules, transactions, SQL |
| `schemas.ts` | Zod — snake_case field names |
| `constants.ts` | Enums, limits, magic strings |
| `types.ts` | Internal TS types (not wire types) |

---

## Frontend layer roles

| Layer | Responsibility |
|-------|----------------|
| `pages/` | Route target; layout; compose features |
| `features/` | Domain UI + hooks + API calls |
| `components/ui/` | Reusable primitives with no domain knowledge |
| `integrations/api/` | HTTP client, auth headers, case transform |

---

## Testing layout

| Layer | Location |
|-------|----------|
| Service unit tests | `backend/src/modules/<domain>/__tests__/` |
| Route tests | `backend/src/modules/<domain>/__tests__/routes.test.ts` |
| Integration | `backend/src/__tests__/integration/` |
| Component tests | `src/features/<domain>/__tests__/` |
| E2E | `e2e/<journey>.spec.ts` |
| Test factories | `backend/test/factories/` |

See [../test/testing-strategy.md](../test/testing-strategy.md).

---

## What NOT to put where

| Avoid | Put instead |
|-------|-------------|
| SQL in `handlers.ts` | `service.ts` |
| `fetch()` in components | `features/<domain>/api.ts` |
| Domain logic in `pages/` | `features/<domain>/` |
| Business logic in `plugins/` | domain `service.ts` |
| PHI in `lib/` log helpers | structured audit via `lib/audit.ts` |

---

## IPD example domains (healthcare)

Suggested modules/features as IPD grows:

```text
modules/platform/     → auth helpers, audit, health
modules/patients/       → patient demographics (PHI)
modules/admissions/     → admit, transfer, discharge
modules/beds/           → bed board, occupancy
modules/clinical/       → notes, orders (future)
```

Start with **platform/health** tracer bullet, then **admissions** slice 1.

---

## Related

- [modular-monolith-fastify-react.md](modular-monolith-fastify-react.md)
- [fastify-backend.md](fastify-backend.md)
- [react-frontend.md](react-frontend.md)
