# Chore B3b: Lab orders — remaining inline toasts → `userToast`

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Parent** | [his-global-south-fe-api-error-and-user-toast-phased.md](./his-global-south-fe-api-error-and-user-toast-phased.md) — closes gap after **B3** |
| **Branch** | Same as toast rollout (`chore/billing-schemas-api-errors-phase2` or follow-up `chore/fe-lab-user-toast-b3b`) |
| **Scope** | **Two files only** — full file (legacy + diff toasts), not develop-l2 diff hunks |
| **Out of scope** | Other order modules (radiology tracker, etc.); backend; changing when toasts fire |

## Why this exists

B3 migrated **diff-added** lab toasts only (`LAB_RESULT_VALUE_REQUIRED`, `ORDERS_LAB_MARKED_RECEIVED` / `PROCESSING`).  
**18** inline `toast({` calls remain:

| File | Count | API errors |
|------|------:|------------|
| `src/components/orders/LabResultEntryDrawer.tsx` | **5** | Already `showApiErrorToast` on `catch` |
| `src/components/orders/LabOrderTracker.tsx` | **13** | Already `showApiErrorToast` on failures |

Goal: **zero** raw `toast({` in these two files; client messages via `showUserToast` + catalog (`ORDERS_LAB_*`).

---

## Non-regression

Same as parent plan: copy-paste exact strings into catalog first; keep `showApiErrorToast` unchanged; manual smoke on lab happy paths + one validation toast.

---

## Execution (one PR recommended)

```text
B3b-1 LabResultEntryDrawer (5) → B3b-2 LabOrderTracker (13) → lint/tsc/tests → manual lab smoke
```

Can ship as **single PR** `chore(fe): lab orders userToast catalog (B3b)`.

---

## B3b-1 — `LabResultEntryDrawer.tsx`

| # | Current copy | Proposed key | Variant | Notes |
|---|--------------|--------------|---------|--------|
| 1 | Saved and submitted for approval + accession | `ORDERS_LAB_SAVED_SUBMITTED` | default | `description` override or `{accessionNumber}` |
| 2 | Result saved as draft + accession | `ORDERS_LAB_SAVED_DRAFT` | default | same |
| 3 | PDF only / Lab reports must be PDF | `ORDERS_LAB_PDF_ONLY` | destructive | static |
| 4 | Report attached + accession — testName | `ORDERS_LAB_REPORT_ATTACHED` | default | `description` override: `` `${accessionNumber} — ${row.testName}` `` |
| 5 | Submitted for approval + accession — testName | `ORDERS_LAB_SUBMITTED_FOR_APPROVAL` | default | shared with tracker; description override |

**Already done:** `LAB_RESULT_VALUE_REQUIRED` (validation before save).

---

## B3b-2 — `LabOrderTracker.tsx`

| # | Location / trigger | Current copy | Proposed key | Notes |
|---|-------------------|--------------|--------------|--------|
| 1 | Workflow action success | `action.label` + accession | `ORDERS_LAB_WORKFLOW_STATUS` | **Title override** `{ title: action.label }`, description = accession |
| 2–3 | Send-out order | Marked sent to laboratory | `ORDERS_LAB_MARKED_SENT` | description = accession |
| 4–5 | Send-out order | Awaiting laboratory report | `ORDERS_LAB_AWAITING_REPORT` | same |
| 6–7 | Per-test send-out | Same as 2–3 (duplicate handlers) | Same keys | dedupe catalog |
| 8 | Submit approval | Submitted for approval + accession — testName | `ORDERS_LAB_SUBMITTED_FOR_APPROVAL` | shared |
| 9 | Print requisition guard | Assign laboratory first | `ORDERS_LAB_ASSIGN_LAB_FIRST` | destructive |
| 10 | Pop-up blocked | Barcode generated — print blocked | `ORDERS_LAB_PRINT_POPUP_BLOCKED` | destructive; description includes barcodes string (override) |
| 11 | Print success | Requisition ready / N labels ready | `ORDERS_LAB_REQUISITION_PRINT_READY` | **Title override** for plural vs singular; description = barcodes |
| 12 | Barcode lookup validation | Enter a valid barcode | `ORDERS_LAB_BARCODE_TOO_SHORT` | destructive |
| 13 | Barcode lookup success | orderNumber + patient — test | `ORDERS_LAB_BARCODE_LOOKUP_MATCH` | **Title + description override** from `match` |
| 14 | Acknowledge | Result acknowledged | `ORDERS_LAB_RESULT_ACKNOWLEDGED` | description = accession |
| 15 | Inline row action (~1551) | Submitted for approval + item.label | `ORDERS_LAB_SUBMITTED_FOR_APPROVAL` | description override `item.label` |

**Already done:** `ORDERS_LAB_MARKED_RECEIVED`, `ORDERS_LAB_MARKED_PROCESSING` in `handleAdvanceTestStatus`.

### Dynamic toast pattern (implementers)

Prefer **catalog defaults + overrides** over one-off keys when only title/description differ:

```ts
showUserToast(toast, 'ORDERS_LAB_WORKFLOW_STATUS', {
  title: action.label,
  description: order.accessionNumber,
});
```

Add `ORDERS_LAB_WORKFLOW_STATUS` with placeholder title `Status updated` only if tests require a non-empty catalog title; otherwise use a generic title in catalog and always override (match B1 payment validation pattern).

---

## Catalog additions — `src/utils/userToast.ts`

Add **~12–14** keys (after dedupe). Prefix: **`ORDERS_LAB_*`**.  
Extend `userToast.test.ts`: every **new** key has non-empty title; snapshot 2 lab keys; one interpolation/`description` override case.

---

## Validation

```bash
cd projects/his-global-south
npm run lint
npx tsc -b
npm run test -- src/utils/__tests__/userToast.test.ts
# Optional if touched: npm run test -- src/components/orders/__tests__/LabOrderTracker.test.tsx
```

**Manual smoke**

- [ ] Lab tracker: advance received/processing (already cataloged)
- [ ] Send-out: mark sent → awaiting report (toasts + Cancel)
- [ ] Result drawer: save draft, PDF-only guard, attach PDF
- [ ] Submit for approval (drawer + tracker)
- [ ] Barcode lookup: &lt;6 chars error; valid lookup toast
- [ ] Acknowledge result

---

## Done when

- [ ] `LabResultEntryDrawer.tsx` — **0** `toast({`
- [ ] `LabOrderTracker.tsx` — **0** `toast({`
- [ ] All new keys in `USER_TOAST_CATALOG` + tests
- [ ] Parent plan “Done when” Track B note updated (19-file list fully clean)
- [ ] [fe-api-error-user-toast-rollout.md](../../reports/chores/his-global-south-fe-api-error-user-toast-rollout.md) — remove lab exception paragraph

---

## Approval

Approved: 2026-09-24 — B3b implemented locally.
