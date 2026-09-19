# PR #58 — Split types from `approvalWorkflow` constants file

**Project:** `his-global-south`  
**Branch:** `feat/dra-radiology-inhouse-approval`  
**Reviewer:** @hemantinfinia — “Types and Constants are in the same file” on `approvalWorkflow.ts`  
**Goal:** Fix file layout using **existing** frontend clinical patterns only. No new folders, no invented naming (`*.helpers.ts`, barrel files, etc.).

---

## PR context

| Field | Value |
|-------|--------|
| Flagged file | `src/clinical/constants/approvalWorkflow.ts` |
| Issue | `APPROVAL_STATUS_LABELS` (constant) + `ApprovalQueueRow` (standalone type) in one `constants/` file |
| Related | `ApprovalStatus` already lives in `orderResults.ts` (unchanged this pass) |

---

## Comment categorization

| Comment | Category | Action |
|---------|----------|--------|
| Types + constants in same file | **Fix Required** | Move standalone type to `clinical/types/` |
| Helpers/functions in `constants/` folder | **Out of scope** | Matches existing `orderResults.ts`, `labOrderStatus.mapping.ts`, `encounterReportAvailability.ts` — do not refactor in this PR |
| Split `encounterReportAvailability.ts` the same way | **Out of scope** | Reviewer did not flag it |

---

## Existing patterns (source of truth — follow these)

### Pattern A — `clinical/constants/*.ts` (majority)

Single file under `constants/` with **const literals + derived types + helpers**:

| File | Const | Derived type | Helpers |
|------|-------|--------------|---------|
| `labFulfillment.ts` | `LAB_FULFILLMENT_TYPE` | `LabFulfillmentType = typeof …` | `isLabFulfillmentType`, guards |
| `radiologyFulfillment.ts` | same shape | same | same |
| `orders.ts` | `LAB_ORDER_STATUS`, labels | `LabOrderStatus`, `LabQueueTab` | tab arrays |
| `orderResults.ts` | — | `ApprovalStatus` union | `readApprovalStatus`, `isClinicianResultReleased` |

**Rule:** Types **derived from** `as const` objects stay in the constants file.

### Pattern B — `clinical/types/*.types.ts` (standalone shapes)

Used when the type is **not** derived from a co-located const object:

| File | Contents |
|------|----------|
| `orders.types.ts` | `DiagnosticOrderListItem`, `PlaceLabOrderItemInput` |
| `reportDocuments.types.ts` | API document list shapes |
| `specimenBarcode.types.ts` | Barcode print / lookup shapes |

**Import style in components:** `@/clinical/types/reportDocuments.types` (see `SendOutReportDialog.tsx`).

### Pattern C — pure constants suffix (rare, optional)

Only **`encounterReports.constants.ts`** in this folder — tiny file, **constants only**, no types, no functions. Related logic lives in **`encounterReportAvailability.ts`** (different basename).

**Do not** create `approvalWorkflow.helpers.ts` or a new module folder — **not used** in clinical.

---

## What `approvalWorkflow.ts` contains today

| Export | Kind | After fix |
|--------|------|-----------|
| `APPROVAL_STATUS_LABELS` | constant | stays in `constants/approvalWorkflow.ts` |
| `ApprovalQueueRow` | **standalone type** | → `clinical/types/approvalWorkflow.types.ts` |
| `APPROVAL_QUEUE_QUERY_KEY` | constant | stays |
| `DIAGNOSTIC_ORDERS_CHANGED_EVENT` | constant | stays |
| `labRowCanSubmit`, `flattenLabApprovalQueue`, … | functions | stay (Pattern A / `orderResults`) |
| `LAB_APPROVE_NOTIFY_ROLES` (private Set) | internal | stay |

---

## Implementation (single batch — required)

### Step 1 — Create type file (Pattern B)

**New file:** `src/clinical/types/approvalWorkflow.types.ts`

```typescript
export type ApprovalQueueRow = {
  orderId: string;
  accessionNumber: string;
  patientName: string;
  patientMrn: string;
  testLabel: string;
  priority: "routine" | "urgent" | "stat";
  isCritical: boolean;
  itemId: string;
  submittedAt: string | null;
};
```

