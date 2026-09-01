# HIS Global South — Complete Coding Rules

**Single reference** combining:

- **AI Orchestrator hub** — `.cursor/rules/`, `AGENTS.md`, `CLAUDE.md`, `.cursor/skills/`, `docs/conventions/*`
- **Application clone** — `projects/his-global-south/` + its own `CLAUDE.md` (all code changes happen here)

**Share this file with your team.** Works for **Cursor** and **Claude Code** — both read the same coding rules; entry points differ (see Part P).

**Last consolidated:** 2026-08-27

---

## Where rules live (source map)

| Layer | Location | Notes |
|-------|----------|-------|
| **Always-on Cursor rules (hub)** | `ai-orchestrator-workspace/.cursor/rules/*.mdc` | 4 files — should be mirrored in clone when present |
| **Cursor agent entry** | `AGENTS.md` (hub root) | Default project, workflow, rule index |
| **Claude Code entry (hub)** | `CLAUDE.md` (hub root) | Orchestrator workspace — plans/specs hub |
| **Claude Code entry (app clone)** | `projects/his-global-south/CLAUDE.md` | When working inside the app repo directly |
| **Cursor skills (hub)** | `.cursor/skills/*/SKILL.md` | Same workflows as agent commands (implement-slice, code-review, …) |
| **Conventions (hub)** | `docs/conventions/*.md` | Backend, frontend, API, security, HIS patterns |
| **ADRs (hub)** | `docs/decisions/his-global-south/` | Postgres, auth, audit, Drizzle, IPD naming |
| **Architecture (hub)** | `docs/architecture/his-global-south.md` | System overview |
| **Application code** | `projects/his-global-south/` | **Only place to implement** |
| **Slice specs (hub)** | `specs/features/his-global-south/` | Require **Approval** before implement |

> **Note:** The clone may also carry copies of `AGENTS.md`, `CLAUDE.md`, and `.cursor/rules/` — when present, they should match the hub. If only the hub has them, treat **this document + hub `.cursor/rules/`** as authoritative.

---

# Part A — Orchestrator workflow rules

## A.1 Where code goes

- **Implement in** `projects/his-global-south/` only — never a parallel tree in the hub repo.
- **Hub repo** holds PRDs, specs, slice status, reports, and these convention docs — not application code (except docs).

## A.2 Delivery workflow

```text
Approve slice spec (specs/features/… Approval filled)
  → implement in projects/his-global-south/
  → validate (lint + tsc -b / backend build)
  → PR to develop (only when user explicitly asks for git/PR)
  → update prd/…/slices/status.yaml
```

**Never implement without an approved slice spec.**

## A.3 Scope guards (orchestrator)

- **Never modify OPD modules for IPD-only work** (except additive shared constants you must extend, e.g. `ADMISSION_TYPE`).
- **Never grant `platform_admin`** from hospital Org setup UI — seed/SQL only.
- Read before IPD work: `docs/architecture/his-global-south.md`, `docs/conventions/his-global-south-patterns.md`.

---

# Part B — Git rules

**Source:** `.cursor/rules/no-git-without-explicit-approval.mdc`

**Do not** commit, push, create pull requests, or merge unless the user **explicitly asks** (e.g. "commit", "push", "open PR").

After implement work:

1. Implement in `projects/<name>/` only.
2. Tell the user what changed and where files live.
3. Stop — wait for explicit approval before any git write to remote.

**Allowed without asking:** `git status`, `git diff`, `git log`, local lint/tests.

**Not allowed unless user says so:** `git commit`, `git push`, `gh pr create`, force push, amend.

---

# Part C — CI / validation rules

**Source:** `.cursor/rules/his-match-ci-before-done.mdc`, `CLAUDE.md`

GitHub **Frontend — ESLint + tsc** fails on `npx tsc -b`, not on `npm run dev` or Vitest. Tightening unions (`Gender`, document types) may compile in Vite and still fail CI.

Run in **`projects/his-global-south/`**:

| You changed | Must run | Fail = not done |
|-------------|----------|-----------------|
| `src/**` | `npm run lint` then `npx tsc -b` | `TS2322`, `TS2345`, `TS2300` |
| `backend/**` | `npm run build` in `backend/` | Backend tsc errors |

**Do not** treat Vite, dev server, or unit tests alone as sufficient.

