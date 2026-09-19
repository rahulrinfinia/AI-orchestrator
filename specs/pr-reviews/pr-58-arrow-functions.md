# PR #58 — Arrow function migration plan (safety-first)

**Project:** `his-global-south`  
**Branch:** `feat/dra-radiology-inhouse-approval`  
**Reviewer:** @hemantinfinia — “Arrow functions” on new DRA code  
**Goal:** Syntax-only refactor. **Zero behavior change.** No stale imports, no missing exports, no broken routes.

---

## Non-negotiables

1. **Same public API** — every `export` name that exists today must still exist after the change (named exports only; no default-export changes).
2. **No consumer import edits** — `orders.routes.ts`, tests, and other importers must keep identical `import { foo } from '...'` lines. If TypeScript or tests fail because an import “disappeared”, the conversion is wrong.
3. **Syntax only** — do not change function bodies, parameters, return values, error codes, or SQL.
4. **One batch at a time** — run the full verification gate after each batch; do not start the next batch until green.
5. **Revert-friendly** — one git commit per batch so a failure is one `git revert` away.

---

## Why this is safe (when done correctly)

| Concern | Why it does not break |
|---------|------------------------|
| Route handlers | Fastify accepts any callable; `export const handler = async () => {}` works like `export async function handler()` |
| Service imports | Named exports unchanged — `import { approveItem } from './approval.service.js'` still resolves |
| Tests | Same exported symbols; test bodies unchanged |
| Hoisting | Only risk is defining an arrow **after** its first use — avoided by keeping top-to-bottom order |

**Not safe to convert:** classes, `export async function ordersRoutes(fastify)` (route registrar — defer), React components, test-only mocks unless listed.

---

## Pre-flight (once, before Batch 1)

Run from `projects/his-global-south/backend`:

```sh
# Baseline — must be green before any arrow work
npm test
npm run test:integration
npx tsc -b
npm run lint:backend
```

Record baseline: **461 unit**, **100 integration** (as of last run).

### Export inventory (snapshot — do not rename or remove)

**`approval.controller.ts`** — importers: `orders.routes.ts`

| Export | Importer uses |
|--------|----------------|
| `submitItemForApprovalHandler` | routes |
| `approveItemHandler` | routes |
| `rejectItemHandler` | routes |

**`approval.service.ts`** — importers: `approval.controller.ts`, `reportDocuments.service.ts`, `__tests__/approval.service.test.ts`

| Export |
|--------|
| `isLabItemCritical` |
| `isUrgentApprovalSubmit` |
| `resolveApprovalSubmitCritical` |
| `submitItemForApproval` |
| `approveItem` |
| `rejectItem` |
| `canViewUnreleasedReportDocuments` |
| `canViewReportDocumentsForItem` |

**`orderResultRedaction.ts`** — importers: `orders.controller.ts`, `__tests__/orderResultRedaction.test.ts`

| Export |
|--------|
| `redactOrderItemForViewer` |
| `redactOrderForViewer` |
| `redactOrderListForViewer` |

**`orders.controller.ts`** (partial — radiology block done) — importers: `orders.routes.ts`

| Export | Status |
|--------|--------|
| `upsertRadiologyReportHandler` | converted ✅ |
| `linkRadiologyReportUploadHandler` | converted ✅ |
| `clearRadiologyReportUploadHandler` | converted ✅ |
| `linkReportDocumentHandler` | Batch 3 |
| `listReportDocumentsHandler` | Batch 3 |

**`radiologyReports.service.ts`** — importers: `orders.controller.ts`, `approval.service.test.ts` (mock)

| Export |
|--------|
| `dualWriteAndMaybeComplete` |
| `upsertRadiologyReport` |
| `linkRadiologyReportUpload` |
| `clearRadiologyReportUpload` |

**`orderCompletion.service.ts`** — importers: `approval.service.ts`, tests (mock)

| Export |
|--------|
| `sqlHasUnreleasedItems` |
| `maybeCompleteOrderWhenAllItemsReleased` |

**`uploadCleanup.service.ts`** — importers: radiology/report cleanup paths, tests

