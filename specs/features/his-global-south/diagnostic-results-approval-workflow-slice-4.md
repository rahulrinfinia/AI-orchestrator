# DRA-4 — STAT/critical SSE toast

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `diagnostic-results-approval-workflow` |
| **Slice** | 4 (DRA-4) |
| **Branch** | `feat/dra-4-approval-sse` |
| **Depends on** | DRA-3 (`feat/dra-3-approval-ui`) |
| **Status** | Implemented — awaiting PR |
| **Date** | 2026-09-05 |

---

## Goal

Complete US-5 — pathologists/radiologists receive an in-app toast when a STAT or critical result is submitted for approval, with a deep link to the approval queue.

---

## Delivered

### Backend

| File | Change |
|------|--------|
| `orchestration.constants.ts` | `DIAGNOSTIC_RESULT_APPROVAL_PENDING` + `SSE_BRIDGE_EVENT_TYPES` |
| `event-bus.ts` | `DiagnosticResultApprovalPendingEvent` union member |
| `approval.service.ts` | `isUrgentApprovalSubmit`, `resolveApprovalSubmitCritical`, `maybeEmitApprovalPendingEvent` on submit |

Emit triggers when `priority === 'stat'` OR lab critical (`abnormal_flag` / components) OR radiology `is_critical`. Routine non-critical submits do **not** emit.

### Frontend

| File | Change |
|------|--------|
| `approvalWorkflow.ts` | `APPROVAL_QUEUE_QUERY_KEY`, `shouldNotifyApprovalPending`, `approvalQueueDeepLink` |
| `useRealtimeSync.ts` | Toast (destructive) + "Review queue" action; invalidates queue + count query keys |
| `DiagnosticApprovalQueue.tsx` | Refactored to `useQuery` with shared query key |
| `Orders.tsx` | Pending counts via `useQuery`; fixed desk redirect + approve-tab redirect effects |

### Tests

| File | Coverage |
|------|----------|
| `approval.service.test.ts` | `isUrgentApprovalSubmit`; routine submit no emit; STAT submit emits payload |
| `approvalWorkflow.test.ts` | `shouldNotifyApprovalPending`, `approvalQueueDeepLink` |

---

## Validation

| Check | Result |
|-------|--------|
| `backend npm run build` | Pass |
| `backend npm test` | 453 passed |
| `vitest approvalWorkflow.test.ts` | 5 passed |
| Manual SSE | Pending local QA |

---

## Out of scope

- SMS / WhatsApp
- Doctor-facing encounter tab refresh (ELR-4)
- Tab-level banner on encounter

---

## Approval

- [x] Product — US-5 acceptance criteria met
- [x] Tech — follows `emergency_triage.p1_alert` SSE precedent
- [x] **Approved by:** User (pipeline continuation)
- [x] **Date:** 2026-09-05