**After tightening constants / unions**, grep for:

- `.toLowerCase()` on typed values
- `?? ''` widening to `string`
- `z.string()` where union/enum required
- Untyped `useState(CONSTANT)`

Narrow with `toX()` in `*.mapping.ts` — do not pass raw `string` into `setValue` or API payloads.

**Do not** say "ready to push / PR / merge" until matching CI commands are green locally.

---

# Part D — Core implement rules (always apply)

**Source:** `.cursor/rules/his-implement-before-code.mdc`

Default clone: `projects/his-global-south/`. Do not invent a parallel tree.

## D.1 Constants (one source)

- Backend: `backend/src/modules/<mod>/<feature>/<feature>.constants.ts` — `const` objects **and** `*_VALUES` arrays.
- Frontend mirrors: `src/<mod>/constants/<feature>.ts` (e.g. `src/ipd/constants/admissions.ts`). Paths-only: `src/<mod>/constants/index.ts`.
- Do **not** put `constants.ts` inside every feature/page folder. Next feature → `src/ipd/constants/capacity.ts`, not `src/ipd/capacity/constants.ts`.
- Never hardcode `'open'`, `'walk_in'`, `'all'`, `'age'`, `'date'`, `'definite'`, CHECK arrays, or form option values in service / schema / pgschema / UI / `queryKeys`.
- Never compare closed sets with raw strings. Use `FOO.BAR` / `isX()` helpers. UI-only modes (`age`/`date`, `choose`) are still constants.
- Do not dump module literals into `backend/src/config/` or `src/lib/` (query keys may *read* feature constants).

## D.2 Types

- Unions from constants: `(typeof FOO)[keyof typeof FOO]` — not loose `string`.
- Types in `*.types.ts` / `src/<mod>/types/`. **Never export types from a component or service file.**
- No `Record<string, unknown>` for request/response DTOs or API bodies.
- Mapping in `*.mapping.ts` — **do not re-export from service**. Narrow DB `string` first (`toOpd…`).

## D.3 API + Drizzle

- Frontend TS = **camelCase**. Wire + backend JSON = **snake_case**. Convert **only** in `src/integrations/api/client.ts`.
- Fastify `schema` on **body, querystring, params, and response** (`:id` = `format: uuid`). Enums from `*_VALUES`. `additionalProperties: false`.
- AJV `errorMessage`: **Title Case labels** (`First Name`), not snake_case keys (`first_name`).
- Drizzle defaults and CHECKs from constants. CHECK via `sql.raw` / `textInArrayCheck` — **never** `${value}` inside `` sql`...` `` (bind param — Postgres rejects CHECK binds).
- Selects: `getTableColumns(table)`. Joined rows: `InferSelectModel<typeof table> & { …aliases }`.

## D.4 Frontend module layout (IPD and new modules)

```text
src/ipd/                  # portable root — copy this folder
  constants/index.ts      # UI + API paths only
  constants/admissions.ts # domain + UI labels
  api/  hooks/  types/  pages/  routes.tsx  index.ts
src/components/ipd/       # reusable controls; types in *.types.ts
src/modules/ipd/index.ts  # export * from '@/ipd'
```

- UI routes: `/ipd`, `/ipd/admission` — **no `/v1` on new screens**. API: `/api/v1/<mod>/…`.
- If you rename a URL, add legacy `Navigate` redirects (only when product needs legacy paths).
- Pages thin. Data in hooks. Shared pickers in `src/components/<mod>/`.
- List filter sentinel (`all`) must be **sent** to API — do not strip to `undefined` if service defaults missing param (e.g. `open`).

## D.5 Patient / identity (registration)

- Org identity profile drives document types and nationality — no hardcoded `national_id` or static country combobox.
- Emergency vs full registration are separate APIs/flows; completion promotes provisional → full.
- `complete-registration` only for `registration_mode = emergency` → else `422` `COMPLETION_NOT_PROVISIONAL`.
- `validateIdentityForWrite`: optional when both ID fields blank; `identity?.` only — not `identity!`.

## D.6 Implement — do not

- Modify OPD for IPD-only work (except additive shared constants).
- Grant `platform_admin` from Org setup UI.
- Commit/push unless user explicitly asks.

---

# Part E — PR #47 review bar (code quality)

**Source:** `.cursor/rules/his-pr-review-lessons.mdc`, `CLAUDE.md`

