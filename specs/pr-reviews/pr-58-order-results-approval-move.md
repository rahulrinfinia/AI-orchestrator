# PR #58 — Move approval helpers out of `orderResults.ts` + `APPROVAL_STATUS` constants

**Project:** `his-global-south`  
**Branch:** `feat/dra-radiology-inhouse-approval`  
**Reviewer:** @hemantinfinia — approval type/helpers misplaced in constants; use named status keys  
**Pattern:** Same as `ORDER_STATUS` / `ENCOUNTER_REPORT_AVAILABILITY` — single file, no split

---

## Reviewer comment (two parts)

| Part | Meaning |
|------|---------|
| “Why in constants… Type or helper functions” | `ApprovalStatus`, `readApprovalStatus`, `isClinicianResultReleased` are approval workflow code, not order-result constants |
| “Add the names in that” | Replace `"released"`, `"pending_approval"`, etc. with `APPROVAL_STATUS.*` (mirror backend) |

---

## Current state (problem)

```
orderResults.ts
├── ApprovalStatus (string union)          ← wrong file
├── readApprovalStatus / readApprovalExempt  ← wrong file
├── isClinicianResultReleased                ← wrong file
├── isPdfOnlyLabResult                       ← correct (result shape)
└── isPdfOnlyRadiologyResult                 ← correct (result shape)

approvalWorkflow.ts
├── imports ApprovalStatus FROM orderResults ← backwards dependency
├── APPROVAL_STATUS_LABELS (raw keys)
└── many "pending_approval" / "released" literals
```

Backend already has `APPROVAL_STATUS` in `clinical.constants.ts`. Frontend has no mirror.

---

## Fix strategy — Option A (recommended)

**One approval home:** `approvalWorkflow.ts`  
**One result-shape home:** `orderResults.ts` (PDF-only helpers only)  
**No new files**, no `clinical/types/` split.

---

## Step-by-step implementation

### Step 1 — Add constants to `approvalWorkflow.ts` (top of file)

Mirror backend:

```typescript
/** Mirror of backend APPROVAL_STATUS — diagnostic_order_items.approval_status. */
export const APPROVAL_STATUS = {
  DRAFT_OPS: 'draft_ops',
  PENDING_APPROVAL: 'pending_approval',
  RELEASED: 'released',
  REJECTED: 'rejected',
} as const;

export const APPROVAL_STATUS_VALUES = [
  APPROVAL_STATUS.DRAFT_OPS,
  APPROVAL_STATUS.PENDING_APPROVAL,
  APPROVAL_STATUS.RELEASED,
  APPROVAL_STATUS.REJECTED,
] as const;

export type ApprovalStatusValue = (typeof APPROVAL_STATUS_VALUES)[number];
export type ApprovalStatus = ApprovalStatusValue | null;
```

Remove: `import type { ApprovalStatus } from '@/clinical/constants/orderResults'`.

### Step 2 — Move helpers from `orderResults.ts` → `approvalWorkflow.ts`

Move verbatim (then wire constants):

- `readApprovalStatus`
- `readApprovalExempt`
- `isClinicianResultReleased` — use `APPROVAL_STATUS.RELEASED` in comparison

Place after const block, before `APPROVAL_STATUS_LABELS`.

### Step 3 — Update `APPROVAL_STATUS_LABELS` keys

```typescript
export const APPROVAL_STATUS_LABELS: Record<ApprovalStatusValue, string> = {
  [APPROVAL_STATUS.DRAFT_OPS]: 'Draft',
  [APPROVAL_STATUS.PENDING_APPROVAL]: 'Awaiting approval',
  [APPROVAL_STATUS.RELEASED]: 'Released',
  [APPROVAL_STATUS.REJECTED]: 'Rejected',
};
```

### Step 4 — Replace literals inside `approvalWorkflow.ts`

| Location | Replace |
|----------|---------|
| `formatLabTestResultSummary` | `=== APPROVAL_STATUS.PENDING_APPROVAL`, `REJECTED` |
| `labRowCanSubmit` / `radiologyRowCanSubmit` | `PENDING_APPROVAL`, `RELEASED` |
| `isReleasedToClinicians` | `APPROVAL_STATUS.RELEASED` |
| `flattenLab/RadiologyApprovalQueue` | `!== APPROVAL_STATUS.PENDING_APPROVAL` |
| `approvalStatusBadgeVariant` | all three status branches |