| Export |
|--------|
| `deleteOrgUploadWhenUnreferenced` |

---

## Per-file workflow (repeat every batch)

For each file being converted:

```
1. INVENTORY   — List all export names (rg '^export ' file.ts)
2. CONVERT     — function → const arrow (body unchanged)
3. RE-INVENTORY — Same export names still present (count must match)
4. CONSUMERS   — Do NOT edit imports unless export renamed (must not happen)
5. TDZ CHECK   — Private helpers appear above first caller in file
6. GATE        — Run verification commands below
7. COMMIT      — One commit per batch
```

### Stale import / missing export detection

After each batch, from `backend/`:

```sh
# 1) TypeScript — catches missing exports, wrong imports, TDZ type issues
npx tsc -b

# 2) Every exported symbol still imported somewhere resolves (build is enough)
# 3) No accidental export renames — diff export lines only:
git diff -- '*.ts' | rg '^[-+].*export (const|async function|function) '
# Expect: minus "export async function foo" plus "export const foo = async"

# 4) Grep consumers still import expected names (example approval):
rg "submitItemForApproval|approveItem|rejectItem|canViewReportDocumentsForItem" src --glob '*.ts'

# 5) No leftover function declarations in converted files (batch scope):
rg '^(export )?(async )?function ' src/modules/clinical/orders/approval.service.ts
# Repeat per file in batch — should return nothing when batch complete
```

**Rule:** If `tsc` passes and integration tests pass, imports/exports are consistent. Do not merge if any export count drops.

---

## Conversion template (copy exactly)

```typescript
// BEFORE
export async function approveItem(itemId: string, orgId: string, userId: string, roles: string[]) {
  // body unchanged
}

// AFTER
export const approveItem = async (
  itemId: string,
  orgId: string,
  userId: string,
  roles: string[],
) => {
  // body unchanged — character-for-character except closing }; 
};
```

Private helper:

```typescript
// BEFORE
async function loadItemContext(orgId: string, itemId: string) { ... }

// AFTER
const loadItemContext = async (orgId: string, itemId: string) => { ... };
```

**Closing braces:** arrow assigned to `const` ends with `};` not `}` alone.

---

## Already completed (verify still green)

| File | Functions converted |
|------|---------------------|
| `approval.controller.ts` | 5/5 |
| `catalogs.service.ts` | 5 enrolled-catalog helpers |
| `orders.controller.ts` | 5 (helpers + 3 radiology handlers) |
| `clinical.constants.ts` | `REDACTED_RESULT_KEYS` moved (related review) |

Pre-Batch-1 gate:

```sh
npm test -- --run approval orderResultRedaction orders
npx vitest run --config vitest.integration.config.ts \
  src/__tests__/integration/orders-approval-radiology.integration.test.ts
```

---

## Batch 1 — `approval.service.ts` + `orderResultRedaction.ts`

**Scope:** 15 + 5 = **20 functions**  
**Consumer files touched:** **none** (exports unchanged)

### 1a. `approval.service.ts`

Convert in **this order** (helpers first, exports last — same as current file layout):

1. Private: `emitDiagnosticResultReleased`, `maybeEmitApprovalPendingEvent`, `loadItemContext`, `parseRadiologyContent`, `hasTypedLabContent`, `hasSubmittableContent`, `assertApproveRole`
2. Exported: `isLabItemCritical`, `isUrgentApprovalSubmit`, `resolveApprovalSubmitCritical`, `submitItemForApproval`, `approveItem`, `rejectItem`, `canViewUnreleasedReportDocuments`, `canViewReportDocumentsForItem`

### 1b. `orderResultRedaction.ts`

1. Private: `itemApprovalContext`, `parseOrderItems` (note: `parseOrderItems` is recursive — keep as `const parseOrderItems = ...` and call by name inside; works fine)
2. Exported: `redactOrderItemForViewer`, `redactOrderForViewer`, `redactOrderListForViewer`

### Batch 1 gate (all must pass)

