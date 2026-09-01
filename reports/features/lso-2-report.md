# LSO-2 — Send-out orders + tracker status implementation report

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `lab-send-out-vendors` |
| **Slice** | LSO-2 |
| **Branch** | `feat/lab-send-out-vendors` |
| **Date** | 2026-08-31 |

## Summary

Clinicians can mark individual lab tests as **send-out** when placing orders, assign an active outsourced vendor from LSO-1 master data, and track outsourced items in the lab order tracker with vendor name and item-level send-out status. Backend validates vendor on create, joins vendor fields on list/detail, and exposes PATCH to mark specimens sent to vendor.

## Backend (`projects/his-global-south/backend/`)

### Migration

| File | Purpose |
|------|---------|
| `src/db/migrations/015_lab_send_out_order_items.sql` | Adds `vendor_id`, `send_out_status`, `specimen_barcode`, send-out timestamps to `diagnostic_order_items` |

### New / modified module files

| File | Purpose |
|------|---------|
| `clinical.constants.ts` | `ORDERS_API_BASE`, `SEND_OUT_STATUS`, `SEND_OUT_ACTION`, `ORDER_SEND_OUT_ERROR`; extended `ORDER_STATUS` |
| `pgschema/diagnostic-order-items.pgschema.ts` | Send-out columns, FK to `contracted_organizations`, CHECK, indexes |
| `orders/orders.mapping.ts` | `orderItemsJsonAggSql()` with vendor join aliases |
| `orders/sendOut.service.ts` | Vendor validation, send-out item validation, `patchSendOutStatus` |
| `catalogs/catalogs.types.ts` | `referOut`, `vendorId` on item input |
| `catalogs/catalogResolve.ts` | Wire `referOut` override |
| `orders/orders.service.ts` | Persist vendor + status on create; paginated list with `sendOut` filter |
| `orders/orders.schema.ts` | Create/list/detail/send-out schemas + response schemas |
| `orders/orders.routes.ts` | PATCH `/items/:itemId/send-out`; routes from `ORDERS_API_BASE` |
| `orders/orders.controller.ts` | Send-out PATCH handler |
| `__tests__/orders.sendOut.service.test.ts` | Vendor validation + status patch unit tests |
| `__tests__/clinical.rest.test.ts` | Paginated list expectation |

### Endpoints (changes)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/clinical/orders` | **Breaking:** returns `{ items, total, limit, offset }`; query `sendOut=true|false`; items include `refer_out`, `vendor_id`, `vendor_name`, `vendor_code`, `send_out_status` |
| POST | `/api/clinical/orders` | Items accept `refer_out`, `vendor_id`; 422 `vendor_required_for_send_out` when refer-out without vendor |
| PATCH | `/api/clinical/orders/items/:itemId/send-out` | Actions `mark_sent`, `mark_awaiting_report` |

## Frontend (`projects/his-global-south/src/`)

| File | Purpose |
|------|---------|
| `clinical/constants/orders.ts` | Send-out status labels, API path |
| `clinical/types/orders.types.ts` | Send-out fields on order items |
| `services/orders.service.ts` | Paginated list unwrap, `patchSendOutStatus`, send-out filter |
| `services/ordersMock.ts` | Send-out on place order; paginated list; `patchLabOrderSendOut` |
| `services/consultationWorkspace.service.ts` | Unwrap paginated list for encounter orders |
| `components/orders/LabOrderForm.tsx` | Per-test send-out checkbox + vendor select |
| `components/orders/LabOrderTracker.tsx` | Send-out filter, outsourced badge, vendor name, Mark sent |

## Validation

```text
backend:  npm run build                                              ✓
backend:  npm test -- orders.sendOut.service.test.ts                 ✓ (4 tests)
backend:  npm test -- clinical.rest.test.ts                          ✓ (33 tests)
frontend: npm run lint                                               ✓
frontend: npx tsc -b                                                 ✓
frontend: npm test -- ordersMock ordersPaGate orders.service         ✓ (41 tests)
```

## Out of scope (LSO-3+)

- Barcode generate, print, lookup
- PDF report upload + history
- Vendor portal
- Radiology send-out

## Manual tracer (recommended)

1. Ensure at least one active lab vendor exists (LSO-1 `/org-setup/lab-vendors`)
2. Place a lab order with one test marked **Send out** and vendor selected
3. Open **Lab order tracker** → filter **Outsourced only** → confirm badge, vendor name, status
4. Click **Mark sent** → status advances to sent / awaiting report
5. Consultation workspace still loads encounter lab/radiology orders (paginated API)

## Notes

- Apply migration `015_lab_send_out_order_items.sql` on environments before testing against real DB.
- Deactivated vendors remain on existing order rows but are excluded from new order picker (`active: true`).
