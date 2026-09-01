# LCF-2 implementation report — Enrolled-only picker + catalog resolve + order create

| Field | Value |
|-------|--------|
| **Slice** | LCF-2 |
| **Plan** | `prd/his-global-south/lab-catalog-fulfillment/slices/slice-2.md` |
| **Clone** | `projects/his-global-south/` |
| **Date** | 2026-08-31 |

## Summary

Doctors now order **enrolled lab tests only**. `refer_out` is set only when enrollment fulfilment is **send_out** — unenrolled tests are blocked at create (`422 CATALOG_NOT_ENROLLED`). Send-out orders require at least one active lab vendor (`422 NO_ACTIVE_LAB_VENDORS`).

## Files changed

### Backend
- `backend/src/modules/clinical/catalogs/catalogResolve.ts` — `lab_fulfillment_type` overlay; `referOut === refer_out` only
- `backend/src/modules/clinical/catalogs/catalogs.service.ts` — `enrolled_only=true` lab catalog list
- `backend/src/modules/clinical/catalogs/catalogs.schema.ts` — query + list response schemas
- `backend/src/modules/clinical/catalogs/catalogs.routes.ts` — response schema on GET lab-catalog
- `backend/src/modules/clinical/clinical.constants.ts` — `ORDER_CREATE_ERROR`
- `backend/src/modules/clinical/orders/orderCatalogGuard.ts` — create/append guards
- `backend/src/modules/clinical/orders/sendOut.service.ts` — `countActiveLabVendors`
- `backend/src/modules/clinical/orders/orders.service.ts` — wire guards on create + append
- `backend/src/modules/clinical/catalogs/__tests__/catalogResolve.labFulfillment.test.ts`
- `backend/src/modules/clinical/orders/__tests__/orderCatalogGuard.test.ts`
- `backend/src/__tests__/integration/clinical-get.integration.test.ts`

### Frontend
- `src/services/orders.service.ts` — `getLabCatalog({ enrolledOnly: true })`
- `src/components/orders/LabOrderForm.tsx` — enrolled-only fetch, fulfilment badges, no mock fallback
- `src/components/orders/__tests__/LabOrderForm.test.tsx`

## Validation

| Command | Result |
|---------|--------|
| `backend/` `npm run build` | Pass |
| `npm run lint` + `npx tsc -b` | Pass |
| Backend vitest (catalog resolve + order guard) | 6 passed |
| Frontend `LabOrderForm.test.tsx` | 3 passed |

## Tracer

1. Enrol test in Catalog Browser (LCF-1) as In-house or Send-out
2. **Laboratory → New order** — picker shows enrolled tests only with badge
3. Order in-house test → **In-house** tab; send-out test → **Send-out** tab

## Next

**LCF-3** — disable send-out picker rows when no vendors (UX), consultation picker alignment, Laboratory regression.