These are **mandatory patterns** learned from PR #47 — not optional.

## E.1 Fastify response schemas

- Every route: `schema.response` for success **and** every error status the handler returns.
- Define `*ResponseSchema` in `*.schema.ts`; wire in `*.routes.ts` — **not body-only**.
- New handler fields → extend response schemas or integration tests fail serialization.

## E.2 AJV human-readable messages

- Title Case labels, not snake_case keys.
- **Good:** `First Name`, `Estimated Age (years)`, `Identification Number cannot be blank when provided`
- **Bad:** `first_name`, `identifier_type`, `birth_date`
- Update `__tests__/*schema.test.ts` when messages change.

## E.3 Patient registration (backend guards)

- `POST .../complete-registration` only for provisional (`registration_mode = emergency`) → else `422` `COMPLETION_NOT_PROVISIONAL`.
- Document types / nationality from **org identity profile (DB)** — no `config/identity-profiles/*.json`.
- Identity optional when both type and number blank.

## E.4 IPD UI routes

- UI: `/ipd`, `/ipd/admission`, … — **not** `/ipd/v1/*`.
- API: `/api/v1/ipd/…` unchanged.
- Do not re-add `/ipd/v1` legacy redirects unless product asks.

## E.5 Integration test mocks

- Mock org: `active: true` (+ `opd_enabled` / `ipd_enabled` as needed) or suspended-hospital → **403**.
- Pagination mocks: include `total` and page shape or schema validation → **500**.

## E.6 Frontend tests

- Barrel tests (`moduleExports`, `moduleBoundaries`): **60s timeout** for `@/modules/*` in full suite.

---

# Part F — Backend conventions (Fastify + Drizzle)

**Source:** `docs/conventions/fastify-backend.md`, `his-global-south-patterns.md`

## F.1 Principles

- Functional modules — no class-based controllers; thin routes, fat `service.ts`.
- Layered flow: `routes → controller/handler → service → db`.
- Validate at boundary — Fastify/AJV schemas on every input.
- DB access in service only — never in routes/handlers.
- Wire format: JSON **snake_case**.
- One domain per module.

## F.2 Large module structure (IPD, platform, clinical)

```text
backend/src/modules/ipd/
├── index.ts                 # Fastify plugin
├── ipd.constants.ts         # IPD_API_BASE = '/api/v1/ipd'
├── ipd.routes.ts            # aggregator — feature route modules
├── admissions/
│   ├── admissions.routes.ts
│   ├── admissions.controller.ts
│   ├── admissions.service.ts
│   ├── admissions.types.ts
│   └── admissions.schema.ts
└── pgschema/
    ├── index.ts
    └── *.pgschema.ts
```

**Copy structure from:** `backend/src/modules/platform/facility/`, `backend/src/modules/platform/pgschema/beds.pgschema.ts`.

## F.3 Route rules

- Register in `backend/src/build-app.ts`: `await fastify.register(ipdPlugin)`.
- Full paths: `/api/v1/ipd/admissions/requests` — no plugin prefix shortcuts.
- Auth: `{ preHandler: [...withOrgAuth] }` from `middleware/auth-prehandlers.ts`.
- Controllers: thin — cast `OrgAuthRequest`, call service, set status.

## F.4 Handlers / services

- Handlers: parse validated input, call service, return — no SQL, no business rules.
- Services: Drizzle + business logic; import from `../pgschema/index.js`.
- SQL: always parameterized `$1, $2…` — never string interpolation for values.
- Functions ≤ 50 lines; `service.ts` ≤ ~400 lines; `routes.ts` ≤ ~150 lines.
- Multi-table writes in transactions.
- Throw structured domain errors — no silent catch on user actions.

## F.5 Auth

- Better Auth session cookie ([ADR 0008](../decisions/his-global-south/0008-better-auth-session-cookie.md)).
- Org scope via `withOrgAuth` / `scopeToOrg`.
- `platform_admin` in `user_roles.role` — assert via `assertPlatformAdmin()`; not assignable from product UI.

## F.6 Migrations

- Location: `backend/src/db/migrations/NNN_description.sql`.
- Workflow: edit pgschema → `npm run db:generate` → review → migration.
- Every migration: `COMMENT ON` tables and non-obvious columns.
- PKs: UUID; timestamps: `TIMESTAMPTZ` UTC; naming: snake_case.

