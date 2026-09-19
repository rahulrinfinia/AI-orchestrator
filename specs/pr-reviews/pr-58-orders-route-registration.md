# PR #58 — Orders route registration refactor (MCH / clinicalForms pattern)

**Project:** `his-global-south`  
**Branch:** `feat/dra-radiology-inhouse-approval`  
**Reviewer:** @hemantinfinia — “Route register is not the correct here… I informed you the other approach” (MCH module reference)  
**Goal:** Reorganize route **registration only**. **Zero URL change. Zero handler/body/SQL change.**

---

## Non-negotiables

1. **Same public URLs** — every `Method + path` today must resolve identically after refactor.
2. **Same auth gates** — `preHandler`, `preValidation`, role checks unchanged per route.
3. **Same schemas** — params, body, response schemas copied verbatim (only moved between files).
4. **Same handlers** — no controller/service edits unless a import path moves with the route file.
5. **Same registration order for conflicting patterns** — static/literal segments before `/:id` (see §4).
6. **One batch at a time** — full verification gate after each batch; do not start next until green.
7. **Revert-friendly** — one git commit per batch.
8. **No stale imports** — `tsc -b` must pass; no unused imports left in touched files; `clinical/index.ts` still imports only `ordersRoutes`.

---

## Import & breakage prevention (run after every batch)

### Public entry points (must not change)

| Importer | Import | After refactor |
|----------|--------|----------------|
| `clinical/index.ts` | `ordersRoutes` from `./orders/orders.routes.js` | **Same** — only file path unchanged |
| Frontend / tests | Hard-coded `/api/clinical/orders/...` URLs | **No edits** |
| `orders.routes.ts` consumers | None (not imported elsewhere) | N/A |

New files are **internal** — nothing outside `orders/` imports `approval.routes.ts` or `radiologyReports.routes.ts` directly.

### Per-batch checklist

```sh
cd projects/his-global-south/backend

# 1) TypeScript — catches missing exports, wrong .js paths, stale imports
npx tsc -b

# 2) Lint — catches unused imports in touched route files
npm run lint:backend

# 3) No orphan imports in orders.routes.ts (manual / grep)
rg "from '\\./" src/modules/clinical/orders/orders.routes.ts
# Every import must be used in the file or re-exported

# 4) Handler symbols still resolve (grep consumers unchanged)
rg "submitItemForApprovalHandler|clearRadiologyReportUploadHandler" src --glob '*.ts'

# 5) Integration inject URLs unchanged (tests are the contract)
rg "/api/clinical/orders" src/__tests__/integration/orders-approval-radiology.integration.test.ts
```

### Stale-import rules

| Do | Don't |
|----|-------|
| Move schema imports **with** the route that uses them | Leave unused schema imports in `orders.routes.ts` |
| Import handlers only in the `*.routes.ts` that registers them | Import approval handlers in both `orders.routes.ts` and `approval.routes.ts` |
| Use `.js` extension on all relative imports | Add barrel `index.ts` re-exports unless needed |
| Keep `ordersRouteShared.ts` as leaf (no imports from route files) | Create circular imports between route plugins |

### If something breaks

| Symptom | Likely cause |
|---------|----------------|
| 404 on known URL | Wrong `prefix` or relative path |
| 500 serialization | Response schema unchanged but route not wired |
| `tsc` error "has no exported member" | Wrong export name on new plugin |
| Unused import lint | Schema/handler left in aggregator after move |

---

## Reference pattern (MCH → clinicalForms)

**Aggregator** (`clinicalForms.routes.ts`):

```typescript
await fastify.register(
  async (forms) => {
    await forms.register(ancEpisodesRoutes, { prefix: '/episodes/anc' });
    await forms.register(labourCareRoutes, { prefix: '/episodes/labour' });
  },
  { prefix: '/api/clinical-forms' },
);
```

**Sub-plugin** (`labourCare.routes.ts`):

