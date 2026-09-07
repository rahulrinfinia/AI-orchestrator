# DRA-2 — Approval API + service changes

| Field | Value |
|-------|--------|
| **Feature** | `diagnostic-results-approval-workflow` |
| **Slice** | 2 |
| **Depends on** | [DRA-1](./slice-1.md) |
| **Technical design** | [../technical-design.md](../technical-design.md) §4–5, AD-1–AD-8 |
| **Goal** | Full backend approval state machine; ops save no longer releases to doctor |

---

## Purpose

Implement `approval.service.ts`, three REST actions, list filter, projection fields, and modify existing save paths so clinician visibility requires `released` (or `approval_exempt`). This slice is the **tracer bullet backend** — verifiable via integration tests without queue UI.

---

## User stories addressed

| Story | Coverage |
|-------|----------|
| US-1 Ops submit for approval | API — `POST .../submit-for-approval` |
| US-2 Pathologist approval queue | API — approve/reject + `approvalStatus=pending_approval` filter |
| US-3 Radiologist approval queue | Same APIs, modality role gates |
| US-4 Reject and resubmit loop | reject API + submit from `rejected` state |
| US-5 STAT/critical notification | Optional: emit SSE from submit (full toast in DRA-4) |
| US-6 | — (DRA-1) |

---

## Scope

### New backend

- `approval.service.ts` — `submitItemForApproval`, `approveItem`, `rejectItem`
- `approval.controller.ts` — thin handlers
- Routes in `orders.routes.ts`:
  - `POST /api/clinical/orders/items/:itemId/submit-for-approval`
  - `POST /api/clinical/orders/items/:itemId/approve`
  - `POST /api/clinical/orders/items/:itemId/reject`
- Schemas in `orders.schema.ts` — body/response + error codes (`RESULT_NOT_RELEASED`, `APPROVAL_INVALID_STATE`, etc.)

### Existing service changes

| Service | Change |
|---------|--------|
| `orders.service.enterOrderResults` | `draft_ops` on save; no `resulted_at` unless `approval_exempt` |
| `reportDocuments.service` | Link PDF only; no auto-complete |
| `radiologyReports.service.upsertRadiologyReport` | Save as `draft` only; remove inline verify dual-write |
| Bedside POC path | Set `approval_exempt`, `released`, `resulted_at` in one transaction |

### Read path

- `orders.mapping.ts` — extend item JSON agg with approval fields
- `listDiagnosticOrdersHandler` — query param `approvalStatus`
- `listReportDocumentsHandler` — 403 `RESULT_NOT_RELEASED` when not released (doctor caller)
- Order auto-complete — all items `released` (not merely `resulted_at`)

### Frontend (minimal)

- Extend `ordersWorkspace.service.ts` mappers with `approvalStatus`, `rejectionReason`
- Update `resultAvailable` helper to use `released || approvalExempt`

### Tests

- Unit: `approval.service` state transitions
- Integration: submit → pending; doctor GET documents 403; approve → 200; reject → resubmit → approve
- Integration: bedside POC → immediate released; not in pending queue
- Integration: role gates (lab_tech cannot approve; pathologist cannot approve radiology line)

---

## Out of scope

- Approval queue React pages (DRA-3)
- Ops tracker Submit button UX (DRA-3)
- SSE frontend toast (DRA-4)
- Encounter tab (ELR feature)

---

## Acceptance criteria (slice)

- [ ] Lab enter results sets `approval_status = draft_ops`; doctor cannot view until approve
- [ ] Submit → `pending_approval`; approve → `released` + `resulted_at` + order complete when all lines released
- [ ] Reject with reason → ops can resubmit from `rejected`
- [ ] PDF link does not release until submit + approve
- [ ] Radiology save does not verify until approve handler dual-writes
- [ ] Bedside POC bypass works (`approval_exempt`)
- [ ] List API returns approval fields; filter `approvalStatus=pending_approval` works
- [ ] Integration tests green; backend build passes

---

## Modules / files (reference)

| Area | Path |
|------|------|
| Service | `approval.service.ts`, `approval.controller.ts` |
| Orders | `orders.service.ts`, `orders.controller.ts`, `orders.routes.ts`, `orders.schema.ts`, `orders.mapping.ts` |
| Radiology | `radiologyReports.service.ts` |
| Documents | `reportDocuments.service.ts` |
| Bedside | `bedsideResultSubmission` path |
| Frontend types | `ordersWorkspace.service.ts`, `orderResults.ts` |

---

## Approval

- [ ] Product — US-1–US-4 backend behaviour matches PRD
- [ ] Tech — AD-1–AD-8; response schemas for all new routes
- [ ] **Approved by:** ___
- [ ] **Date:** YYYY-MM-DD

**Agent rule:** Do not implement until all boxes are checked.