## F.7 Logging

- Use `request.log` — user id ok; **no PHI**, no passwords, no full request bodies with patient data.

## F.8 Backend — do not

- SQL in routes/handlers.
- camelCase in API responses.
- Skip auth on mutations.
- `${value}` inside Drizzle `` sql`CHECK (...)` `` for enum checks.
- `any` without comment.

---

# Part G — Frontend conventions (React)

**Source:** `docs/conventions/react-frontend.md`, implement rules

## G.1 Principles

- Thin pages — compose hooks/components; no business logic in pages.
- Single API client — `src/integrations/api/client.ts`.
- App camelCase — transform only in client.
- Server state: React Query; form state: React Hook Form + Zod.
- UI primitives: `@/components/ui/*` only.
- WCAG 2.1 AA target.

## G.2 API client boundary

```text
GET  responses  → keysToCamel()
POST/PATCH bodies → keysToSnake()
```

- Feature `types.ts` uses camelCase.
- Never `fetch()` outside `client.ts`.
- Never read `patient_id` / snake_case on API data in components.

## G.3 Directory structure

**New modules (IPD pattern):** see Part D.4.

**Legacy OPD:** may use `src/pages/`, `src/services/`, `src/hooks/queries/` — match surrounding code when extending OPD.

```text
src/routes/appRoutes.tsx     # lazy-mounts @/ipd/routes, @/platform/routes
src/integrations/api/client.ts
src/lib/queryKeys.ts         # shared keys — may read feature constants
src/components/ui/           # design system
```

## G.4 Routing

| Layer | File |
|-------|------|
| App shell | `src/routes/appRoutes.tsx` |
| Module | `src/ipd/routes.tsx` |
| Feature | `src/ipd/pages/<feature>/routes.tsx` |

- UI: `/ipd/admission` — not `/ipd/v1/*`.
- Protected routes: `ProtectedRoute`; role gates: `RequireRole` where used.
- Lazy-load: `React.lazy(() => import('…'))`.

## G.5 Components

| Rule | Standard |
|------|----------|
| Page | ≤ ~100 lines |
| Feature component | ≤ ~200 lines |
| Function | ≤ ~50 lines |
| Loading/error | Required on data-fetching components |
| React keys | Stable ids — not array index on mutable lists |
| Layout | `container mx-auto py-6 px-4 space-y-6` |

## G.6 State

| Type | Tool |
|------|------|
| Server/API | React Query |
| Forms | React Hook Form + Zod |
| Auth profile | `useAuth()` |
| Permissions | `usePermissions()` |
| URL filters | search params |

Do not store server data in Context or Zustand.

## G.7 Forms

- Client validation for UX; server is source of truth.
- Field errors from 422 responses.
- Narrow enums before `setValue`.

## G.8 Accessibility

- Keyboard reachable controls; labels on inputs; `role="alert"` for errors; semantic HTML; contrast ≥ 4.5:1.

## G.9 Styling

- Tailwind + `@/components/ui/*`; no inline styles except dynamic values; mobile-first.

## G.10 Frontend security

- No PHI in localStorage/sessionStorage.
- Better Auth cookie session — no tokens in URLs.
- No secrets in Vite bundle.
- DOMPurify for rich HTML if needed.

## G.11 Frontend — do not

- Business logic in pages.
- Domain literals in `.tsx`.
- Types exported from components.
- Skip loading/error states.
- Skip `npx tsc -b`.

---

# Part H — API design

**Source:** `docs/conventions/api-design.md`

## H.1 Wire format

| Rule | Standard |
|------|----------|
| JSON keys | snake_case |
| Dates | ISO 8601 UTC |
| IDs | UUID strings |
| Null | `null`; omit optional absent fields on input |

## H.2 Error envelope (all non-2xx)

```json
{
  "error": {
    "code": "validation_error",
    "message": "Human-readable summary safe for UI",
    "details": []
  }
}
```

| code | HTTP |
|------|------|
| `validation_error` | 422 |
| `unauthorized` | 401 |
| `forbidden` | 403 |
| `not_found` | 404 |
| `conflict` | 409 |
| `internal_error` | 500 |

Never stack traces or PHI in `message`.

## H.3 Paginated lists