```typescript
export const labourCareRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/', {
    ...write,
    schema: { body: ..., response: { 201: ... } },
    handler: controller.createLabourEpisodeHandler,
  });
};
```

**Key differences from current `orders.routes.ts`:**

| MCH / clinicalForms | Current orders |
|---------------------|----------------|
| `fastify.register(plugin, { prefix })` | `fastify.delete(\`${ORDERS_API_BASE}/...\`, opts, handler)` |
| Relative paths (`/:reportId/upload`) | Full path on every line |
| `handler:` inside options object | Handler as 3rd positional argument |
| `FastifyPluginAsync` sub-plugins | Single `ordersRoutes` function |

---

## Current route inventory (must match exactly after refactor)

Base: `ORDERS_API_BASE = '/api/clinical/orders'` (`clinical.constants.ts`)

| # | Method | Full path | Handler | Auth | Notes |
|---|--------|-----------|---------|------|-------|
| — | GET | `/api/clinical/encounters/:id/pa-context` | `getPaContextHandler` | `withOrgAuth` | Outside orders base — keep in aggregator or `ordersPa.routes.ts` |
| — | POST | `/api/clinical/encounters/:id/pa-reasoning` | `paReasoningHandler` | `withOrgAuth` | Same |
| 1 | POST | `/api/clinical/orders` | `createDiagnosticOrderHandler` | clinicalOnly | |
| 2 | PATCH | `/api/clinical/orders/:id/items` | `appendOrderItemsHandler` | clinicalOnly | |
| 3 | GET | `/api/clinical/orders/by-barcode/:code` | `lookupOrderByBarcodeHandler` | withOrgAuth + schema | **Before `/:id`** |
| 4 | GET | `/api/clinical/orders` | `listDiagnosticOrdersHandler` | withOrgAuth + schema | |
| 5 | POST | `/api/clinical/orders/items/:itemId/specimen-barcode` | `generateSpecimenBarcodeHandler` | labOnly + schema | |
| 6 | POST | `/api/clinical/orders/items/:itemId/report-documents` | `linkReportDocumentHandler` | clinicalOnly + schema | |
| 7 | GET | `/api/clinical/orders/items/:itemId/report-documents` | `listReportDocumentsHandler` | withOrgAuth + schema | |
| 8 | POST | `/api/clinical/orders/items/:itemId/radiology-report` | `upsertRadiologyReportHandler` | clinicalOnly + schema | **Batch 1** |
| 9 | POST | `/api/clinical/orders/radiology-report/:reportId/upload` | `linkRadiologyReportUploadHandler` | clinicalOnly + schema | **Batch 1 — reviewer thread** |
| 10 | DELETE | `/api/clinical/orders/radiology-report/:reportId/upload` | `clearRadiologyReportUploadHandler` | clinicalOnly + schema | **Batch 1 — reviewer thread** |
| 11 | POST | `/api/clinical/orders/items/:itemId/status` | `advanceOrderItemStatusHandler` | clinicalOnly + schema | |
| 12 | GET | `/api/clinical/orders/:id` | `getDiagnosticOrderHandler` | withOrgAuth + schema | **After literals** |
| 13 | PUT | `/api/clinical/orders/:id` | `updateDiagnosticOrderHandler` | clinicalOnly | |
| 14 | POST | `/api/clinical/orders/:id/cancel` | `cancelDiagnosticOrderHandler` | clinicalOnly | |
| 15 | POST | `/api/clinical/orders/:id/results` | `enterOrderResultsHandler` | clinicalOnly + schema | |
| 16 | PATCH | `/api/clinical/orders/items/:itemId/send-out` | `patchSendOutStatusHandler` | clinicalOnly + schema | |
| 17 | POST | `/api/clinical/orders/items/:itemId/submit-for-approval` | `submitItemForApprovalHandler` | clinicalOnly + schema | **Batch 1** |
| 18 | POST | `/api/clinical/orders/items/:itemId/approve` | `approveItemHandler` | clinicalOnly + schema | **Batch 1** |
| 19 | POST | `/api/clinical/orders/items/:itemId/reject` | `rejectItemHandler` | clinicalOnly + preValidation + schema | **Batch 1** |

