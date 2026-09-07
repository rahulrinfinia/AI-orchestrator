# DRA-2 — Approval API + service changes

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `diagnostic-results-approval-workflow` |
| **Slice** | 2 (DRA-2) |
| **Branch** | `feat/dra-2-approval-api` |
| **PRD slice** | [prd/.../slices/slice-2.md](../../../prd/his-global-south/diagnostic-results-approval-workflow/slices/slice-2.md) |
| **Technical design** | [technical-design.md](../../../prd/his-global-south/diagnostic-results-approval-workflow/technical-design.md) §4–5 |
| **Depends on** | DRA-1 (`feat/dra-1-approval-schema`) |
| **Status** | Implemented — awaiting PR |
| **Date** | 2026-09-05 |

---

## 1. Goal

Full backend approval state machine: ops save no longer releases results to clinicians. Submit → approve/reject flow with role gates and list filter. Minimal frontend mapper updates for `resultAvailable` / `reportAvailable`.

---

## 2. Architecture constraints (AD-N)

| AD | Implementation |
|----|----------------|
| **AD-1** | `approval_status` gates clinician visibility |
| **AD-2** | `resulted_at` set on **approve**, not ops save |
| **AD-3** | Per line item submit/approve/reject |
| **AD-4** | PDF + typed both require submit + approve |
| **AD-5** | Bedside POC via `approval_exempt` on enter results |
| **AD-6** | Order completes when all items `released` or exempt+resulted |
| **AD-7** | `listReportDocuments` 403 for doctors on unreleased items |
| **AD-8** | Radiology verify moved to `approveItem` dual-write |

---

## 3. Delivered

### New backend modules

| File | Purpose |
|------|---------|
| `approval.service.ts` | `submitItemForApproval`, `approveItem`, `rejectItem`, visibility helpers |
| `approval.controller.ts` | Handlers for three POST routes |
| `orderCompletion.service.ts` | `maybeCompleteOrderWhenAllItemsReleased` |

### Routes (under `ORDERS_API_BASE`)

| Method | Path |
|--------|------|
| `POST` | `/items/:itemId/submit-for-approval` |
| `POST` | `/items/:itemId/approve` |
| `POST` | `/items/:itemId/reject` |

### Service changes

| Service | Change |
|---------|--------|
| `orders.service.enterOrderResults` | `draft_ops` on save; `released` + `resulted_at` only when `approvalExempt` |
| `reportDocuments.service.linkReportDocument` | Sets `draft_ops`; no auto `resulted_at` / order complete |
| `reportDocuments.service.listReportDocuments` | Role-aware 403 `RESULT_NOT_RELEASED` |
| `radiologyReports.service.upsertRadiologyReport` | Draft-only save; verify via approve |
| `orders.mapping.ts` | Approval fields in item JSON agg |
| `orders.service.listDiagnosticOrders` | `approvalStatus` query filter |

### Frontend (minimal)

| File | Change |
|------|--------|
| `src/clinical/constants/orderResults.ts` | `isClinicianResultReleased` helper |
| `src/services/ordersWorkspace.service.ts` | Approval fields on test rows; `resultAvailable` / `reportAvailable` use release gate |

### Tests

| File | Coverage |
|------|----------|
| `approval.service.test.ts` | Visibility, submit, approve role gate, reject |
| `orders.reportDocuments.service.test.ts` | Updated for draft_ops link; 403 gate |

---

## 4. Validation

| Check | Result |
|-------|--------|
| `backend npm run build` | Pass |
| `backend npm test` | 451 passed (+8) |
| Integration tests (submit→approve flow) | **Not added** — unit coverage only; recommend DRA-2 follow-up or DRA-3 |

---

## 5. Out of scope (later slices)

- Approval queue React UI (DRA-3)
- Ops tracker Submit button (DRA-3)
- SSE toast on submit (DRA-4)
- Encounter Reports tab (ELR feature)

---

## Approval

- [x] Product — backend behaviour matches PRD slice-2
- [x] Tech — AD-1–AD-8 implemented; response schemas wired
- [ ] **Approved by:** ___
- [ ] **Date:** YYYY-MM-DD

**Note:** Slice implemented on branch; formal approval gate recorded post-review.
