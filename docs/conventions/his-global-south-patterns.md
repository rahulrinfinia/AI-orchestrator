# his-global-south — IPD implementation patterns

> **Use this doc for every IPD slice.** Mirror existing OPD conventions on `develop` — do not invent a parallel structure.

**Target repo:** `projects/his-global-south/` (clone of `apeiro-care/his-global-south`)

---

## Backend — large module pattern

IPD = one large module like `platform/` or `clinical/`.

```text
backend/src/modules/ipd/
├── index.ts                 # fp plugin; import './handlers.js' side-effect
├── ipd.constants.ts         # IPD_API_BASE = '/api/v1/ipd'
├── ipd.routes.ts            # aggregator — calls admissions/capacity route modules
├── ipd.schema.ts            # optional shared Fastify schemas
├── handlers.ts              # serverEventBus listeners (like frontdesk/handlers.ts)
├── README.md
├── admissions/
│   ├── admissions.routes.ts
│   ├── admissions.controller.ts
│   ├── admissions.service.ts
│   ├── admissions.types.ts
│   └── admissions.schema.ts   # optional
├── capacity/
│   └── … (same 4–5 files)
└── pgschema/
    ├── index.ts
    └── ipd-admissions-request.pgschema.ts   → pgTable("ipd_admissions_request", …)
```

### Reference slices (copy structure from)

| Pattern | Path |
|---------|------|
| Plugin + feature routes | `backend/src/modules/platform/index.ts` |
| Routes + auth | `backend/src/modules/platform/facility/facility.routes.ts` |
| Controller + result union | `backend/src/modules/platform/facility/facility.controller.ts` |
| Service + Drizzle | `backend/src/modules/platform/facility/facility.service.ts` |
| Event handlers | `backend/src/modules/frontdesk/index.ts` + `handlers.ts` |
| pgschema | `backend/src/modules/platform/pgschema/beds.pgschema.ts` |

### Rules

- Register in `backend/src/build-app.ts`: `await fastify.register(ipdPlugin)`
- **`ipd.routes.ts` is the route aggregator** — registers health + calls feature route registrars (`admissionsRoutes`, `capacityRoutes`, …). Do **not** put IPD HTTP paths in `build-app.ts` or other OPD modules.
- Routes use **full paths**: `/api/v1/ipd/admissions/requests` (no plugin prefix shortcut)
- Auth: `{ preHandler: [...withOrgAuth] }` from `middleware/auth-prehandlers.ts`
- Controllers: thin — cast `OrgAuthRequest`, call service, set status
- Services: all Drizzle + business logic; import tables from `../pgschema/index.js`
- JSON responses: **snake_case** (matches DB columns)
- Migrations: `backend/src/db/migrations/NNN_description.sql` only — edit pgschema → `npm run db:generate` → review → add migration
- **Constants:** module-specific → module ke andar; shared/global → centralized (see below)

---

## Frontend pattern

```text
src/routes/
├── appRoutes.tsx                # OPD + global — ONE IPD mount only (see routing section)
└── ipdRoutes.tsx                # IPD entry — delegates to v1 router

src/pages/ipd/v1/
├── constants.ts                 # IPD_UI_BASE = '/ipd/v1'
├── routes.tsx                   # v1 sub-router — owns everything under /ipd/v1/*
├── index.tsx                    # v1 home / dashboard shell
├── admissions/
│   ├── routes.tsx               # optional: admissions/* sub-router (Slice 4+)
│   ├── index.tsx
│   ├── types.ts
│   ├── constants.ts
│   └── components/
└── capacity/
    ├── routes.tsx               # optional: capacity/* sub-router (Slice 6+)
    └── …

src/services/ipd.service.ts
src/services/ipd-admissions.service.ts
src/services/ipd-capacity.service.ts
src/hooks/queries/useIpdAdmissions.ts
src/modules/ipd/index.ts           # barrel re-exports only
```

### IPD routing (locked — IPD only; do not refactor OPD)

**Rule:** `appRoutes.tsx` stops at **`/ipd/v1/*`**. All IPD pages and nested paths are registered inside IPD route modules — **never** add `/ipd/v1/admissions`, `/ipd/v1/capacity`, etc. directly to `appRoutes.tsx`.

| Layer | File | Responsibility |
|-------|------|----------------|
| App shell | `src/routes/appRoutes.tsx` | Single mount: `<Route path="/ipd/v1/*" element={<IpdRoutes />} />` — **no other IPD paths** |
| IPD entry | `src/routes/ipdRoutes.tsx` | Re-exports / wraps `IpdV1Routes` — version boundary lives here |
| v1 router | `src/pages/ipd/v1/routes.tsx` | `<Routes>` for index, `admissions/*`, `capacity/*`, … |
| Feature router | `src/pages/ipd/v1/<feature>/routes.tsx` | Optional when a feature has many child paths |

**Path ownership:**

```text
appRoutes.tsx          →  /ipd/v1/*
ipdRoutes.tsx          →  (delegates to v1)
pages/ipd/v1/routes.tsx →  /  |  admissions/*  |  capacity/*  |  …
pages/ipd/v1/admissions/routes.tsx →  (only if admissions has deep nesting)
```

**Example — app shell (only IPD touch in `appRoutes.tsx`):**

```tsx
const IpdRoutes = lazy(() =>
  import('@/routes/ipdRoutes').then((m) => ({ default: m.IpdRoutes })),
);

// inside provider layout <Routes>:
<Route path="/ipd/v1/*" element={<IpdRoutes />} />
```

