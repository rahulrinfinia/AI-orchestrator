# HIS Global South — Coding Style & Patterns

Reference for developers and reviewers working in **`projects/his-global-south/`** (flowMD app clone).

This document consolidates the **fixed coding style and patterns** from hub rules, convention docs, and PR #47 review lessons. Use it as shared context for implementation and code review — not as a tick-box checklist.

**Target repo:** `projects/his-global-south/`  
**Last consolidated:** 2026-08-27

---

## 1. Architecture overview

flowMD is a **modular monolith**: one Fastify backend + one React frontend, split by domain modules (`platform`, `clinical`, `frontdesk`, `ipd`, `screening`, etc.).

```text
projects/his-global-south/
├── backend/src/
│   ├── build-app.ts              # register all module plugins
│   ├── modules/<domain>/         # vertical slices (routes → service → db)
│   └── db/migrations/
└── src/
    ├── integrations/api/client.ts  # ONLY snake_case ↔ camelCase boundary
    ├── routes/appRoutes.tsx        # app shell routes
    ├── ipd/                        # portable IPD module root
    ├── platform/                   # platform operator UI
    ├── pages/                      # thin page shells
    ├── components/                 # shared UI + domain controls
    └── modules/<domain>/index.ts   # barrel re-exports
```

**Layered backend flow:** `routes → controller/handler → service → db`  
**Layered frontend flow:** `pages → hooks → api/service → client.ts`

Do not invent a parallel folder tree. Extend existing modules.

---

## 2. Naming and API boundary

### Wire vs application types

| Layer | Case | Example |
|-------|------|---------|
| JSON on the wire (HTTP, backend handlers) | **snake_case** | `patient_id`, `first_name`, `triage_status` |
| TypeScript in React app | **camelCase** | `patientId`, `firstName`, `triageStatus` |
| Postgres columns | **snake_case** | same as wire |

**Single conversion point:** `src/integrations/api/client.ts`

- GET responses: `keysToCamel()`
- POST/PUT/PATCH bodies: `keysToSnake()`

Never read `row.patient_id` or `encounter.triage_status` in React components on API data. Never return camelCase from backend handlers.

### Dates and IDs

- Dates: ISO 8601 UTC (`2026-08-16T10:30:00Z`)
- IDs: UUID strings; path params use `format: uuid` in Fastify schema
- Booleans: `true` / `false` — not `0`/`1`

### Error envelope (all non-2xx)

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

Never expose stack traces or PHI in `message`.

### Paginated lists

```json
{
  "items": [],
  "page": 1,
  "page_size": 20,
  "total": 142,
  "total_pages": 8
}
```

List endpoints must return `total` (and correct page shape) when response schemas are enabled.

---

## 3. Constants — one source of truth

Domain literals are **never** hardcoded as raw strings in services, schemas, pgschema, UI, or query keys.

### Backend

```text
backend/src/modules/<mod>/<feature>/<feature>.constants.ts
```

Define both a `const` object and a `*_VALUES` array:

```typescript
export const ADMISSION_STATUS = {
  REQUESTED: 'requested',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
} as const;

export const ADMISSION_STATUS_VALUES = [
  ADMISSION_STATUS.REQUESTED,
  ADMISSION_STATUS.ACCEPTED,
  ADMISSION_STATUS.REJECTED,
] as const;
```

Use these for Fastify enum schemas, Drizzle CHECK constraints, and business logic comparisons.

### Frontend

Mirror backend values in:

```text
src/<mod>/constants/<feature>.ts     # domain + UI labels
src/<mod>/constants/index.ts         # paths / API bases only
```

Example: `src/ipd/constants/admissions.ts`

### Placement rules

| Scope | Backend | Frontend |
|-------|---------|----------|
| Module / feature | `modules/<mod>/<feature>.constants.ts` | `src/<mod>/constants/<feature>.ts` |
| Shared / global | `backend/src/config/constants.ts`, `env.ts` (env only) | `src/lib/queryKeys.ts`, route prefixes |

**Do not** put a `constants.ts` inside every feature/page folder.  
**Do not** dump module literals into `backend/src/config/` or `src/lib/` unless multiple modules share them.

### Comparisons

Never compare closed sets with raw strings:

```typescript
// Bad
if (dobInputMode === 'age') { ... }
if (registrationMode === 'emergency') { ... }

// Good
if (dobInputMode === DOB_INPUT_MODE.AGE) { ... }
if (isEmergencyRegistration(registrationMode)) { ... }
```

