# PR #58 — `ORDER_PRIORITY` common constants (approval queue badge)

**Project:** `his-global-south`  
**Branch:** `feat/dra-radiology-inhouse-approval`  
**Reviewer:** @hemantinfinia — `"Create common constant and use it."` on `priority === "stat"` / `"urgent"` in `DiagnosticApprovalQueue.tsx`  
**Pattern:** Same as `APPROVAL_STATUS`, `ORDER_STATUS`, `FACILITY_AVAILABILITY`

---

## Reviewer comment

```typescript
function PriorityBadge({ priority }: { priority: ApprovalQueueRow["priority"] }) {
  if (priority === "stat") { ... }
  if (priority === "urgent") { ... }
}
```

**Issue:** Raw priority strings instead of a shared `ORDER_PRIORITY` const object.

---

## Current state

| Exists today | Location | Gap |
|--------------|----------|-----|
| `OrderPriority` type | `ordersWorkspace/types.ts` | Type only — `"routine" \| "urgent" \| "stat"` |
| `VALID_PRIORITIES` array | `utils/orderPriorityParam.ts` | Not named keys; not used by approval queue |
| `ORDER_PRIORITY_LABELS` | legacy `orders.service.ts` | Labels with raw string keys |
| `priorityRank: { stat, urgent, routine }` | `approvalWorkflow.ts` | Inline duplicate |
| Backend `ORDER_PRIORITY` | `clinical.constants.ts` | **Incomplete** (only `ROUTINE` today) |

No frontend `ORDER_PRIORITY = { ROUTINE, URGENT, STAT }` yet.

---

## Fix strategy — full approval-path scope (recommended)

Add const once in `clinical/constants/orders.ts`, wire through **approval queue + workflow + SSE toast**.  
**Do not** extract shared `PriorityBadge` component in this pass (reviewer asked for constants, not UI dedup).

---

## Step 1 — Add constants to `src/clinical/constants/orders.ts`

After `ORDER_STATUS` block (order-domain constants stay together):

```typescript
/** Diagnostic order priority — DB / API `priority` on diagnostic_orders. */
export const ORDER_PRIORITY = {
  ROUTINE: 'routine',
  URGENT: 'urgent',
  STAT: 'stat',
} as const;

export const ORDER_PRIORITY_VALUES = [
  ORDER_PRIORITY.ROUTINE,
  ORDER_PRIORITY.URGENT,
  ORDER_PRIORITY.STAT,
] as const;

export type OrderPriority = (typeof ORDER_PRIORITY_VALUES)[number];

export const ORDER_PRIORITY_LABELS: Record<OrderPriority, string> = {
  [ORDER_PRIORITY.ROUTINE]: 'Routine',
  [ORDER_PRIORITY.URGENT]: 'Urgent',
  [ORDER_PRIORITY.STAT]: 'STAT',
};

/** Sort rank for approval queue — STAT first (PRD slice-3). */
export const ORDER_PRIORITY_SORT_RANK: Record<OrderPriority, number> = {
  [ORDER_PRIORITY.STAT]: 0,
  [ORDER_PRIORITY.URGENT]: 1,
  [ORDER_PRIORITY.ROUTINE]: 2,
};
```

**Note:** Backend `ORDER_PRIORITY` is incomplete; frontend defines full set to match DB CHECK / API (same values as `OrderPriority` in workspace types).

---

## Step 2 — `DiagnosticApprovalQueue.tsx` (reviewer file)

Import `ORDER_PRIORITY` (+ optionally `APPROVAL_STATUS` for queue load):

| Was | Becomes |
|-----|---------|
| `priority === "stat"` | `priority === ORDER_PRIORITY.STAT` |
| `priority === "urgent"` | `priority === ORDER_PRIORITY.URGENT` |
| `approvalStatus: "pending_approval"` in `loadQueueRows` | `APPROVAL_STATUS.PENDING_APPROVAL` |

Badge labels can stay literal `"STAT"` / `"Urgent"` / `"Routine"` in JSX **or** use `ORDER_PRIORITY_LABELS[priority]` — optional polish.

---

## Step 3 — `approvalWorkflow.ts` (same feature, no leftovers)

| Was | Becomes |
|-----|---------|
| `priority: "routine" \| "urgent" \| "stat"` on `ApprovalQueueRow` | `priority: OrderPriority` (import from `orders.ts`) |
| `priorityRank: { stat: 0, urgent: 1, routine: 2 }` | `ORDER_PRIORITY_SORT_RANK` |

---