```json
{
  "items": [],
  "page": 1,
  "page_size": 20,
  "total": 142,
  "total_pages": 8
}
```

Query params snake_case. Max `page_size`: 100.

## H.4 HTTP methods

| Method | Use |
|--------|-----|
| GET | Read |
| POST | Create / actions |
| PATCH | Partial update |
| DELETE | Remove / soft-delete → 204 or 200 with `deleted_at` |

## H.5 Auth responses

- 401 not authenticated
- 403 authenticated but insufficient role/permission
- Document required roles in contracts/specs

## H.6 API — do not

- Return camelCase from API.
- Different error shapes per endpoint.
- Use 200 for errors.
- Expose sequential integer public IDs (use UUID).

---

# Part I — HIS-specific patterns (IPD & cross-module)

**Source:** `docs/conventions/his-global-south-patterns.md` (updated where superseded)

## I.1 Cross-module imports (IPD)

| Need | Approach |
|------|----------|
| Patient search | `GET /api/frontdesk/patients` via service — no frontdesk internals |
| Auth | Existing session — no IPD auth plugin |
| Events | `orchestration/event-bus.ts` |

**Forbidden:** importing `clinical/` or `platform/` service internals from IPD; writing to `visit_admissions` / `beds` from IPD without owning module's service.

## I.2 Constants placement summary

| Scope | Backend | Frontend |
|-------|---------|----------|
| Module/feature | `modules/<mod>/<feature>.constants.ts` | `src/<mod>/constants/<feature>.ts` |
| Shared/global | `backend/src/config/constants.ts`, `env.ts` | `src/lib/queryKeys.ts` |

## I.3 Platform admin

- Role: `user_roles.role = 'platform_admin'` (Postgres `app_role` enum).
- Seed/SQL only — not in Org setup role pickers.
- Pure platform admin: sidebar **Platform** only (Hospitals, Screening) unless also `super_admin` / org admin.

## I.4 Tests

| Layer | Location |
|-------|----------|
| Schema unit | `__tests__/*schema.test.ts` |
| Service | colocated / `modules/*/__tests__/` |
| Integration | `backend/src/__tests__/integration/` |
| Frontend | colocated `__tests__/` |

Test behavior, not implementation.

---

# Part J — Security & HIPAA (code-relevant)

**Source:** `docs/conventions/security.md`, `docs/conventions/hipaa.md`

## J.1 Baselines

- No secrets in git — env vars / secret managers.
- Auth on all non-public routes (Better Auth).
- Parameterized SQL only.
- Role/permission checks on mutations.
- Minimum necessary fields in API responses.
- HTTPS + secure cookies in production.

## J.2 PHI — never

- Log PHI to stdout, files, Sentry, APM.
- Put PHI in URL query strings.
- Cache PHI in localStorage/sessionStorage.
- Include PHI in error messages.

## J.3 PHI — required when touching clinical data

- Auth + authorization on new routes.
- Audit events on PHI read/write ([ADR 0004](../decisions/his-global-south/0004-audit-logging-for-phi-access.md)).
- Tests for forbidden access (403).
- Migration `COMMENT ON` for new PHI tables.
- Zod/Fastify validation on all inputs; max lengths on clinical text fields.

## J.4 OWASP API (summary)

- Prevent IDOR — org/patient scope on every query.
- Rate limit auth/write endpoints in production.
- CORS restricted to known origins in production.

---

# Part K — File size limits

**Source:** `docs/conventions/modular-monolith-fastify-react.md`

| File | Max lines |
|------|-----------|
| Page | 100 |
| Feature component | 200 |
| routes.ts | 150 |
| handlers.ts | 200 |
| service.ts | 400 |
| Function | 50 |

---

# Part L — Master anti-patterns list

- Hardcode domain literals outside constants files.
- Body-only Fastify schemas (missing `response`).
- snake_case AJV error labels.
- camelCase backend JSON / snake_case in React on API data.
- `Record<string, unknown>` for typed DTOs.
- Types exported from `.tsx` or service files.
- SQL outside `*.service.ts`.
- `fetch()` outside `client.ts`.
- `${value}` in Drizzle CHECK `` sql`...` ``.
- Modify OPD for IPD-only features.
- Grant `platform_admin` from Org setup.
- `/ipd/v1/*` on new UI screens.
- Skip `npx tsc -b` / `backend` build before saying done.
- Commit/push without explicit user request.
- Implement without approved slice spec.

