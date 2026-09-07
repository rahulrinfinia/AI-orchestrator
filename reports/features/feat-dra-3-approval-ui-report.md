# DRA-3 implementation report

| Field | Value |
|-------|--------|
| **Plan** | [diagnostic-results-approval-workflow-slice-3.md](../../specs/features/his-global-south/diagnostic-results-approval-workflow-slice-3.md) |
| **Branch** | `feat/dra-3-approval-ui` |
| **Repo** | `projects/his-global-south/` |
| **Date** | 2026-09-05 |

## Summary

DRA-3 completes the end-to-end HMIS approval workflow in the UI: ops submit from trackers, pathologist/radiologist approval queues with approve/reject, rejection loop with reason display, and role-aware navigation.

## Files changed (high level)

### New

- `src/components/orders/DiagnosticApprovalQueue.tsx`
- `src/components/orders/ApprovalRejectDialog.tsx`
- `src/clinical/constants/approvalWorkflow.ts`
- `src/clinical/constants/__tests__/approvalWorkflow.test.ts`

### Modified

- `src/pages/Orders.tsx` — `tab=approve`, pending badges
- `src/config/staticRoleAccess.ts` — approver landing + nav
- `src/services/ordersWorkspace.service.ts` — approval API client + list filter
- `LabOrderTracker`, `RadiologyOrderTracker`, drawers, `SendOutReportDialog`
- `labOrderStatus.mapping.ts` — removed Verify CTA
- Tracker/workspace fixtures — approval fields on test rows

## Manual test path

1. Log in as `lab_tech@flowmd.dev` → enter result → Submit for approval
2. Log in as `pathologist@flowmd.dev` → `/orders?type=lab&tab=approve` → Approve
3. Reject path: reject with reason → lab tech sees reason → resubmit → approve

## Next

- DRA-4 — SSE toast on STAT/critical submit
- ELR — encounter Reports tab (depends on released results)