**Do not change** `row.reportStatus === "draft"` — that is radiology **report** status, not approval status.

### Step 5 — Slim `orderResults.ts`

Keep only:

```typescript
import type { LabOrderTestRow, RadiologyOrderTestRow } from '@/services/ordersWorkspace.service';

export function isPdfOnlyLabResult(row: LabOrderTestRow): boolean { ... }
export function isPdfOnlyRadiologyResult(row: RadiologyOrderTestRow): boolean { ... }
```

Delete all approval exports from this file.

### Step 6 — Update importers (minimal)

| File | Change |
|------|--------|
| `services/ordersWorkspace/mappers.ts` | `isClinicianResultReleased` import → `@/clinical/constants/approvalWorkflow` |
| `encounterReportAvailability.ts` | **Optional:** import `APPROVAL_STATUS`, replace 4 approval comparisons (same PR or follow-up) |
| Trackers, hooks, Orders page | **No change** — already import from `approvalWorkflow` |
| `LabOrderTracker` / `RadiologyOrderTracker` | **No change** — still import PDF helpers from `orderResults` |

**No re-export shim** in `orderResults.ts` — only one caller to update (`mappers.ts`).

### Step 7 — Tests

| File | Action |
|------|--------|
| `approvalWorkflow.test.ts` | Optionally use `APPROVAL_STATUS.DRAFT_OPS` in fixtures (values unchanged → pass either way) |
| `encounterReportAvailability.test.ts` | **No change required** — string values identical |
| **Add** (optional) | 2–3 tests for `readApprovalStatus` / `isClinicianResultReleased` in `approvalWorkflow.test.ts` |

---

## Files touched (scope)

| File | Edit |
|------|------|
| `src/clinical/constants/approvalWorkflow.ts` | **Main** — const + moved helpers + literal replacements |
| `src/clinical/constants/orderResults.ts` | **Delete** approval block |
| `src/services/ordersWorkspace/mappers.ts` | **1 import line** |
| `src/clinical/constants/encounterReportAvailability.ts` | Optional — 4 literal → const |

**Total: 3 required files, 1 optional.**

---

## What stays the same

- Runtime API values unchanged (`draft_ops`, `pending_approval`, …)
- Export names unchanged (`ApprovalStatus`, `isClinicianResultReleased`, `APPROVAL_STATUS_LABELS`)
- Trackers / queue / SSE hooks — no import path changes
- No backend changes

---

## Validation checklist

```sh
cd projects/his-global-south

npx tsc -b

npm test -- src/clinical/constants/__tests__/approvalWorkflow.test.ts
npm test -- src/clinical/constants/__tests__/encounterReportAvailability.test.ts

# No stale imports from orderResults for approval symbols
rg "ApprovalStatus|readApprovalStatus|isClinicianResultReleased" src --glob '*.{ts,tsx}'
# Expected: only approvalWorkflow.ts (+ tests if added)

rg "from \"@/clinical/constants/orderResults\"" src --glob '*.{ts,tsx}'
# Expected: LabOrderTracker, RadiologyOrderTracker, encounterReportAvailability (PDF helpers only)
```

---

## Draft reply to reviewer

> Moved `ApprovalStatus` and the approval read/release helpers from `orderResults.ts` into `approvalWorkflow.ts` where the rest of the approval workflow lives. Added frontend `APPROVAL_STATUS` (mirror of backend) and replaced raw status strings with named keys in that module. `orderResults.ts` now only contains PDF vs typed-result shape helpers.

---

## Risk assessment

| Risk | Mitigation |
|------|------------|
| Stale import from `orderResults` | Grep + tsc; only `mappers.ts` must change |
| `APPROVAL_STATUS_LABELS[t.approvalStatus]` indexing | Keys unchanged at runtime; Record keys now use const |
| Scope creep | Skip `mappers.ts` / `approval.ts` service literals in this pass unless time |

---

## Approval

- [x] Plan approved — implemented
- [ ] Skip — reply with rationale only
