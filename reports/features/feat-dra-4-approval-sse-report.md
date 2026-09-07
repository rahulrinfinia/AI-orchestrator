# Report — DRA-4 STAT/critical SSE toast

| Field | Value |
|-------|--------|
| **Project** | his-global-south |
| **Branch** | `feat/dra-4-approval-sse` |
| **Spec** | `specs/features/his-global-south/diagnostic-results-approval-workflow-slice-4.md` |
| **Date** | 2026-09-05 |

---

## Summary

Added realtime SSE notification when lab/radiology ops submit a STAT or critical result for approval. Approvers see a destructive toast with a deep link to the approval queue; queue and badge counts refetch via shared react-query keys.

---

## Changes

### Backend
- New orchestration event `diagnostic_result.approval_pending`
- `submitItemForApproval` emits only for STAT or critical (not routine)

### Frontend
- `useRealtimeSync` handler with role/modality filter
- Approval queue components use `APPROVAL_QUEUE_QUERY_KEY` for SSE invalidation
- `Orders.tsx` count badges use `useQuery` instead of manual fetch effect

---

## Tests

- Backend: 9 tests in `approval.service.test.ts` (including STAT emit)
- Frontend: 5 tests in `approvalWorkflow.test.ts`
- Full backend suite: **453 passed**

---

## Follow-ups

- Open PR stacked on DRA-3
- Manual QA: pathologist session + STAT lab submit → toast + queue refresh
