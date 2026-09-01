# Slice LSO-4 — PDF report upload, history, viewer

| Field | Value |
|-------|--------|
| **ID** | LSO-4 |
| **Depends on** | LSO-3 |
| **Technical design refs** | AD-7, AD-13; §4.2, §5.4, §7.3, §9 |
| **Tracer** | Report arrives from vendor → lab desk opens send-out row in tracker → **Upload report PDF** → PDF linked to item → doctor views PDF + status **report_received** / **completed** in tracker |

---

## Purpose

Complete the send-out loop: external lab results ingested as PDF, versioned history per order item, viewable from lab tracker. Structured result entry (existing results API) remains available alongside PDF.

---

## In scope

### Migration — `NNN_lab_order_item_documents.sql`

**New table:** `diagnostic_order_item_documents` (pgschema source of truth)

- Columns per TD §4.2: `organization_id`, `diagnostic_order_item_id`, `upload_id`, `received_via`, `notes`, `uploaded_by`, `created_at`
- `RECEIVED_VIA` constants: `upload`, `manual`, `email`
- RLS: org isolation via join to order items → orders
- `COMMENT ON` table/columns

### Backend

- **`reportDocuments.service.ts`** (or section in orders service if small)
- **POST `/api/clinical/orders/items/:itemId/report-documents`**
  - Body: `{ upload_id, notes? }`
  - Validates: item is `refer_out`; upload belongs to org; mime is PDF
  - Appends row (history — do not replace prior)
  - Sets `report_received_at` on item if first document; may advance `send_out_status` to `report_received`
- **GET `/api/clinical/orders/items/:itemId/report-documents`**
  - Newest first; include signed URLs from uploads join
  - PHI audit on list/view URL issuance (ADR 0004)

- Reuse **POST `/api/platform/uploads`** with category constant `UPLOAD_CATEGORY.LAB_RESULT` (or equivalent in platform constants)
- Storage path uses `lab/` category segment in MinIO key

- Extend GET order detail to include `has_report_pdf`, `latest_report_document_id` (backend computed — AD-8)

### Frontend

- **LabOrderTracker** — **Upload PDF** on send-out rows (file picker → upload → link)
- Document list + **View PDF** (signed URL in viewer/modal)
- Show upload history when multiple PDFs exist
- Structured results entry unchanged (existing drawer/API)
- Status display reflects `report_received` / `completed` after upload

### Tests

- Unit: reject non-PDF upload; reject non–refer-out item
- Integration: upload flow POST uploads → POST report-documents → GET list with signed URL
- Integration: second upload appends history (two rows)
- Audit mock/spy if audit helper exists
- openapi-get-sweep for new GET route

---

## Out of scope

- Email auto-ingest from vendor inbox
- OCR / structured parsing from PDF
- Vendor portal upload
- Replacing structured lab result entry — both coexist

---

## Endpoints

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/platform/uploads` | existing — `category=lab_result` |
| POST | `/api/clinical/orders/items/:itemId/report-documents` | `LAB_ROLES` |
| GET | `/api/clinical/orders/items/:itemId/report-documents` | `withOrgAuth` |
| GET | `/api/platform/uploads/:id/signed-url` | existing — viewer |

---

## Acceptance criteria

- [ ] Migration applies; pgschema + COMMENT ON complete
- [ ] PDF only — non-PDF → **422** with clear message
- [ ] Multiple uploads create history (append, not replace)
- [ ] PDF viewable from tracker via signed URL
- [ ] `received_via = upload` recorded; `uploaded_by` set
- [ ] Item `report_received_at` set on first document
- [ ] `send_out_status` advances appropriately (`report_received` / `completed` per service rules)
- [ ] Audit emitted on document list/view (no PHI in audit message)
- [ ] Existing structured results API still works for same item
- [ ] Full response schemas on new routes
- [ ] CI green; TD §9 satisfied

---

## Approval

| Role | Name | Date | Status |
|------|------|------|--------|
| Product | | | Pending |
| Engineering | | | Pending |
