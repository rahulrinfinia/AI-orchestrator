# Chore: `api-errors` catalog — orders module phase 2 (complete clinical orders)

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Branch** | `chore/api-errors-orders-catalog-phase-2` (off `develop-l2`; can stack after billing schemas PR) |
| **Motivation** | SSOT for order workflow errors; stop duplicating status/code/message at ~46 `OrderServiceError` throw sites |
| **Behavior change** | **None** — same HTTP status, `error.code`, and user-facing `message` as today |

## Problem

Phase 1 wired **402/403 payment + pre-auth** via `API_ERROR_CATALOG` + `orderWorkflowGuards.ts`. Remaining order errors still use:

```ts
throw new OrderServiceError(status, SOME_CONSTANT, 'literal message');
```

Constants live in `clinical.constants.ts` (`APPROVAL_ERROR`, `RADIOLOGY_REPORT_ERROR`, `ORDER_SEND_OUT_ERROR`, …). Controllers already serialize via `sendOrderServiceError` → nested `{ error: { code, message, details: [] } }`.

**Out of scope for this chore:** billing `{ error: string }`, frontdesk, RCM `PA_ERRORS` (keep separate).

## Non-goals

- Renaming existing `error.code` strings (e.g. keep `not_found`, `APPROVAL_INVALID_STATE`).
- Migrating dynamic messages (pre-auth templates stay on `buildPreAuthPendingMessage` + `sendApiErrorResponse`).
- Adding response schemas to every orders route (only touch routes if a new status appears — unlikely).

## Solution

### 1. Extend `shared/api-errors/catalog.ts`

Add catalog keys grouped by domain (names illustrative — grep throws for exact copy):

| Group | Example keys | Typical status |
|-------|----------------|----------------|
| Approval | `ORDER_APPROVAL_NOT_FOUND`, `ORDER_APPROVAL_INVALID_STATE`, … | 404, 409, 422, 403 |
| Radiology report | `ORDER_RAD_REPORT_*` | 404, 409, 422 |
| Send-out | `ORDER_SEND_OUT_*` | 404, 422 |
| Specimen / barcode | `ORDER_SPECIMEN_*` | 404, 409, 422 |
| Report documents | `ORDER_REPORT_DOC_*` | 404, 422 |
| Catalog guard | `ORDER_CATALOG_*` | 422 |

Each entry: `{ statusCode, code, message }` where `code` matches **today’s** constant/literal and `message` matches **exact** existing string (grep before editing).

Extend `API_ERROR_CODE` only when introducing a **new** stable machine code; otherwise catalog entry can use existing codes from `APPROVAL_ERROR` etc.

### 2. Helpers (`orderWorkflowGuards.ts` or `shared/api-errors/order-errors.ts`)

Keep `throwOrderCatalogError(key)` — already throws `OrderServiceError` from catalog.

Add if useful:

```ts
export const orderServiceErrorFromCatalog = (key: ApiErrorCatalogKey): OrderServiceError => {
  const def = getApiErrorDefinition(key);
  return new OrderServiceError(def.statusCode, def.code, def.message);
};
```

Do **not** duplicate payment keys — they already exist.

### 3. Migrate throw sites (file order)

| File | Throws (~) |
|------|------------|
| `approval.service.ts` | 9 |
| `radiologyReports.service.ts` | 11 |
| `sendOut.service.ts` | 9 |
| `specimenBarcode.service.ts` | 6 |
| `reportDocuments.service.ts` | 5 |
| `orderCatalogGuard.ts` | 3 |
| `approval.controller.ts` | 2 |

Replace each `new OrderServiceError(...)` with `throwOrderCatalogError('...')` or `throw orderServiceErrorFromCatalog('...')`.

Leave `orderWorkflowGuards.ts` payment/pre-auth as-is.

### 4. Constants hygiene

- Keep `APPROVAL_ERROR`, `RADIOLOGY_REPORT_ERROR`, … in `clinical.constants.ts` for **code string SSOT** used in catalog entries: `code: APPROVAL_ERROR.NOT_FOUND` in catalog definition (import catalog from constants, not duplicated literals).
- Remove any constant that becomes unused after migration (only if grep shows zero refs).

### 5. Tests

| Test | Change |
|------|--------|
| `shared/__tests__/api-errors.test.ts` | Stop asserting `keys.length === 5`; assert payment subset + sample approval/radiology entries |
| Existing order unit/integration tests | Must pass unchanged (messages/codes identical) |
| Optional | One test: `throwOrderCatalogError('ORDER_APPROVAL_NOT_FOUND')` → same payload as legacy throw |

```bash
cd projects/his-global-south/backend && npm run build && npm run test && npm run test:integration -- orders
```

### 6. Documentation

One-line comment atop `catalog.ts`: payment keys + order workflow keys; billing/frontdesk not here yet.

## Execution order (with billing chore)

1. **PR A** — [his-global-south-billing-invoices-response-schemas.md](./his-global-south-billing-invoices-response-schemas.md) (independent).
2. **PR B** — this chore (orders catalog only).

No merge dependency between A and B.

## Files touched (expected)

| File | Change |
|------|--------|
| `shared/api-errors/catalog.ts` | +order workflow entries |
| `shared/__tests__/api-errors.test.ts` | updated counts/assertions |
| `clinical/orders/*.service.ts`, `orderCatalogGuard.ts`, `approval.controller.ts` | throws → catalog |
| `clinical/orders/orderWorkflowGuards.ts` | optional helper export |

## Risks

| Risk | Mitigation |
|------|------------|
| Message string drift breaks tests | Copy-paste messages from current throws; run full order test suite |
| Catalog file size | ~30–40 entries acceptable; group with comments |
| Circular imports constants ↔ catalog | Catalog imports **codes** from `clinical.constants.ts`; constants do not import catalog |

## Done when

- [x] Static throws use `throwOrderCatalogError` (`orderCatalogGuard` keeps dynamic `CATALOG_NOT_ENROLLED` throw).
- [x] Order workflow entries in `order-workflow-catalog.ts` merged into `API_ERROR_CATALOG`.
- [x] `api-errors.test.ts` updated; build + unit + integration green.

## Approval

Approved: 2026-09-23 (implement on `chore/billing-schemas-api-errors-phase2`)