```sh
npm test -- --run approval orderResultRedaction
npx vitest run --config vitest.integration.config.ts \
  src/__tests__/integration/orders-approval-radiology.integration.test.ts
npx tsc -b && npm run lint:backend
```

| Check | Expected |
|-------|----------|
| `approval.service.test.ts` | 12/12 |
| `orderResultRedaction.test.ts` | 5/5 |
| Radiology integration | 16/16 |
| Export count `approval.service.ts` | 8 exports (unchanged) |
| Export count `orderResultRedaction.ts` | 3 exports (unchanged) |

**Commit:** `refactor(dra): arrow functions in approval and redaction services`

---

## Batch 2 — `radiologyReports.service.ts` + `orderCompletion.service.ts` + `uploadCleanup.service.ts`

**Scope:** 9 + 2 + 1 = **12 functions**  
**Consumer files touched:** **none**

### Order within `radiologyReports.service.ts`

1. `loadOrderItemForOrg`, `loadReportForOrg`
2. `markItemDraftOps`, `withdrawRadiologyReportFromApproval`, `isEditableRadiologyReportStatus`
3. `dualWriteAndMaybeComplete`, `upsertRadiologyReport`, `linkRadiologyReportUpload`, `clearRadiologyReportUpload`

### Batch 2 gate

```sh
npm test -- --run orders approval uploadCleanup
npx vitest run --config vitest.integration.config.ts \
  src/__tests__/integration/orders-approval-radiology.integration.test.ts \
  src/__tests__/integration/clinical-get.integration.test.ts
npx tsc -b && npm run lint:backend
```

| Check | Expected |
|-------|----------|
| Orders unit tests | 52/52 (orders filter) |
| `orders.uploadCleanup.service.test.ts` | 3/3 |
| Integration | 17/17 (radiology + clinical-get) |

**Commit:** `refactor(dra): arrow functions in radiology and completion services`

---

## Batch 3 — Remaining new `orders.controller.ts` handlers (optional)

Only if closing all PR-added handlers:

| Handler | Routes import |
|---------|----------------|
| `linkReportDocumentHandler` | yes |
| `listReportDocumentsHandler` | yes |

**Do not** change `orders.routes.ts` import list — only change definitions in `orders.controller.ts`.

### Batch 3 gate

Same as Batch 2 + confirm route registration still references same handler names.

**Commit:** `refactor(orders): arrow functions in report document handlers`

---

## Out of scope (do not touch in this plan)

| Item | Reason |
|------|--------|
| Pre-existing 15 handlers in `orders.controller.ts` | Not PR-new; large diff |
| 11 exports in `catalogs.service.ts` (searchIcd, etc.) | Pre-existing |
| `orders.service.ts` (22 functions) | Unchanged core |
| `ordersRoutes(fastify)` | Fastify plugin pattern — defer |
| Frontend / React | Different convention |
| Test file `runInTestTransaction` in `approval.service.test.ts` | Test helper — optional |

---

## Final sign-off (after Batch 1 + 2 minimum)

```sh
cd projects/his-global-south/backend
npm test                          # 461/461
npm run test:integration          # 100/100
npx tsc -b
npm run lint:backend
```

Manual smoke (optional, staging/local):

- [ ] Radiographer: submit radiology report → approve → doctor sees released result
- [ ] Doctor: pending item redacted on GET order; PDF visible after release
- [ ] Clear radiology upload → 204

Checklist:

- [ ] No export renamed or removed (diff export lines only)
- [ ] No edits to `orders.routes.ts` imports (unless Batch 3 — still same names)
- [ ] No stale `from './approval.service.js'` broken imports (`tsc` clean)
- [ ] GitHub review threads replied

---

## Rollback

If any gate fails after a batch:

```sh
git checkout -- <files in batch>
# or
git revert HEAD
```

Fix forward only after identifying: missing `};`, helper defined after use, or accidental export rename.

---

## Approval

- [ ] Human approves this safety-first plan before Batch 1 implement

**Implement with:** `pr-review-implement` or agent on `projects/his-global-south/`.

**Plan path:** `specs/pr-reviews/pr-58-arrow-functions.md`