**Total: 21 route registrations** (2 PA + 19 under orders base).

---

## Target file layout

```
backend/src/modules/clinical/orders/
├── orders.routes.ts              # Aggregator only (like clinicalForms.routes.ts)
├── ordersRouteShared.ts          # clinicalOnly, labOnly, read pre configs (optional leaf)
├── ordersPa.routes.ts            # pa-context + pa-reasoning (Batch 2)
├── ordersCore.routes.ts          # #1–4, #12–15 (Batch 2)
├── orderItems.routes.ts          # #5–7, #11, #16 (Batch 2)
├── approval.routes.ts            # #17–19 (Batch 1) ← pairs with approval.controller.ts
└── radiologyReports.routes.ts    # #8–10 (Batch 1) ← pairs with radiologyReports.service.ts
```

`clinical/index.ts` **unchanged** — still `await ordersRoutes(fastify)`.

---

## Aggregator shape (final state)

```typescript
// orders.routes.ts
export async function ordersRoutes(fastify: FastifyInstance): Promise<void> {
  await ordersPaRoutes(fastify); // full paths — not under ORDERS_API_BASE

  await fastify.register(
    async (orders) => {
      // Order matters — see §4
      await orders.register(orderItemsRoutes, { prefix: '/items' });
      await orders.register(radiologyReportsRoutes, { prefix: '/radiology-report' });
      await orders.register(ordersByBarcodeRoutes, { prefix: '/by-barcode' });
      await orders.register(approvalRoutes, { prefix: '/items' });
      await orders.register(ordersCoreRoutes);
    },
    { prefix: ORDERS_API_BASE },
  );
}
```

---

## Batch 1 — Approval + radiology (addresses PR comment)

**Scope:** Routes #8–10, #17–19 + aggregator skeleton.  
**Touches:** 3 new files, refactor `orders.routes.ts` to register Batch 1 plugins; **legacy routes stay inline temporarily** OR move in same commit if low risk.

### 1a. `approval.routes.ts`

```typescript
export const approvalRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/:itemId/submit-for-approval', {
    ...clinicalOnly,
    schema: { params: orderItemIdParamsSchema, response: { ... } },
    handler: submitItemForApprovalHandler,
  });
  fastify.post('/:itemId/approve', { ... });
  fastify.post('/:itemId/reject', {
    ...clinicalOnly,
    preValidation: [trimRejectReasonPreValidation],
    schema: { params: ..., body: rejectApprovalBodySchema, response: { ... } },
    handler: rejectItemHandler,
  });
};
```

Prefix: `/items` → resolves to `/api/clinical/orders/items/:itemId/...` ✓

### 1b. `radiologyReports.routes.ts`

Two path groups under one file (registered with two prefixes from aggregator):

**Register A** — `{ prefix: '/items' }`:

| Relative | Method | Handler |
|----------|--------|---------|
| `/:itemId/radiology-report` | POST | `upsertRadiologyReportHandler` |

**Register B** — `{ prefix: '/radiology-report' }`:

| Relative | Method | Handler |
|----------|--------|---------|
| `/:reportId/upload` | POST | `linkRadiologyReportUploadHandler` |
| `/:reportId/upload` | DELETE | `clearRadiologyReportUploadHandler` |

→ `/api/clinical/orders/radiology-report/:reportId/upload` ✓

### Batch 1 gate

```sh
cd projects/his-global-south/backend
npm test -- --run approval orders
npm run test:integration -- orders-approval-radiology
npx tsc -b && npm run lint:backend
```

| Check | Expected |
|-------|----------|
| `approval.service.test.ts` | 12/12 |
| `orders-approval-radiology.integration.test.ts` | 17/17 |
| Frontend callers | **no edits** — URLs unchanged |

**Optional route dump (before/after diff):**