**Example — v1 module router (`src/pages/ipd/v1/routes.tsx`):**

```tsx
export function IpdV1Routes() {
  return (
    <Routes>
      <Route index element={<IpdV1HomePage />} />
      <Route path="admissions/*" element={<IpdAdmissionsRoutes />} />
      <Route path="capacity/*" element={<IpdCapacityRoutes />} />
    </Routes>
  );
}
```

**Example — constant (`src/pages/ipd/v1/constants.ts`):**

```typescript
export const IPD_UI_BASE = '/ipd/v1';
```

**Do not:**

- Add individual IPD sub-routes to `appRoutes.tsx`
- Refactor existing OPD/portal/terminology routes to match this pattern
- Put IPD route tables in `src/modules/ipd/` (routes live under `src/routes/` + `src/pages/ipd/`)

**Sidebar:** link to `IPD_UI_BASE` or `/ipd/v1` only — feature nav inside IPD pages can add sub-links later.

### Reference slices

| Pattern | Path |
|---------|------|
| Page orchestrator | `src/pages/bedManagement/index.tsx` |
| Service + api client | `src/services/beds.service.ts` |
| Query hooks | `src/hooks/queries/useBeds.ts` |
| Query keys | `src/lib/queryKeys.ts` → `beds` section |
| App routes (OPD) | `src/routes/appRoutes.tsx` |
| **IPD routes** | **`src/routes/ipdRoutes.tsx` + `src/pages/ipd/v1/routes.tsx`** |
| Sidebar | `src/components/layout/AppSidebar.tsx` |
| Module barrel | `src/modules/ipd/index.ts` |

### Rules

- Pages import from `@/modules/ipd` or `@/modules/frontdesk` — not deep `@/services/*` in pages (prefer hooks)
- API base: `/api/v1/ipd/…`; UI routes: `/ipd/v1/…`
- `api` from `@/integrations/api/client.ts` — camelCase in TS, snake on wire
- Layout: `container mx-auto py-6 px-4 space-y-6`
- UI primitives: `@/components/ui/*` only
- **Constants:** feature/page constants → `src/pages/ipd/v1/<feature>/constants.ts`; cross-app → centralized (see below)

---

## Constants placement (rule of thumb)

> **Module-specific constants → module ke andar. Shared/global constants → centralized.**

Do not dump domain literals in `backend/src/config/` or `src/lib/` unless more than one module (or frontend + backend contract) needs them.

| Scope | Backend | Frontend |
|-------|---------|----------|
| **Module / feature** | `backend/src/modules/<module>/<module>.constants.ts` or `modules/ipd/admissions/admissions.constants.ts` | `src/pages/ipd/v1/<feature>/constants.ts` or `src/modules/ipd/` barrel |
| **Shared / global** | `backend/src/config/constants.ts`, `backend/src/config/env.ts` (env vars only) | `src/lib/queryKeys.ts`, `src/config/constants.ts` (if present), app-wide route prefixes |

**Module-specific (keep inside IPD):**

```typescript
// backend/src/modules/ipd/ipd.constants.ts
export const IPD_API_VERSION = 'v1';
export const IPD_API_BASE = `/api/${IPD_API_VERSION}/ipd`;

export const IPD_EVENT = {
  ADMISSION_ACCEPTED: 'ipd.admission.accepted',
  BED_ASSIGNED: 'ipd.bed.assigned',
  BED_RELEASED: 'ipd.bed.released',
} as const;

export const IPD_ADMISSION_STATUS = {
  REQUESTED: 'requested',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
} as const;
```

```typescript
// frontend — src/pages/ipd/v1/constants.ts or feature constants.ts
export const IPD_UI_BASE = '/ipd/v1';
```

**Centralized (only when shared):**

```typescript
// backend/src/config/constants.ts — CORS dev origins, listen fallbacks, app-wide non-env literals
// NOT: IPD admission statuses, bed types, event names
```

```typescript
// src/lib/queryKeys.ts — add ipd section when multiple hooks share keys
export const queryKeys = {
  // …
  ipd: {
    admissions: (orgId: string) => ['ipd', 'admissions', orgId] as const,
  },
};
```

**Anti-patterns:** `IPD_API_BASE` in `build-app.ts`; admission status strings inline in service; duplicating the same literal in three page files instead of one feature `constants.ts`.

---

## Cross-module imports (IPD)

| Need | Import from |
|------|-------------|
| Patient search | Call `GET /api/frontdesk/patients` via service — do not import frontdesk service internals |
| Auth context | Existing session — no IPD auth plugin |
| Event types | `orchestration/event-bus.ts` types for `admission.advised` |

**Forbidden:** importing `clinical/visitPlan/service`, `platform/facility/service`, or writing to `visit_admissions` / `beds` tables from IPD code.

---

## Tests (match repo)

| Layer | Location |
|-------|----------|
| Service unit | colocated or `modules/ipd/__tests__/` |
| Integration smoke | `backend/src/__tests__/integration/api.integration.test.ts` — add IPD health probe |
| Frontend | `src/pages/__tests__/` smoke optional per slice |

---

## Cursor rules in target repo

Follow existing rules under `his-global-south/.cursor/rules/`:

- `backend-architecture.mdc`
- `frontend-architecture.mdc`
- `api-boundary.mdc`
- `schema-comments.mdc`
