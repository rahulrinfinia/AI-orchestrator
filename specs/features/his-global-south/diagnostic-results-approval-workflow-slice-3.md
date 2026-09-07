# DRA-3 — Ops tracker + approval queues UI

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `diagnostic-results-approval-workflow` |
| **Slice** | 3 (DRA-3) |
| **Branch** | `feat/dra-3-approval-ui` |
| **Depends on** | DRA-2 (`feat/dra-2-approval-api`) |
| **Status** | Implemented — awaiting PR |
| **Date** | 2026-09-05 |

---

## Goal

Wire DRA-2 approval APIs into lab/radiology trackers and new approval queue tabs. Tracer bullet: lab tech submit → pathologist approve from queue.

---

## Delivered

### Routes / nav (`Orders.tsx`)

- `tab=approve` → `LabApprovalQueue` / `RadiologyApprovalQueue`
- Pending-count badges on approval tabs
- Pathologist/radiologist-only desk roles land on approve tab

### Role access (`staticRoleAccess.ts`)

- `canApproveLab` / `canApproveRadiology` / `prefersLabApproveTab` / `prefersRadiologyApproveTab`
- Nav items for Approval Queue + Track

### New components

- `DiagnosticApprovalQueue.tsx` (+ `LabApprovalQueue`, `RadiologyApprovalQueue` exports)
- `ApprovalRejectDialog.tsx` — reason min 3 chars
- `approvalWorkflow.ts` — sort, flatten queue, submit eligibility helpers

### API client (`ordersWorkspace.service.ts`)

- `submitItemForApproval`, `approveDiagnosticItem`, `rejectDiagnosticItem`
- `countPendingApprovals`, `approvalStatus` list filter

### Tracker / drawer changes

| Component | Change |
|-----------|--------|
| `LabOrderTracker` | Approval badges, Submit for approval, rejection reason |
| `RadiologyOrderTracker` | Same pattern |
| `LabResultEntryDrawer` | Save draft + Save & submit |
| `RadiologyResultEntryDrawer` | Removed Verify → Submit for approval |
| `SendOutReportDialog` | Post-upload submit prompt |
| `labOrderStatus.mapping` | Removed order-level Verify action |

### Tests

- `approvalWorkflow.test.ts` — queue sort, flatten filter, reject min length

---

## Validation

| Check | Result |
|-------|--------|
| `backend npm test` | 451 passed (unchanged) |
| `npm test approvalWorkflow` | Pass |
| Manual E2E tracer | Pending local QA |

---

## Out of scope

- SSE toast (DRA-4)
- Encounter Reports tab (ELR)

---

## Approval

- [x] Product — workflows 1–4 demonstrable in UI
- [x] Tech — uses DRA-2 APIs only; no inline route handlers
- [ ] **Approved by:** ___
- [ ] **Date:** YYYY-MM-DD