---

# Part M — Quick validation commands

```bash
cd projects/his-global-south

# Frontend
npm run lint
npx tsc -b

# Backend
cd backend && npm run build

# Integration (when touching routes/schemas/mocks)
# run relevant tests in backend/
```

---

# Part N — Related ADRs (his-global-south)

| ADR | Topic |
|-----|-------|
| [0001](../decisions/his-global-south/0001-postgres-primary-data-store.md) | Postgres primary store |
| [0004](../decisions/his-global-south/0004-audit-logging-for-phi-access.md) | Audit logging for PHI |
| [0006](../decisions/his-global-south/0006-embedded-in-his-global-south.md) | Embedded in monolith |
| [0007](../decisions/his-global-south/0007-drizzle-pgschema-data-access.md) | Drizzle pgschema |
| [0008](../decisions/his-global-south/0008-better-auth-session-cookie.md) | Better Auth session |
| [0009](../decisions/his-global-south/0009-ipd-naming-and-versioning.md) | IPD naming (UI `/ipd/*`, API `/api/v1/ipd/*`) |

---

# Part P — Claude Code & Cursor agent rules

These are the **agent entry files** — what Claude Code and Cursor load before coding. The coding rules themselves are Parts B–L above; this section is the **operating procedure** for AI assistants.

## P.1 Cursor — `AGENTS.md` (hub root)

```markdown
# AI Orchestrator — Agent Entry

**Default project:** `his-global-south`
**Default feature (current work):** `ipd`

**Claude Code:** see CLAUDE.md — same rules as Cursor below.

## Cursor rules (always apply for HIS work)

1. `.cursor/rules/his-implement-before-code.mdc` — constants, types, schemas, layout
2. `.cursor/rules/his-pr-review-lessons.mdc` — PR #47 review bar
3. `.cursor/rules/his-match-ci-before-done.mdc` — lint + `tsc -b` before done
4. `.cursor/rules/no-git-without-explicit-approval.mdc` — no commit/push unless asked

## Before any IPD implement step

1. `docs/architecture/his-global-south.md` — project architecture
2. `docs/conventions/his-global-south-patterns.md` — code patterns
3. Slice spec: `specs/features/his-global-south/ipd-slice-N-*.md` with **Approval** filled
4. Clone: `projects/his-global-south/` per `repos.yaml`
5. Status: `prd/his-global-south/ipd/slices/status.yaml`

## Workflow

Approve slice spec → implement in projects/his-global-south/ → PR to develop
→ update prd/his-global-south/ipd/slices/status.yaml → reports/

**Never implement without approved slice spec. Never modify OPD modules for IPD work.**
```

## P.2 Claude Code — `CLAUDE.md` (hub / orchestrator workspace)

Use when the working directory is **`ai-orchestrator-workspace`** (hub + clone together):