No imports needed (primitives only). Same shape as today — **move only**, no rename.

### Step 2 — Update constants file

**Edit:** `src/clinical/constants/approvalWorkflow.ts`

- Remove `export type ApprovalQueueRow = { … }`
- Add: `import type { ApprovalQueueRow } from '@/clinical/types/approvalWorkflow.types';`
- Remove unused `import type { ApprovalStatus } from '@/clinical/constants/orderResults'` (dead import today) **or** optionally tighten labels:

```typescript
import type { ApprovalStatus } from '@/clinical/constants/orderResults';

export const APPROVAL_STATUS_LABELS: Record<NonNullable<ApprovalStatus>, string> = {
  draft_ops: 'Draft',
  // ...
};
```

Prefer **optional label typing** if trivial; not required for reviewer fix.

All functions unchanged.

### Step 3 — Update importers (2 files import the type today)

| File | Change |
|------|--------|
| `src/components/orders/DiagnosticApprovalQueue.tsx` | Import `ApprovalQueueRow` from `@/clinical/types/approvalWorkflow.types`; keep function/const imports from `@/clinical/constants/approvalWorkflow` |
| `src/clinical/constants/__tests__/approvalWorkflow.test.ts` | Same split |

**Do not** change importers that only use functions/constants:

- `LabOrderTracker.tsx`, `RadiologyOrderTracker.tsx`, `Orders.tsx`, `useRealtimeSync.ts`, `encounterReportAvailability.ts`, hook tests — **unchanged paths**

**Do not** add re-export `export type { ApprovalQueueRow } from '…'` on `approvalWorkflow.ts` unless an importer is missed — prefer explicit types import (Pattern B).

---

## Explicitly NOT doing (avoid inventing structure)

| Do not | Why |
|--------|-----|
| `approvalWorkflow.constants.ts` + rename logic file | Only `encounterReports` uses `.constants.ts`; not the norm for approval workflow |
| `approvalWorkflow.helpers.ts` | No precedent in `clinical/` |
| Move all functions out of `constants/` | Out of scope; reviewer did not ask |
| Move `ApprovalStatus` out of `orderResults.ts` | Pre-PR file; separate ticket |
| Backend-style `approvalWorkflow.types.ts` under `constants/` | Frontend uses `src/clinical/types/` |
| Barrel `clinical/types/index.ts` | Does not exist today |

---

## Optional polish (only if reviewer asks for constants split too)

Mirror **`encounterReports.constants.ts`**:

- `approvalWorkflow.constants.ts` — `APPROVAL_STATUS_LABELS`, `APPROVAL_QUEUE_QUERY_KEY`, `DIAGNOSTIC_ORDERS_CHANGED_EVENT`
- `approvalWorkflow.ts` — functions only, import constants from `./approvalWorkflow.constants.js`

Skip unless second review comment.

---

## Validation

From repo root:

```sh
npm run lint
npx tsc -b
npm test -- src/clinical/constants/__tests__/approvalWorkflow.test.ts
```

Full frontend unit suite if time permits.

---

## Draft reply to reviewer

> Moved standalone `ApprovalQueueRow` to `src/clinical/types/approvalWorkflow.types.ts` (same pattern as `reportDocuments.types.ts` / `orders.types.ts`). Labels, query keys, and queue helpers stay in `clinical/constants/approvalWorkflow.ts`. Derived-from-const types remain co-located per `labFulfillment.ts` / `orders.ts` — this type is a UI row shape, not a const derivative.

---

## Risk assessment

| Risk | Mitigation |
|------|------------|
| Import churn | Only 2 files import `ApprovalQueueRow` |
| Circular deps | Types file is a leaf (no imports) |
| Behavior change | None — type-only move |

---

## Final shape (existing pattern — single file)

Consolidated to **`src/clinical/constants/approvalWorkflow.ts`** only — same as `orderResults.ts` / `labFulfillment.ts` (constants + types + helpers in one file). Removed split files per user request (no over-engineering).

## Approval

- [x] Single-file pattern restored
- [x] Split files removed (`approvalWorkflow.constants.ts`, `approvalWorkflow.types.ts`)
