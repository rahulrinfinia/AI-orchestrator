# Chore: Billing invoice routes — Fastify `schema` (response + params/query/body)

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Branch** | `chore/billing-invoices-response-schemas` (off `develop-l2`) |
| **Motivation** | HIS PR bar; OpenAPI for cashier/billing UI; avoid future 500s when tightening serialization |
| **Behavior change** | **None** — document + validate wire shapes only; keep legacy `{ error: string }` errors |

## Problem

`invoices.routes.ts` registers **11** routes with auth only — **no** `schema`. Handlers return rich JSON on success and plain errors like `{ error: 'Visit not found' }` (404/400/422). Pre-auth RCM already uses permissive `preAuth.schema.ts` + `preAuthErrorResponses`.

## Non-goals

- Normalizing billing errors to `{ error: { code, message } }` (separate chore / pairs with api-errors billing track).
- Full strict DTO schemas for every invoice field (use permissive objects like pre-auth).
- RCM claims/eligibility routes (fast follow).

## Solution

### 1. Constants — API base SSOT

In `rcm.constants.ts`:

```ts
export const BILLING_API_BASE = '/api/billing';
```

Build paths in `invoices.routes.ts` from `BILLING_API_BASE` (no repeated `/api/billing/...` literals).

### 2. New `invoices.schema.ts`

Mirror `preAuth.schema.ts` comment block. Exports:

| Export | Purpose |
|--------|---------|
| `billingObjectResponseSchema` | `{ type: 'object', additionalProperties: true }` — success payloads |
| `billingListResponseSchema` | list invoices, payments, org prices (object or array — match handler) |
| `billingLegacyErrorResponseSchema` | `{ error: string }` — matches `invoices.service.ts` today |
| `billingErrorResponses` | `{ 400, 404, 422: billingLegacyErrorResponseSchema }` (add 409 only if a handler returns it) |
| `billingEmptyResponseSchema` | `204` delete org-service-price |
| Query/body schemas | `invoiceListQuerySchema`, `generateInvoiceBodySchema`, `patchInvoiceBodySchema`, `recordPaymentBodySchema`, `upsertOrgServicePriceBodySchema`, `orgServicePriceListQuerySchema` — AJV **Title Case** `errorMessage` labels |

Params: reuse shared UUID param pattern or small `visitIdParamsSchema` / `invoiceIdParamsSchema`.

### 3. Wire all 11 routes

| Method | Path (from base) | Success | Errors |
|--------|------------------|---------|--------|
| POST | `/visits/:visitId/invoice` | 200 + 201 (handler uses both) | 404, 422 |
| GET | `/visits/:visitId/invoice` | 200 | 404 |
| GET | `/invoices` | 200 | — |
| PATCH | `/invoices/:id` | 200 | 404 |
| GET | `/org-service-prices` | 200 | — |
| POST | `/org-service-prices` | 201 | 400 |
| DELETE | `/org-service-prices/:id` | 204 | — |
| GET | `/visits/:visitId/bill` | 200 | 404 |
| POST | `/visits/:visitId/payments` | 201 | 400, 404 |
| GET | `/visits/:visitId/payments` | 200 | 404 |
| GET | `/today-summary` | 200 | — |

**Pattern:**

```ts
import { BILLING_API_BASE } from '../../rcm.constants.js';
import { billingErrorResponses, billingObjectResponseSchema, ... } from './invoices.schema.js';

fastify.post(`${BILLING_API_BASE}/visits/:visitId/invoice`, {
  preHandler: [...withOrgAuth],
  schema: {
    params: visitIdParamsSchema,
    body: generateInvoiceBodySchema,
    response: {
      200: billingObjectResponseSchema,
      201: billingObjectResponseSchema,
      ...billingErrorResponses,
    },
  },
}, generateVisitInvoiceHandler);
```

Audit `invoices.service.ts` once for any status not in the table; extend `billingErrorResponses` if needed.

### 4. Tests

- **Unit:** `invoices.schema.test.ts` — query/body validation messages (if non-trivial enums, e.g. `INVOICE_LIST_FILTER`).
- **Integration (minimal):** extend `api.integration.test.ts` or add `billing-invoices.integration.test.ts`:
  - `GET /api/billing/invoices` → 200 with org auth mock.
  - `POST .../payments` with invalid amount → **400** + `{ error: string }` (proves error schema + no 500).

```bash
cd projects/his-global-south/backend && npm run build && npm run test && npm run test:integration -- billing-invoices
```

### 5. Optional

- Include billing invoice paths in openapi sweep expectations if a test lists registered routes.

## Files touched (expected)

| File | Change |
|------|--------|
| `rcm.constants.ts` | `BILLING_API_BASE` |
| `billing/invoices/invoices.schema.ts` | **new** |
| `billing/invoices/invoices.routes.ts` | schemas + base paths |
| `billing/invoices/__tests__/invoices.schema.test.ts` | **new** (optional) |
| `__tests__/integration/billing-invoices.integration.test.ts` | **new** or extend existing |

## Risks

| Risk | Mitigation |
|------|------------|
| Success body missing fields vs strict schema | Use `additionalProperties: true` on success |
| 200 vs 201 on generate invoice | Declare **both** on POST |
| FE parses `error` as string | Do not change error shape in this chore |

## Done when

- [x] All 11 routes have `schema.response` for every status the handler sends.
- [x] Paths built from `BILLING_API_BASE`.
- [x] Existing `api.integration.test.ts` billing list routes exercised with schemas.
- [x] `npm run build`, unit + integration green.

## Approval

Approved: 2026-09-23 (implement on `chore/billing-schemas-api-errors-phase2`)
