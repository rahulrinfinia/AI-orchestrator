# LSO-3 — Barcode generate, print, lookup implementation report

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `lab-send-out-vendors` |
| **Slice** | LSO-3 |
| **Branch** | `feat/lab-send-out-vendors` |
| **Date** | 2026-08-31 |

## Summary

Lab desk can **generate and print** a send-out specimen requisition with a unique Code128 barcode, and **look up** an order item by scanning or entering the barcode. Barcode format follows AD-6; print payload is assembled server-side; successful lookup emits a metadata-only PHI audit event.

## Backend (`projects/his-global-south/backend/`)

| File | Purpose |
|------|---------|
| `orders/specimenBarcode.service.ts` | Barcode format, generate (idempotent), lookup + audit |
| `orders/orders.schema.ts` | Params/response schemas for both routes |
| `orders/orders.routes.ts` | POST specimen-barcode, GET by-barcode (before `/:id`) |
| `orders/orders.controller.ts` | Handlers |
| `clinical.constants.ts` | `SPECIMEN_BARCODE_MIN_LENGTH`, `BARCODE_COLLISION` error |
| `frontdesk.constants.ts` | `PATIENT_AUDIT_ACTION.BARCODE_LOOKUP` |
| `db/migrations/016_barcode_lookup_audit_action.sql` | Extends audit action CHECK |
| `__tests__/orders.specimenBarcode.service.test.ts` | Format, idempotency, reject rules, audit |

### Endpoints

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/api/clinical/orders/items/:itemId/specimen-barcode` | `LAB_ROLES` | Returns `{ specimen_barcode, print_payload }`; idempotent |
| GET | `/api/clinical/orders/by-barcode/:code` | `withOrgAuth` | Org-scoped; audit on success; `:code` minLength 6 |

**Barcode format:** `{VENDOR_CODE}-{YYYYMMDD}-{6-char suffix from item id}` (e.g. `CITYLAB-20260831-A1B2C3`)

## Frontend (`projects/his-global-south/src/`)

| File | Purpose |
|------|---------|
| `clinical/types/specimenBarcode.types.ts` | Print payload + lookup DTOs |
| `services/orders.service.ts` | `generateSpecimenBarcode`, `lookupOrderByBarcode` |
| `services/ordersMock.ts` | Tracker wrappers; `specimenBarcode` on list rows |
| `utils/printSendOutRequisition.ts` | Print window with JsBarcode Code128 |
| `components/orders/LabOrderTracker.tsx` | Print button, barcode lookup field |

**Dependency added:** `jsbarcode` (label rendering)

## Validation

```text
backend:  npm run build                                              ✓
backend:  npm test -- orders.specimenBarcode.service.test.ts         ✓ (7 tests)
frontend: npm run lint                                               ✓
frontend: npx tsc -b                                                 ✓
```

## Migrations

Apply on DB before manual test:
- `015_lab_send_out_order_items.sql` (LSO-2, if not yet applied)
- `016_barcode_lookup_audit_action.sql`

## Manual tracer

1. Place a send-out lab order with vendor (LSO-2)
2. Open **Lab order tracker** → outsourced row → **Print**
3. Confirm print preview shows hospital, patient, test, vendor, Code128 barcode
4. Re-print same row → same barcode (idempotent)
5. Enter barcode in **Barcode lookup** → order opens / toast with match

## Out of scope (LSO-4)

- PDF report upload + history + viewer