UI-only modes (`age`/`date`, filter sentinel `all`) are still constants.

### List filter sentinels

If the API treats a missing filter as a default (e.g. status defaults to `open`), the frontend must **send** the sentinel value (e.g. `all`) — do not strip it to `undefined`.

---

## 4. Types and mapping

### Type definitions

- Unions derive from constants: `(typeof FOO)[keyof typeof FOO]` — not loose `string`
- Types live in `*.types.ts` or `src/<mod>/types/` — **never export types from a component or service file**
- No `Record<string, unknown>` for request/response DTOs or API bodies

### Mapping layer

- Mapping lives in `*.mapping.ts`
- Do **not** re-export mapping helpers from service files
- Narrow DB `string` before use: `toOpdStatus(row.status)` in mapping, not at every call site

When tightening unions (`Gender`, document types, `*_VALUES`), grep call sites for:

- `.toLowerCase()` widening to `string`
- `?? ''` widening to `string`
- `z.string()` where a union is required
- Untyped `useState('literal')`

---

## 5. Backend — Fastify + Drizzle

### Module structure (large modules like `ipd`, `platform`, `clinical`)

```text
backend/src/modules/ipd/
├── index.ts                    # Fastify plugin; side-effect handlers if needed
├── ipd.constants.ts            # IPD_API_BASE = '/api/v1/ipd'
├── ipd.routes.ts               # aggregator — registers feature route modules
├── admissions/
│   ├── admissions.routes.ts
│   ├── admissions.controller.ts
│   ├── admissions.service.ts
│   ├── admissions.types.ts
│   └── admissions.schema.ts
└── pgschema/
    ├── index.ts
    └── ipd-admissions-request.pgschema.ts
```

**Reference implementations to copy:**

| Pattern | Path |
|---------|------|
| Plugin + routes | `backend/src/modules/platform/index.ts` |
| Routes + auth | `backend/src/modules/platform/facility/facility.routes.ts` |
| Controller + result union | `backend/src/modules/platform/facility/facility.controller.ts` |
| Service + Drizzle | `backend/src/modules/platform/facility/facility.service.ts` |
| pgschema | `backend/src/modules/platform/pgschema/beds.pgschema.ts` |

### Route rules

- Register modules in `backend/src/build-app.ts`: `await fastify.register(ipdPlugin)`
- Feature aggregators (`ipd.routes.ts`) register full paths — do not scatter IPD paths in `build-app.ts`
- Full paths: `/api/v1/ipd/admissions/requests` (no plugin prefix shortcuts)
- Auth: `{ preHandler: [...withOrgAuth] }` from `middleware/auth-prehandlers.ts`
- Controllers: thin — cast `OrgAuthRequest`, call service, set status
- Services: all Drizzle + business logic; import tables from `../pgschema/index.js`

### Fastify schemas (required on every route)

Schemas on **body, querystring, params, and response**:

```typescript
// admissions.schema.ts — define *ResponseSchema here
// admissions.routes.ts — wire all of them

app.post('/api/v1/ipd/admissions/requests', {
  schema: {
    body: CreateAdmissionBodySchema,
    response: {
      201: CreateAdmissionResponseSchema,
      403: ErrorResponseSchema,
      422: ErrorResponseSchema,
    },
  },
  preHandler: [...withOrgAuth],
  handler: createAdmissionHandler,
});
```

**Body-only validation is not enough.** When handler fields change, extend response schemas too — otherwise integration tests fail serialization checks.

Enums in schemas come from `*_VALUES` constants. Use `additionalProperties: false` on object schemas. UUID params: `format: uuid`.

### AJV human-readable messages

Custom `errorMessage` strings use **Title Case labels**, not snake_case keys:

| Good | Bad |
|------|-----|
| `First Name` | `first_name` |
| `Estimated Age (years)` | `estimated_age_years` |
| `Identification Number cannot be blank when provided` | `identification_number` |

Update `__tests__/*schema.test.ts` when message strings change.

### Drizzle / pgschema

