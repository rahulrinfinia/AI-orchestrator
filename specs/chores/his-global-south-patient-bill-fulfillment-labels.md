# Chore: Patient Bill — fulfillment labels (copy only)

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Type** | Chore — **UI text only**, zero behavior / API / billing logic |
| **Scope** | Patient Bill screen (`/patient bill` visit receipts) |
| **Prepaid / postpaid** | Same labels for both (fulfillment ≠ payment) |

---

## Problem

Users read **“not billed”** as “we did not charge / did not take money.”  
In reality the line is on the receipt with a price; only **service is not delivered yet** (fulfillment `pending`).  
Payment is shown separately (Due / Paid on visit).

---

## Goal

Replace **“billed”** wording with **“service provided”** wording in four places.  
No changes to amounts, hooks, API, RCM, or payment mode.

---

## Copy map (exact replacements)

| # | Current | New |
|---|---------|-----|
| 1 | `Pending — not billed yet` | `Pending — service not provided yet` |
| 2 | `Pending (not yet billed):` | `Services not yet provided:` |
| 3 | `Collected:` (receipt footer when visit balance is cleared) | `Services provided:` |
| 4 | `Pending (not billed)` (visit summary row) | `Services not yet provided` |

---

## Files to touch (frontend only)

| File | Changes |
|------|---------|
| `projects/his-global-south/src/pages/patientBill/components/ReceiptCard.tsx` | #1, #2, #3 (string literals only) |
| `projects/his-global-south/src/pages/patientBill/components/VisitSummaryCard.tsx` | #4 (string literal only) |

**Do not change:** backend, `paymentPosition`, check-in receipt init, fulfillment dropdown values (`pending` / `rendered`), or `BillingAlerts.tsx` (different message).

**Optional later (out of this chore):** dropdown hint `(not billed)` in `ReceiptCard.tsx` ~190; `BillingAlerts` “signed, but not billed”.

---

## Implementation steps

1. Open `ReceiptCard.tsx` — find the three user-visible strings above; replace with new text only.
2. Open `VisitSummaryCard.tsx` — replace summary row label (#4).
3. Run `npm run lint` and `npx tsc -b` from repo root (frontend).
4. Manual smoke: open one **prepaid** visit bill and one **postpaid** visit bill (if available) — confirm labels read correctly; amounts unchanged.

---

## Acceptance criteria

- [ ] All four strings match the copy map on screen.
- [ ] REG **Completed** line unchanged; CONSULT **Pending** line shows new subtext (#1).
- [ ] Receipt footer shows #2 and #3 with same numbers as before.
- [ ] Visit summary right card shows #4 with same amount as before.
- [ ] No diff outside the two component files (unless typo fix in same line).

---

## Risk

**Very low** — display strings only.  
If a test ever asserts exact old copy on these four strings, update that test (none found for #1–#4 at plan time).

---

## Approval

Approved by: user (chat)  
Date: 2026-11-02  
Implemented: label copy in `ReceiptCard.tsx`, `VisitSummaryCard.tsx`
