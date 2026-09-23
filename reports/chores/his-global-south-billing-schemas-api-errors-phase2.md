# Chore report: billing invoice schemas + orders api-errors phase 2

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Branch** | `chore/billing-schemas-api-errors-phase2` |
| **Plans** | `specs/chores/his-global-south-billing-invoices-response-schemas.md`, `specs/chores/his-global-south-api-errors-orders-catalog-phase-2.md` |

## Summary

- **Billing:** `invoices.schema.ts`, all 11 routes wired with `schema` + `BILLING_API_BASE`; legacy `{ error: string }` unchanged.
- **Orders:** `order-workflow-catalog.ts` (+ merge into `API_ERROR_CATALOG`); `orderServiceError.ts` SSOT for `OrderServiceError` + `throwOrderCatalogError`; migrated static throws across orders services.

## Validation

- `npm run build` — OK
- `npm run test` — 542 passed
- `npm run test:integration` — 106 passed

## Notes

- Dynamic `CATALOG_NOT_ENROLLED` (test name in message) remains a direct `OrderServiceError` throw.
- Billing/frontdesk string errors not migrated to shared catalog (future track).