- Table definitions in `modules/<mod>/pgschema/*.pgschema.ts` — mirror live Postgres; do not rename columns or FK names casually
- Defaults and CHECK constraints from constants
- CHECK via `sql.raw` / `textInArrayCheck` — **never** `${value}` inside `` sql`...` `` (Drizzle treats it as a bind param; Postgres rejects CHECK binds)
- Selects: `getTableColumns(table)`
- Joined rows: `InferSelectModel<typeof table> & { …aliases }`

### Migrations

- Location: `backend/src/db/migrations/NNN_description.sql`
- Workflow: edit pgschema → `npm run db:generate` → review → add migration
- Every migration includes `COMMENT ON` for tables and non-obvious columns
- PKs: UUID (`gen_random_uuid()`); timestamps: `TIMESTAMPTZ` UTC

### Service rules

- SQL and business logic **only** in `*.service.ts` — never in routes or controllers
- Parameterized queries only — no string interpolation for values
- Functions target ≤ 50 lines; extract helpers when longer
- `service.ts` file ≤ ~400 lines; `routes.ts` ≤ ~150 lines
- Multi-table writes in a transaction
- Throw domain errors with structured codes — no silent catch on user-facing actions

### Auth

- Better Auth session cookie ([ADR 0008](../decisions/his-global-south/0008-better-auth-session-cookie.md))
- Org scope via `withOrgAuth` / `scopeToOrg` middleware
- Role checks in service or dedicated helpers (`assertPlatformAdmin`, `requireRoles`, etc.)
- `platform_admin` stored in `user_roles.role` — seed/SQL only; not assignable from Org setup UI

---

## 6. Frontend — React module layout

### IPD portable module (current pattern)

```text
src/ipd/                        # portable root — copy this folder for new modules
  constants/index.ts            # UI + API paths only
  constants/admissions.ts       # domain + UI labels
  api/
  hooks/
  types/
  pages/
  routes.tsx
  index.ts
src/components/ipd/             # reusable controls; types in *.types.ts
src/modules/ipd/index.ts        # export * from '@/ipd'
```

### Routing

| Layer | Responsibility |
|-------|----------------|
| `src/routes/appRoutes.tsx` | App shell; lazy-mounts `@/ipd/routes`, `@/platform/routes` |
| `src/ipd/routes.tsx` | IPD sub-router |
| `src/ipd/pages/<feature>/routes.tsx` | Feature nested routes when needed |

**UI routes:** `/ipd`, `/ipd/admission`, `/ipd/admission/new`, `/ipd/admission/:id`  
**API routes:** `/api/v1/ipd/…` (version on API only, not on UI paths)

Do not use `/ipd/v1/*` for new screens. Do not re-add legacy redirects unless product asks.

If a URL is renamed, add `Navigate` redirects for old paths.

### Page and component rules

- Pages are thin (≤ ~100 lines) — compose hooks and components
- Data fetching and mutations in hooks — not in page components
- Shared pickers/controls in `src/components/<mod>/`
- All HTTP via `src/integrations/api/client.ts` — no raw `fetch` in components
- Server state: React Query; form state: React Hook Form + Zod
- UI primitives: `@/components/ui/*` only
- Page layout convention: `container mx-auto py-6 px-4 space-y-6`

### Imports

Pages import from `@/modules/ipd` or domain barrels — prefer hooks over deep `@/services/*` imports in pages.

---

## 7. Cross-module boundaries

| Need | Approach |
|------|----------|
| Patient search from IPD | Call `GET /api/frontdesk/patients` via service — do not import frontdesk internals |
| Auth context | Existing session — no IPD-specific auth plugin |
| Events | `orchestration/event-bus.ts` types |

**Forbidden:**

- Importing `clinical/visitPlan/service` or `platform/facility/service` internals from IPD
- Writing to `visit_admissions` / `beds` tables from IPD code without going through the owning module's service
- Modifying OPD modules for IPD-only work (except additive shared constants, e.g. extending `ADMISSION_TYPE`)

---

## 8. Domain-specific patterns

### Patient registration / identity

- Document types and nationality from **org identity profile (DB)** — not static JSON config files
- Emergency create and complete-registration are **separate flows**; completion promotes provisional → full
- `POST .../complete-registration` only when `registration_mode = emergency`; else `422` + `COMPLETION_NOT_PROVISIONAL`
- `validateIdentityForWrite`: identity optional when both type and number blank; use `identity?.` not `identity!`

### Platform admin

