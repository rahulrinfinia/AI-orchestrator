# DRA-3 — Ops tracker + approval queues UI

| Field | Value |
|-------|--------|
| **Feature** | `diagnostic-results-approval-workflow` |
| **Slice** | 3 |
| **Depends on** | [DRA-2](./slice-2.md) |
| **Technical design** | [../technical-design.md](../technical-design.md) §7 |
| **Goal** | End-to-end HMIS workflow in UI — ops submit, approver queue, reject loop |

---

## Purpose

Wire approval APIs into lab/radiology trackers and new approval queue tabs. **Tracer bullet complete** when pathologist approves one lab line from queue after lab tech submit.

---

## User stories addressed

| Story | Coverage |
|-------|----------|
| US-1 Ops submit for approval | Lab + radiology tracker buttons |
| US-2 Pathologist approval queue | `LabApprovalQueue.tsx` |
| US-3 Radiologist approval queue | `RadiologyApprovalQueue.tsx` |
| US-4 Reject and resubmit loop | Reject modal + ops rejected chip + reason |
| US-5 | Partial — nav badge pending count (toast in DRA-4) |
| US-6 | Nav landing for pathologist/radiologist |

---

## Scope

### Routes / nav

- Extend `Orders.tsx`:
  - `/orders?type=lab&tab=approve` → `LabApprovalQueue`
  - `/orders?type=radiology&tab=approve` → `RadiologyApprovalQueue`
- `staticRoleAccess.ts` — pathologist/radiologist default to approve tab; combined roles see both track + approve

### New components

- `LabApprovalQueue.tsx` — list pending, sort STAT → critical → submitted_at; Review / Approve / Reject
- `RadiologyApprovalQueue.tsx` — symmetric

### Ops tracker changes

| Component | Change |
|-----------|--------|
| `LabOrderTracker` | Status chips: Awaiting approval, Rejected + reason; **Submit for approval** when `draft_ops` or `rejected` |
| `LabResultEntryDrawer` | Save → draft; optional Save & submit |
| `RadiologyOrderTracker` | Same pattern |
| `RadiologyResultEntryDrawer` | Remove Verify; **Submit for approval** |
| `SendOutReportDialog` | Post-upload prompt to submit |

### API hooks

- `submitForApproval`, `approveItem`, `rejectItem` client functions
- react-query keys: `['approval-queue', orderType]`, invalidation on mutations

### Tests

- Component: queue sort order; reject modal validation (reason min length)
- Manual E2E: lab tech enter → submit → pathologist approve → line `released`

---

## Out of scope

- SSE toast (DRA-4)
- Encounter Reports tab (ELR)
- SMS notifications

---

## Acceptance criteria (slice)

- [ ] Lab tech can submit typed result and PDF from tracker
- [ ] Pathologist sees pending lines in lab approve queue; can approve and reject with reason
- [ ] Radiologist queue symmetric for radiology
- [ ] Rejected line shows reason on ops tracker; resubmit works
- [ ] Admin can break-glass approve from queue
- [ ] Combined-role user sees both tracker and approve tabs
- [ ] Nav badge shows pending count per modality
- [ ] Manual tracer: one lab line released after approve

---

## Modules / files (reference)

| Area | Path |
|------|------|
| Queues | `LabApprovalQueue.tsx`, `RadiologyApprovalQueue.tsx` |
| Trackers | `LabOrderTracker.tsx`, `RadiologyOrderTracker.tsx` |
| Drawers | `LabResultEntryDrawer.tsx`, `RadiologyResultEntryDrawer.tsx` |
| Dialog | `SendOutReportDialog.tsx` |
| Nav | `Orders.tsx`, `staticRoleAccess.ts` |
| API client | orders service hooks |

---

## Approval

- [ ] Product — workflows 1–4 in PRD demonstrable
- [ ] Tech — no inline handlers in routes; reuse DRA-2 APIs only
- [ ] **Approved by:** ___
- [ ] **Date:** YYYY-MM-DD

**Agent rule:** Do not implement until all boxes are checked.