## Step 4 — `useRealtimeSync.ts` (approval SSE toast)

| Was | Becomes |
|-----|---------|
| `priority === "stat"` | `priority === ORDER_PRIORITY.STAT` |

---

## Step 5 — Tests (update literals → const where touched)

| File | Action |
|------|--------|
| `approvalWorkflow.test.ts` | Optional: `priority: ORDER_PRIORITY.STAT` in fixtures |
| `useRealtimeSync.approval.test.tsx` | Optional: same |
| **No new test file required** — existing tests pass with runtime values unchanged |

---

## Optional follow-up (out of minimum scope)

| File | Why defer |
|------|-----------|
| `LabOrderTracker.tsx` / `RadiologyOrderTracker.tsx` | Duplicate `PriorityBadge` + filter arrays — same constants, separate PR comment |
| `OrderPrioritySelect.tsx` | SelectItem `value="routine"` etc. |
| `LabOrderForm.tsx` / `RadiologyOrderForm.tsx` | Many priority comparisons |
| `ordersWorkspace/types.ts` | Re-export `OrderPriority` from `@/clinical/constants/orders` instead of duplicating type |
| `utils/orderPriorityParam.ts` | `VALID_PRIORITIES` → `ORDER_PRIORITY_VALUES` |
| legacy `orders.service.ts` `ORDER_PRIORITY_LABELS` | Dedup later |

---

## Type unification (optional, step 5b)

To avoid two `OrderPriority` definitions:

```typescript
// ordersWorkspace/types.ts
export type { OrderPriority } from '@/clinical/constants/orders';
```

**Risk:** circular import if `orders.ts` ever imports workspace types — today it does not. Safe if `orders.ts` stays a leaf.

**Minimum plan:** skip re-export; only add const + use in approval path. Types can stay duplicated until optional cleanup.

---

## Files touched (recommended scope)

| File | Edit |
|------|------|
| `src/clinical/constants/orders.ts` | **Add** `ORDER_PRIORITY` + labels + sort rank |
| `src/components/orders/DiagnosticApprovalQueue.tsx` | Use `ORDER_PRIORITY` (+ `APPROVAL_STATUS` in loader) |
| `src/clinical/constants/approvalWorkflow.ts` | `OrderPriority` type + `ORDER_PRIORITY_SORT_RANK` |
| `src/hooks/useRealtimeSync.ts` | `ORDER_PRIORITY.STAT` |

**4 files.** No new paths. No component API changes.

---

## Importers — no breaking changes

- `DiagnosticApprovalQueue` export names unchanged
- `ApprovalQueueRow` shape unchanged at runtime
- `ordersWorkspace.service` unchanged

---

## Validation checklist

```sh
cd projects/his-global-south

npx tsc -b

npm test -- src/clinical/constants/__tests__/approvalWorkflow.test.ts
npm test -- src/hooks/__tests__/useRealtimeSync.approval.test.tsx

# No raw stat/urgent comparisons in approval path
rg 'priority === "stat"|priority === "urgent"' src/components/orders/DiagnosticApprovalQueue.tsx \
   src/clinical/constants/approvalWorkflow.ts src/hooks/useRealtimeSync.ts
# Expected: no matches

rg 'ORDER_PRIORITY' src --glob '*.{ts,tsx}'
```

---

## Leftover audit (approval path only)

After implement, these should be the **only** `'stat'` / `'urgent'` / `'routine'` as order-priority in scoped files:

- Inside `ORDER_PRIORITY = { ... }` in `orders.ts`
- Inside `ORDER_PRIORITY_LABELS` / `ORDER_PRIORITY_SORT_RANK` keys

**Intentionally unchanged:** tracker `PriorityBadge`, order forms, `OrderPrioritySelect` (optional follow-up).

---

## Draft reply to reviewer

> Added `ORDER_PRIORITY` (and sort rank / labels) in `clinical/constants/orders.ts` and use it in the approval queue priority badge, approval workflow queue sorting, and approval SSE toast instead of raw `"stat"` / `"urgent"` strings.

---

## Risk assessment

| Risk | Mitigation |
|------|------------|
| Runtime value change | None — same strings `'routine'`, `'urgent'`, `'stat'` |
| Duplicate `OrderPriority` type | Optional re-export from `orders.ts` in follow-up |
| Scope creep | Skip tracker/forms in this pass |
| Backend drift | Values match DB/API; extend backend `ORDER_PRIORITY` separately if needed |

---

## Approval

- [x] Plan approved — implemented
- [ ] Skip — reply with rationale only