- Role: `platform_admin` in `user_roles` table (Postgres enum `app_role`)
- FlowMD operator — onboard hospitals, configure screening at `/platform/screening`
- Pure `platform_admin` (no `super_admin` / org admin): sidebar shows **Platform** group only (Hospitals, Screening)
- `super_admin` is hospital-internal admin — different role, same org scope

### Emergency triage (when touching clinical ED)

- Roles: `ed_nurse` (write triage), `ed_doctor` (read triaged queue + consultation)
- Triage saves lock after first save (`409` on second save)
- TEWS + priority computed on **backend** on save
- Screening (HIV/TB) uses `ScreeningAssessments` with phase `emergency_triage` — separate from fixed triage checklists

---

## 9. Testing patterns

| Layer | Location | Notes |
|-------|----------|-------|
| Schema unit tests | `__tests__/*schema.test.ts` | AJV message strings |
| Service unit | colocated or `modules/*/__tests__/` | Mock Drizzle |
| Integration | `backend/src/__tests__/integration/` | Real Postgres or structured mocks |
| Frontend components | colocated `__tests__/` | Vitest + Testing Library |

**Integration mock requirements** (when routes use response schemas + org auth):

- Mock org rows need `active: true` (+ `opd_enabled` / `ipd_enabled` as needed) or suspended-hospital middleware returns 403
- Pagination mocks need `total` and full page shape

**Frontend barrel tests** (`moduleExports`, `moduleBoundaries`): use **60s timeout** when importing `@/modules/*` registries under the full suite.

Test behavior, not implementation details.

---

## 10. Validation before merge (CI parity)

GitHub CI runs **`npx tsc -b`** on the full frontend project — not just Vite dev or Vitest.

| Changed | Run in `projects/his-global-south/` |
|---------|--------------------------------------|
| `src/**` | `npm run lint` then `npx tsc -b` |
| `backend/**` | `npm run build` in `backend/` |

A page that loads in dev can still fail CI if call sites widen unions to `string`.

---

## 11. Security baseline

- Auth on all non-public routes
- Org/patient scope on every query — prevent IDOR
- Parameterized SQL only
- No PHI in logs, error messages, or frontend storage
- No secrets in git
- Audit logging for PHI access where required (see `docs/conventions/hipaa.md`)
- Minimum necessary fields in API responses

---

## 12. File size limits (guidance)

| File | Target max lines |
|------|------------------|
| Page component | 100 |
| Feature component | 200 |
| `routes.ts` | 150 |
| `service.ts` | 400 |
| Function | 50 |

---

## 13. Anti-patterns (do not)

- Hardcode domain literals (`'open'`, `'pending'`, `'P1'`, `'emergency'`) outside constants files
- Body-only Fastify schemas without response schemas
- snake_case AJV labels (`first_name` in errorMessage)
- camelCase in backend JSON responses
- snake_case property access in React on API data
- `Record<string, unknown>` for typed API bodies
- Types exported from `.tsx` or service files
- SQL in routes/controllers
- `fetch()` outside `client.ts`
- Business logic in page components
- Grant `platform_admin` from hospital Org setup
- Modify OPD for IPD-only features
- `${value}` inside Drizzle `` sql`CHECK (...)` `` for enum checks
- Skip `npx tsc -b` because "the page loads"

---

## 14. Source documents (maintainers)

When updating this file, sync from:

| Source | Path |
|--------|------|
| Implement rules (canonical) | `.cursor/rules/his-implement-before-code.mdc` |
| PR #47 lessons | `.cursor/rules/his-pr-review-lessons.mdc` |
| CI gates | `.cursor/rules/his-match-ci-before-done.mdc` |
| HIS patterns | `docs/conventions/his-global-south-patterns.md` |
| Fastify backend | `docs/conventions/fastify-backend.md` |
| React frontend | `docs/conventions/react-frontend.md` |
| API design | `docs/conventions/api-design.md` |
| Modular monolith index | `docs/conventions/modular-monolith-fastify-react.md` |
| Architecture | `docs/architecture/his-global-south.md` |
| ADRs | `docs/decisions/his-global-south/` |

**Note:** Some older docs (e.g. `his-global-south-patterns.md` § Frontend) still mention `/ipd/v1` UI paths. The **current rule** is `/ipd/*` for UI and `/api/v1/ipd/*` for API — as fixed in `.cursor/rules/his-implement-before-code.mdc`.

---

*Share this file with colleagues as the single coding-context reference for his-global-south.*
