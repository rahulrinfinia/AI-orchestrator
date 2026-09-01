# LSO-4 — PDF report upload + history + viewer implementation report

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `lab-send-out-vendors` |
| **Slice** | LSO-4 |
| **Branch** | `feat/lab-send-out-vendors` |
| **Date** | 2026-08-31 |

## Summary

Completes the send-out loop: lab desk uploads vendor PDF reports linked to outsourced order items, keeps append-only history, views PDFs via signed URLs, and advances item status to **report received** on first upload. Structured result entry remains unchanged.

## Backend (`projects/his-global-south/backend/`)

### Migration

| File | Purpose |
|------|---------|
| `017_lab_order_item_documents.sql` | New `diagnostic_order_item_documents` table + `lab_report_access` audit action |

### New / modified files

| File | Purpose |
|------|---------|
| `pgschema/diagnostic-order-item-documents.pgschema.ts` | Table mirror with CHECK on `received_via` |
| `orders/reportDocuments.service.ts` | Link PDF, list with signed URLs, audit, status advance |
| `orders/orders.mapping.ts` | `has_report_pdf`, `latest_report_document_id` on items |
| `orders/orders.schema.ts` | POST/GET report-documents schemas |
| `orders/orders.routes.ts` | Report document routes |
| `orders/orders.controller.ts` | Handlers |
| `clinical.constants.ts` | `RECEIVED_VIA`, `UPLOAD_CATEGORY.LAB_RESULT`, PDF errors |
| `org/org.service.ts` + `shared/storage/minio.ts` | `lab_result` uploads use `lab/` storage prefix |
| `__tests__/orders.reportDocuments.service.test.ts` | PDF validation, append, signed URL list |

### Endpoints

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/api/platform/uploads` | existing | `category=lab_result` (PDF) |
| POST | `/api/clinical/orders/items/:itemId/report-documents` | `LAB_ROLES` | Body `{ upload_id, notes? }` |
| GET | `/api/clinical/orders/items/:itemId/report-documents` | `withOrgAuth` | Newest first + signed URLs + audit |

## Frontend (`projects/his-global-south/src/`)

| File | Purpose |
|------|---------|
| `clinical/constants/orders.ts` | `UPLOAD_CATEGORY.LAB_RESULT` |
| `clinical/types/reportDocuments.types.ts` | Document DTOs |
| `services/orders.service.ts` | `linkReportDocument`, `listReportDocuments` |
| `services/ordersMock.ts` | Tracker wrappers; `hasReportPdf` on list rows |
| `components/orders/SendOutReportDialog.tsx` | Upload PDF + history + View |
| `components/orders/LabOrderTracker.tsx` | Upload PDF / Reports button on send-out rows |

## Validation

```text
backend:  npm run build                                              ✓
backend:  npm test -- orders.reportDocuments.service.test.ts         ✓ (4 tests)
frontend: npm run lint                                               ✓
frontend: npx tsc -b                                                 ✓
```

## Feature complete (LSO-1–4)

| Slice | Status |
|-------|--------|
| LSO-1 | Vendor master |
| LSO-2 | Send-out orders + tracker |
| LSO-3 | Barcode generate/print/lookup |
| LSO-4 | PDF report upload + viewer |

## Manual tracer (recommended)

1. Ensure migrations `015`–`017` applied
2. Send-out order with vendor → print barcode (LSO-3)
3. **Upload PDF** on tracker row → confirm history shows file + View opens PDF
4. Upload second PDF → two history rows (append, not replace)
5. Confirm send-out status shows **Report received**
6. Structured result entry drawer still works on same order

## Next

Open PR on `feat/lab-send-out-vendors` → `develop` with full LSO-1–4 stack.