```sh
# Add temporary script or one-off in test:
# app.printRoutes() — compare Method+URL list includes all 21 entries
```

**Commit:** `refactor(orders): MCH-style route plugins for approval and radiology`

---

## Batch 2 — Remaining orders routes (full consistency)

Move routes #1–7, #11–16 + PA routes into sub-plugins. Remove inline `fastify.*` from aggregator.

| File | Routes |
|------|--------|
| `ordersCore.routes.ts` | POST `/`, GET `/`, PATCH `/:id/items`, GET `/:id`, PUT `/:id`, POST `/:id/cancel`, POST `/:id/results` |
| `orderItems.routes.ts` | `/:itemId/specimen-barcode`, report-documents GET/POST, `/:itemId/status`, `/:itemId/send-out` |
| `ordersByBarcode.routes.ts` | GET `/:code` (prefix `/by-barcode`) |
| `ordersPa.routes.ts` | pa-context, pa-reasoning (full `/api/clinical/encounters/...` paths) |

Convert every remaining route to `handler:` in options (no 3rd positional arg).

### Batch 2 gate

```sh
npm test
npm run test:integration
npx tsc -b && npm run lint:backend
```

| Check | Expected |
|-------|----------|
| Unit tests | 461/461 |
| Integration | 100/100 |
| `api.integration.test.ts` | orders list probe still passes |
| `clinical-service-surface.integration.test.ts` | still passes |

**Commit:** `refactor(orders): MCH-style route plugins for core and item routes`

---

## §4 — Route order (critical — do not break)

Fastify matches in registration order. **`GET /:id` must stay after all literal first segments.**

Safe plugin registration order under `ORDERS_API_BASE`:

1. `/items/*` (orderItems + approval — no conflict; different suffix paths)
2. `/radiology-report/*`
3. `/by-barcode/*`
4. `/` core routes last among literals — within `ordersCoreRoutes`:
   - `GET /by-barcode` is separate plugin ✓
   - Register `GET /` (list) before `GET /:id`
   - Register `PATCH /:id/items` before `GET /:id` (both have `:id` but different structure)

**Verify:** `GET /api/clinical/orders/by-barcode/ABC123` still hits barcode handler, not `getDiagnosticOrderHandler`.

---

## What must NOT change

| Layer | Change allowed? |
|-------|-----------------|
| Public URLs | ❌ No |
| Request/response JSON shape | ❌ No |
| Handler function bodies | ❌ No |
| Service / SQL | ❌ No |
| Frontend `src/services/*` | ❌ No edits |
| `clinical/index.ts` import | ❌ Still `ordersRoutes` only |
| OpenAPI tags | ❌ No change unless auto-generated from routes |

---

## Frontend / test callers (sanity — no edits needed)

All hard-coded paths must keep working:

| Consumer | Paths used |
|----------|------------|
| `ordersWorkspace/approval.ts` | submit / approve / reject |
| `ordersWorkspace/radiologyReportEntry.ts` | radiology-report POST, upload POST/DELETE |
| `orders.service.ts` | core CRUD, report-documents, barcode, send-out |
| `orders-approval-radiology.integration.test.ts` | all DRA + radiology paths |

---

## Rollback

```sh
git revert HEAD   # per batch
# or
git checkout -- backend/src/modules/clinical/orders/*.routes.ts
```

If integration tests fail with 404 → almost always **wrong prefix**, **wrong relative path**, or **plugin registration order**.

---

## PR reply template (after Batch 1)

> Refactored orders route registration to match MCH/clinicalForms: sub-plugins via `fastify.register` + prefix, relative paths, `handler` in route options. Split `approval.routes.ts` and `radiologyReports.routes.ts`. All URLs and schemas unchanged; integration tests green.

---

## Approval

- [ ] Human approves this plan before implement

**Implement with:** agent on `projects/his-global-south/` — Batch 1 first, gate, then Batch 2.

**Plan path:** `specs/pr-reviews/pr-58-orders-route-registration.md`
