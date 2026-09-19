# PR #58 — Arrow functions in lab/radiology order trackers (frontend)

**Project:** `his-global-south`  
**Branch:** `feat/dra-radiology-inhouse-approval`  
**Reviewer:** @hemantinfinia — `"arrow functions."` on `tabTestRows` in `LabOrderTracker.tsx`  
**Related:** Backend arrow migration is in `specs/pr-reviews/pr-58-arrow-functions.md` (separate scope — do not merge batches)

**Goal:** Syntax-only refactor of **PR-added module-level helpers** in the two tracker files. Zero behavior change. No import/export changes.

---

## Reviewer comment

```typescript
function tabTestRows(order: LabOrderListItem, queueTab: LabQueueTab): LabOrderTestRow[] {
  return (order.testRows ?? []).filter(
    (t) => (queueTab === LAB_QUEUE_TAB.SEND_OUT ? t.isSendOut : !t.isSendOut),
  );
}
```

**Issue:** New DRA helpers use `function` declarations; repo convention for new non-React helpers is `const name = (...) =>` (see `radiologyCatalogEnrollment.ts`, backend DRA services).

**Category:** Fix Required

---

## Analysis

| Question | Answer |
|----------|--------|
| Is this valid? | Yes — same reviewer pattern as backend + catalog enrollment mappers |
| Public API impact? | None — all targets are **file-private** helpers (not exported) |
| Consumer import edits? | None |
| React subcomponents? | **Out of scope** — `PriorityBadge`, `TATCell`, `FilterBar`, `SummaryCards` pre-existed; leave as `function` to minimize diff |
| Pre-existing lab helpers? | **Out of scope** — `matchesQueueTab`, `labAssignmentLabel` not added in this PR |

### Reference pattern (already in repo)

```typescript
export const facilityAvailabilityFromRadiologyCatalogRow = (row: { ... }): FacilityAvailability => {
  // body
};
```

---

## Scope — functions to convert

### `LabOrderTracker.tsx` — 7 helpers (all added in `7af4689`)

Convert in **this order** (dependencies top-to-bottom):

| # | Current | Depends on |
|---|---------|------------|
| 1 | `tabTestRows` | — |
| 2 | `rejectedTestsForTab` | `tabTestRows` |
| 3 | `pendingApprovalTestsForTab` | `tabTestRows` |
| 4 | `draftResultTestsForTab` | `tabTestRows` |
| 5 | `releasedTestsForTab` | `tabTestRows` |
| 6 | `isTestCompleteOnTab` | — |
| 7 | `sendOutPipelineStatusForTab` | `tabTestRows` |

### `RadiologyOrderTracker.tsx` — 7 helpers (all added in `7af4689`)

Convert in **this order**:

| # | Current | Depends on |
|---|---------|------------|
| 1 | `matchesQueueTab` | — |
| 2 | `tabTestRows` | — |
| 3 | `sendOutPipelineStatusForTab` | `tabTestRows` |
| 4 | `getInHouseRadiologyAction` | — |
| 5 | `inHouseRowsForStatusAdvance` | — |
| 6 | `radiologyRowPipelineKey` | — |
| 7 | `radiologyPipelineStatusForTab` | `tabTestRows`, `radiologyRowPipelineKey` |

**Total:** 14 conversions across 2 files.

---

## Out of scope (do not touch)

| Item | Reason |
|------|--------|
| `export function LabOrderTracker` / `RadiologyOrderTracker` | Exported component — not flagged |
| `PriorityBadge`, `TATCell`, `FilterBar`, `SummaryCards` | Pre-existing React subcomponents |
| `matchesQueueTab`, `labAssignmentLabel` (lab only) | Pre-existing |
| `facilityAssignmentLabel` (radiology) | Pre-existing |
| `LabResultEntryDrawer`, `RadiologyResultEntryDrawer`, other order files | Not in review comment |
| Backend services/controllers | Covered by `pr-58-arrow-functions.md` |
| Test files (`getTestRow`, `renderLabOrderForm`, etc.) | Test helpers — optional, not requested |

---

## Step-by-step implementation

### Step 1 — `LabOrderTracker.tsx`

For each helper in scope, apply:

```typescript
// BEFORE
function tabTestRows(order: LabOrderListItem, queueTab: LabQueueTab): LabOrderTestRow[] {
  return (order.testRows ?? []).filter(...);
}

// AFTER — single-expression body may use implicit return
const tabTestRows = (order: LabOrderListItem, queueTab: LabQueueTab): LabOrderTestRow[] =>
  (order.testRows ?? []).filter(...);

// AFTER — multi-statement body uses block + explicit return
const sendOutPipelineStatusForTab = (order: LabOrderListItem, queueTab: LabQueueTab): string => {
  // body unchanged
};
```

**Rules:**

- Function bodies unchanged (character-for-character except closing `};`)
- Keep helpers **above** first caller — same vertical order as today
- Do not rename symbols

### Step 2 — `RadiologyOrderTracker.tsx`

Same template as Step 1 for all 7 radiology helpers.

### Step 3 — Stale-reference check

```sh
cd projects/his-global-south

# No function declarations left among converted helpers
rg '^function (tabTestRows|rejectedTestsForTab|pendingApprovalTestsForTab|draftResultTestsForTab|releasedTestsForTab|isTestCompleteOnTab|sendOutPipelineStatusForTab|matchesQueueTab|getInHouseRadiologyAction|inHouseRowsForStatusAdvance|radiologyRowPipelineKey|radiologyPipelineStatusForTab)' \
  src/components/orders/LabOrderTracker.tsx src/components/orders/RadiologyOrderTracker.tsx
# Expected: no matches
```

---

## Files to modify

| File | Change |
|------|--------|
| `src/components/orders/LabOrderTracker.tsx` | 7 `function` → `const` arrow |
| `src/components/orders/RadiologyOrderTracker.tsx` | 7 `function` → `const` arrow |

**No other files.**

---

## Validation checklist

```sh
cd projects/his-global-south

npx tsc -b

npx vitest run \
  src/components/orders/__tests__/LabOrderTracker.test.tsx \
  src/components/orders/__tests__/RadiologyOrderTracker.test.tsx
```

| Check | Expected |
|-------|----------|
| TypeScript | Clean |
| `LabOrderTracker.test.tsx` | 27/27 |
| `RadiologyOrderTracker.test.tsx` | 17/17 |
| Export count on both trackers | Unchanged (`LabOrderTracker`, `RadiologyOrderTracker`, props interfaces) |

---

## Risk assessment

| Risk | Mitigation |
|------|------------|
| TDZ (helper used before defined) | Keep same top-to-bottom order |
| Behavior change | Bodies untouched; tests cover tab filtering, pipeline, approval rows |
| Scope creep | Only 14 PR-new helpers; skip React subcomponents |
| Conflicts with backend plan | Separate file + separate commit message |

---

## Draft reply to reviewer

> Addressed — PR-added tracker helpers (`tabTestRows`, approval tab filters, pipeline status helpers) converted to arrow functions in `LabOrderTracker.tsx` and `RadiologyOrderTracker.tsx`, matching the pattern used in catalog enrollment mappers. Pre-existing React subcomponents left unchanged to keep diff minimal.

---

## Approval

- [x] Human approves this plan before implement
- [x] Implemented — 14 helpers converted; 44/44 tracker tests pass; `tsc -b` clean

**Implement with:** `pr-review-implement` or agent on `projects/his-global-south/` after approval.

**Plan path:** `specs/pr-reviews/pr-58-tracker-arrow-functions.md`
