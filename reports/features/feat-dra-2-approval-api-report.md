# DRA-2 implementation report

| Field | Value |
|-------|--------|
| **Plan** | [diagnostic-results-approval-workflow-slice-2.md](../../specs/features/his-global-south/diagnostic-results-approval-workflow-slice-2.md) |
| **Branch** | `feat/dra-2-approval-api` |
| **Repo** | `projects/his-global-south/` |
| **Date** | 2026-09-05 |

## Summary

DRA-2 implements the backend approval state machine: ops save paths no longer release results to clinicians. Three REST endpoints (submit / approve / reject), document list 403 gate, order completion on all lines released, and minimal frontend mapper updates.

## Files changed

### New

- `backend/src/modules/clinical/orders/approval.service.ts`
- `backend/src/modules/clinical/orders/approval.controller.ts`
- `backend/src/modules/clinical/orders/orderCompletion.service.ts`
- `backend/src/modules/clinical/orders/__tests__/approval.service.test.ts`
- `src/clinical/constants/orderResults.ts`

### Modified

- `clinical.constants.ts` — `APPROVAL_ERROR`, `BEDSIDE_POC_CLINICAL_INDICATION`
- `orders.service.ts`, `orders.controller.ts`, `orders.routes.ts`, `orders.schema.ts`, `orders.mapping.ts`
- `reportDocuments.service.ts`, `radiologyReports.service.ts`
- `orders.reportDocuments.service.test.ts`
- `src/services/ordersWorkspace.service.ts`

## Key behaviour

1. **Lab enter results** → `approval_status = draft_ops`; no `resulted_at` unless `approvalExempt: true`
2. **Submit** → `pending_approval`; radiology report status → `pending_approval`
3. **Approve** → `released` + `resulted_at`; radiology dual-write + order completion check
4. **Reject** → `rejected` with reason; radiology report back to `draft`
5. **PDF link** → `draft_ops` only; no clinician release until approve
6. **Doctor GET documents** → 403 `RESULT_NOT_RELEASED` when not released (pathologist/radiologist/lab_tech/radiographer may view)

## Validation

| Check | Result |
|-------|--------|
| `backend npm run build` | Pass |
| `backend npm test` | 451 passed |

## Deploy note

Requires DRA-1 migrations (029–031) applied first.

## Next

- Commit + PR on `feat/dra-2-approval-api` (stacked on DRA-1)
- DRA-3 — approval queue UI + ops Submit button
- Optional: integration tests for submit → approve → doctor 200 flow