```markdown
# AI Orchestrator — Claude Code entry

**Default app clone:** `projects/his-global-south/`
**Hub role:** plans, PRDs, specs, slice status — not application code (except docs).

## Before HIS implement work

1. Read `.cursor/rules/his-implement-before-code.mdc`
2. Read `.cursor/rules/his-pr-review-lessons.mdc` (PR #47 review bar)
3. Read `.cursor/rules/his-match-ci-before-done.mdc`
4. Read `.cursor/rules/no-git-without-explicit-approval.mdc`
5. Architecture: `docs/architecture/his-global-south.md`
6. Patterns: `docs/conventions/his-global-south-patterns.md`
7. Approved slice spec under `specs/features/his-global-south/` with **Approval** filled

## Where code lives

- Implement in `projects/his-global-south/` only — never a parallel tree in the hub.
- Git writes (commit/push/PR) only when the user explicitly asks.

## Validation (same as CI)

| Changed | Run in clone |
|---------|----------------|
| `src/**` | `npm run lint` then `npx tsc -b` |
| `backend/**` | `npm run build` in `backend/` + relevant tests |

Vite, dev server, and unit tests alone are **not** enough before saying done.

## PR review bar (do not regress)

- Fastify **response schemas** on every route — not body-only.
- Human-readable AJV messages (Title Case, not `first_name`).
- Patient complete-registration guarded for emergency/provisional only.
- IPD UI routes: `/ipd/*` — not `/ipd/v1/*`.
- Integration mocks: org `active: true`; pagination includes `total`.
```

## P.3 Claude Code — `CLAUDE.md` (app clone)

Use when the working directory is **`projects/his-global-south/`** only (app repo opened standalone):

```markdown
# HIS Global South — Claude Code entry

**Repo:** FlowMD / HIS Global South application (React + Vite + Fastify + Postgres).

## Cursor rules (always apply)

1. `.cursor/rules/his-implement-before-code.mdc` — constants, types, schemas, module layout
2. `.cursor/rules/his-pr-review-lessons.mdc` — PR #47 review bar
3. `.cursor/rules/his-match-ci-before-done.mdc` — lint + `tsc -b` before done
4. `.cursor/rules/no-git-without-explicit-approval.mdc` — no commit/push unless asked

## Validation (same as CI)

| Changed | Run |
|---------|-----|
| `src/**` | `npm run lint` then `npx tsc -b` |
| `backend/**` | `npm run build` in `backend/` + relevant tests |

## PR review bar (do not regress)

- Fastify **response schemas** on every route — not body-only.
- Human-readable AJV messages (Title Case, not `first_name`).
- Patient complete-registration guarded for emergency/provisional only.
- IPD UI routes: `/ipd/*` — not `/ipd/v1/*`.
- Integration mocks: org `active: true`; pagination includes `total`.

## Hub specs (when using ai-orchestrator workspace)

Plans and slice specs live in the hub repo under `specs/features/his-global-south/`
and `prd/his-global-south/`. Never implement without an approved slice spec.
```

## P.4 Cursor skills ↔ Claude workflows

In this monorepo, **Cursor skills** (`.cursor/skills/`) replace Claude Code slash commands. Key skills that enforce these rules:

| Skill | When to use | Enforces |
|-------|-------------|----------|
| `implement-slice` | Approved slice plan exists | Code in clone only; validation; no git unless asked |
| `convention-loader` | Before writing code | Loads relevant convention docs for touched files |
| `pre-review` | Before opening PR | `lint` + `tsc -b` / backend build |
| `his-pr-review` | Reviewing a his-global-south PR | All `.mdc` rules + PR #47 bar + checklist |
| `code-review` | Reviewing a PR (non-HIS / generic) | Spec + conventions + severity rubric |
| `pr-review` / `pr-review-implement` | Address review comments | Surgical fixes only |
| `plan-slice` | After slice approval in PRD | Detailed implement plan in `specs/features/` |

**Implement-slice agent rules (summary):**

- Implement only when `specs/features/…` has **Approval** section filled.
- Code changes in `projects/his-global-south/` only.
- Run CI-parity validation before saying done.
- Write report to `reports/` — do **not** commit or push unless user explicitly asks.

## P.5 Claude / Cursor — same rules, two entry points

| Question | Hub workspace | App clone only |
|----------|---------------|----------------|
| Read specs / PRD | Yes — `specs/`, `prd/` | Point to hub paths |
| Write app code | `projects/his-global-south/` | Repo root |
| `.cursor/rules/*.mdc` | Hub `.cursor/rules/` | Mirror from hub (or use this doc) |
| Git commit/push | Only when user explicitly asks | Same |

**For humans sharing with colleagues:** give them **`HIS-CODING-RULES-COMPLETE.md`** (this file) — it contains everything from `AGENTS.md`, both `CLAUDE.md` files, and all `.cursor/rules/` content expanded in Parts B–L.

---

# Part O — Document maintenance

When rules change, update **in this order**:

1. Hub `.cursor/rules/his-*.mdc` (always-on agent rules)
2. Hub `AGENTS.md`, hub `CLAUDE.md`, clone `projects/his-global-south/CLAUDE.md`
3. Relevant `docs/conventions/*.md`
4. **This file** (`HIS-CODING-RULES-COMPLETE.md`)
5. Optional mirrors: clone `.cursor/rules/` (4 `.mdc` files) matching hub

**Supersedes note:** Older docs (e.g. `his-global-south-patterns.md` § Frontend) may still mention `/ipd/v1` UI paths. **Current rule:** UI `/ipd/*`, API `/api/v1/ipd/*` — per `his-implement-before-code.mdc` and ADR 0009 intent.

---

*End of complete coding rules — share with colleagues as the single handbook for HIS Global South development.*
