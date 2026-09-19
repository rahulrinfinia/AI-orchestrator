# Technical Plan: Front-Desk Cash vs. Credit Flow, Direct Triage Routing, Emergency Billing & Retroactive Insurance Conversion

| Field | Value |
|---|---|
| **Project** | `his-global-south` |
| **Feature key** | `frontdesk-credit-billing-flow` |
| **Product** | flowMD |
| **Date** | 2026-09-13 |
| **PRD** | [prd.md](./prd.md) |
| **Ticket** | [ticket.md](./ticket.md) |

---

## 0. Verified Implementation Status (as of 2026-09-13, against `feat/opd-billing`)

### Slice overview (4 total, mapped to the 5 PRD user stories)

| Slice | Covers (PRD Story) | Status | Remaining work |
|---|---|---|---|
| **Slice 1** | Registration button — Cash vs Credit (Story 1 & 2) | ✅ Already implemented | 1 cosmetic text fix (add `" (Cashless)"` suffix) |
| **Slice 2** | Inflow Check-In Dialog — Cash vs 0-copay Credit (Story 3) | ✅ Already implemented | None — regression test run only |
| **Slice 3** | Retrospective Insurance Application (Story 5) | ✅ DONE (2026-09-13) | Implemented + live-tested — see §2.3 and §3 below. Browser click-through still pending. |
| **Slice 4** | Emergency Billing Lifecycle (Story 4) | ✅ Already covered by generic infra | None — manual verification only |

Re-checked this plan against the actual working tree before implementation. Findings:

- **Slice 1 & Slice 2 are already implemented** in `PatientRegister.tsx` and `PatientCheckInDialog.tsx` (both already dirty/modified on this branch). Dynamic button text, direct check-in routing, emergency duplicate-check-in skip, and backend auto `payment_status: 'cleared'` on active coverage (`patients.service.ts` → `checkInPatient`) are all live. Remaining Slice 1 work is cosmetic only: button copy is `"Register & Send to Triage"`, PRD/AC‑2.1 wants `"Register & Send to Triage (Cashless)"`.
- **Slice 3 (Retrospective Insurance Application) is the only real remaining work.** Confirmed via code read:
  - `patients.service.ts` `checkInPatient` already auto-resolves `payment_status` from `patient_coverage` — no frontend involvement needed.
  - `rcm/shared/handlers.ts` already auto-posts REG-FEE/consult-fee to the receipt on check-in via `resolveCatalogItemPrice` + `resolvePatientPayerDetails` (Payer Master price-list resolution — **PM-1..PM-5 in `payer-master` feature are all `completed`** per its `slices/status.yaml`, so contracted tariffs are genuinely available, not stubbed).
  - `ReceiptCard.tsx` already has a **per-item** payer dropdown (`patient`/`insurance`/`waiver`) wired to `patchReceiptLineItem` — including a one-click "Move to Patient Pay" (reverse direction) already shipped. There is **no bulk/one-click forward action** ("Insurance → apply to whole bill") yet.
  - `recalculateReceiptTotals` (`receipts.service.ts`) only touches `receipts.subtotal`/`total_amount` — it never touches `visits.payment_status`. **No existing write path sets `visits.payment_status` outside of check-in.** The only visit PATCH route (`/api/frontdesk/visits/:id/status`) accepts `status`, not `payment_status` — this must be added.
  - `patchReceiptLineItem`'s payer-switch math (`receipts.service.ts` ~L439-461) recomputes `patient_amount`/`claimed_amount` from the item's **existing stored `unit_price`** — it does **not** re-resolve price against the payer's contracted tariff. Switching a cash-priced item to `insurance` today would claim the self-pay rate, not the payer's contracted rate. This must be fixed as part of Slice 3, by re-calling `resolveCatalogItemPrice` (with the insurer's price list) at switch time.
  - `PatientDetail.tsx` already has a full "Add/Update Coverage" form (`insurerId`, `insurerPlanId`, `insurerMemberNumber` + `coverageMutation`) that writes `patient_coverage`. Slice 3 does **not** need to build insurer-picker UI from scratch — if the patient has no `patient_coverage` on file yet, the bill-page action should deep-link to that existing form rather than duplicating it.
  - `claimable_receipt_items` is a **DB view** over `receipt_items` (filtered by `payer_type`), not a table requiring an explicit "create claim" step — so flipping `payer_type` to `insurance` is sufficient for the item to surface in the RCM Claims module. No separate claim-creation call is needed.
  - Only unpaid/unbilled items should be eligible for the bulk switch — items already reflected in `payments` (cash already collected) must be excluded; PRD AC‑5.1 already scopes this to "unbilled charges" but the plan didn't call out the filter explicitly.

**Decisions (confirmed with user, 2026-09-13):**
- **Permission**: no new role split. "Apply Insurance" is visible to anyone with access to the billing/visit-bill page (front-desk and billing clerk both) — same gate as the existing "Collect Payment" action on this page, not a narrower one.
- **Coverage staleness**: must force a re-verify before the switch is allowed, not a silent pass-through.
  - **Correction (2026-09-13):** initially thought this needed a new backend endpoint — wrong. `runCoverageRefreshAtCheckIn` (visit-bound, check-in only) was the only thing checked at the time. There is a second, separate, already-complete module: `POST /api/rcm/eligibility/check` (`rcm/eligibility/*`, backed by `persistChartEligibilityCheck` in `coverageVerification.ts`) is patient-centric, needs no `visitId`, and already persists the result to `patient_coverage.eligibility_verification_status`. The frontend already has a matching wrapper, `eligibilityService.checkEligibility()` (`src/services/eligibility.service.ts`), already wired into `PatientDetail.tsx`. **No new backend code needed for re-verify** — Step 6 below just calls this existing service before allowing the switch.

---

## 1. Technical Architecture & Data Flow

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               PATIENT ARRIVAL (FRONT-DESK)                            │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                    ┌───────────────────────┴───────────────────────┐
                    ▼                                               ▼
         [ Billing Method: CASH ]                        [ Billing Method: CREDIT ]
                    │                                               │
                    ▼                                               ▼
     - Button: "Register & Pay"                      - Button: "Register & Send to Triage"
     - Direct check-in API call                      - Direct check-in API call
     - payment_status: 'pending'                     - payment_status: 'cleared'
     - Route: /billing/visits/:id?collect=true       - Route: /visits (Patient Flow Queue)
                    │                                               │
                    ▼                                               ▼
      Cashier collects KES 700                        Nurse sees patient in "Waiting" tab
                    │                                 Clicks "Start Intake" (Vitals & Triage)
                    ▼                                               │
      payment_status: 'cleared'                                     ▼
                    │                                 RCM Claims: Claim draft KES 1,200
                    └───────────────────────┬───────────────────────┘
                                            ▼
                                  DOCTOR CONSULTATION
```

---

## 2. Component Modifications

### 2.1 Component 1: `PatientRegister.tsx`
- **File**: `projects/his-global-south/src/pages/patients/PatientRegister.tsx`
- **Changes**:
  1. **Dynamic Button Text & Icons**:
     - When `billingMethod === 'credit'`:
       - Text: `Register & Send to Triage (Cashless)`
       - Icon: `CheckCircle2` / `Stethoscope`
     - When `billingMethod === 'cash'`:
       - Text: `Register & Continue to Payment`
       - Icon: `Receipt`
  2. **Direct Check-in Handling**:
     - When `visitType === 'emergency'`, skip the duplicate frontend `checkInPatient` call (since backend `createEmergencyPatient` already auto-checks in). Directly navigate to `/visits` or `/encounters`.
     - When `visitType === 'opd'` / others:
       - Pass `override: true` to `checkInPatient` to ensure non-fatal ID omissions do not trigger gating errors.
       - If `billingMethod === 'cash'`: route to `/billing/visits/:id?collect=true&amount=:totalEstimatedDue`.
       - If `billingMethod === 'credit'`: route to `/visits`.
  3. **Remove Redundant Inflow Modal**:
     - Remove `<PatientCheckInDialog>` component and `checkInOpen` state from `PatientRegister.tsx`. Step 3 already captures department, doctor, and insurance.

### 2.2 Component 2: `PatientCheckInDialog.tsx`
- **File**: `projects/his-global-south/src/components/encounters/PatientCheckInDialog.tsx`
- **Changes**:
  1. **Dynamic Check-in Action**:
     - If `hasInsurance && copayAmount === 0`:
       - Button text: `Check In & Send to Triage`.
       - On success: Call `onSuccess(resolvedVisitId)` and close modal without navigating to `/billing`.
     - If `!hasInsurance || copayAmount > 0`:
       - Button text: `Check In & Collect Payment`.
       - On success: Navigate to `/billing/visits/:resolvedVisitId?collect=true&amount=:estimatedTotal`.

### 2.3 Component 3: Retrospective Insurance Application on Visit Bill
- **Files**:
  - `projects/his-global-south/src/pages/patientBill/index.tsx`
  - `projects/his-global-south/src/pages/patientBill/components/VisitSummaryCard.tsx`
  - `projects/his-global-south/backend/src/modules/rcm/billing/receipts/receipts.service.ts` (payer-switch re-pricing)
  - `projects/his-global-south/backend/src/modules/frontdesk/visits/visits.routes.ts` + `.controller.ts` + `.schema.ts` (new `payment_status` write path)
- **Changes**:
  1. ✅ **DONE (2026-09-13):** Action buttons added to `PatientBillTopBar.tsx` (not `VisitSummaryCard`, to match its existing prop-driven action-bar pattern) — "Apply Insurance" when coverage is on file, "Add Insurance" (deep-links to the existing `PatientDetail.tsx` coverage form) when it isn't.
  2. ✅ **DONE:** `handleApplyInsurance()` in `patientBill/index.tsx` loops non-invoiced receipts' `payerType: 'patient'` items and calls the existing `patchReceiptLineItem` per item (no new bulk endpoint) — items already in an `invoiced`/`finalized` receipt are skipped, matching the existing per-item dropdown's own edit gate.
  3. ✅ **DONE (2026-09-13):** `patchReceiptItem` (`receipts.service.ts`) now re-resolves `unit_price` via `resolveCatalogItemPrice` + `resolvePatientPayerDetails` (same helpers `rcm/shared/handlers.ts` uses at check-in) whenever an item is switched to `payer_type: 'insurance'`, instead of reusing the self-pay `unit_price`. Verified live against dev DB: a CT Cervical Spine item billed at KES 1,500 (self-pay) re-priced to KES 1,725 (the patient's actual SHA-contracted rate) on switch, then reverted to leave demo data clean.
     - **Bonus fix, same function:** found and fixed a pre-existing bug while testing — the old `copay_amount` CASE bound `String(body.copay_amount)` (literally `"undefined"` when no copay was passed) as a `WHEN` value, which Postgres tried to type-coerce to `numeric` at parse time regardless of branch taken, crashing with `invalid input syntax for type numeric: "undefined"` on *any* payer-type switch that didn't also pass `copay_amount` — including the existing per-item dropdown in `ReceiptCard.tsx`, which never passes it. Replaced with the same `COALESCE(...)` pattern already used for `patient_amount`/`claimed_amount` on the lines above it.
  4. ✅ **DONE (2026-09-13):** `payment_status` write path added to the existing generic `PATCH /api/frontdesk/visits/:id` (`patchVisit` in `visits.service.ts`, `patchVisitHandler` in `visits.controller.ts`) — no new route needed. Added `PAYMENT_STATUS`/`PAYMENT_STATUSES` constants + `isValidPaymentStatus` guard (`frontdesk.constants.ts`, `visits.service.ts`), returning 400 on an invalid value. `npm run build` clean in `backend/`.
  5. No explicit "create claim" step needed — `claimable_receipt_items` is a view keyed on `payer_type`, so the RCM Claims module picks up the switched items automatically once step 3 completes.
  6. ✅ **DONE:** if `coverageStale`, `handleApplyInsurance()` calls the **existing** `eligibilityService.checkEligibility()` first and blocks the switch (toast + abort) if it doesn't come back active — no new backend code.
  7. ✅ **DONE:** no new role/permission gate — both buttons render under the same `canCollectPayment` page-level condition as the existing "Collect Payment" button.

**Verification (2026-09-13):** `npx tsc -b` and `eslint` clean across all touched files (no new errors beyond the 9 pre-existing, unrelated test-file errors already on this branch). Live end-to-end smoke test against the dev DB (`patchReceiptItem` × 2 items + `patchVisit` payment_status write), reverted after: a CT Cervical Spine item (KES 1,500 self-pay) and a lab item (KES 500 self-pay) both re-priced correctly to their SHA-contracted rates (KES 1,725 and KES 575) on switch to insurance, and the visit's `payment_status` write path executed cleanly. **Not yet done:** a real browser click-through of the new buttons — only the underlying service calls were verified, not the rendered UI.

---

## 3. Vertical Implementation Slices

### Slice 1: Patient Registration Direct Triage Dispatch & Dynamic Buttons — ✅ DONE (2026-09-13)
- Button text & intent switching already live in `PatientRegister.tsx`.
- Duplicate emergency check-in call already eliminated; `PatientCheckInDialog` popup already removed from this flow.
- Applied: credit button label now reads `"Register & Send to Triage (Cashless)"`, matching AC‑2.1 exactly. `PatientRegister.billingMethod.test.tsx` re-run: 8/8 passed, no regression.
- Also fixed in this pass (unrelated pre-existing bug, found via manual repro): `DuplicatePatientModal` was referenced in `PatientRegister.tsx` JSX but never imported, crashing the form (React error boundary — "DuplicatePatientModal is not defined") the moment Step 1's dedup check found a match. Added the missing import; `tsc -b` and `eslint` clean on this file post-fix.

### Slice 2: Inflow Dialog Cash vs. Credit Differentiation — ✅ DONE, verified (2026-09-13)
- `PatientCheckInDialog.tsx` already distinguishes cash vs. 0-copay credit check-ins, and does so by trusting the backend-returned `payment_status` rather than a frontend copay guess (more robust than originally scoped).
- No code change needed. `PatientCheckInDialog.test.tsx` re-run: 8/8 passed, confirming no regression.

### Slice 4: Emergency Billing Lifecycle (PRD User Story 4) — ✅ Already covered, no dedicated slice needed
Not omitted by mistake — verified there is nothing to build. All four ACs ride on existing generic infrastructure, none of it emergency-specific:
- AC‑4.1/4.2 (exempt + `TRIAGE-ED` at statutory rate): already auto-posted by the check-in auto-billing handler (`rcm/shared/handlers.ts`) for any `visit_type === 'emergency'`.
- AC‑4.3 (labs/imaging/pharmacy auto-post to the bill): generic `order.created` / `prescription.created` event handlers already post to the receipt for any visit type — no ED branch exists or is needed.
- AC‑4.4 (cashier settles at discharge): `patientBill/index.tsx`'s `canCollectPayment = balance > 0` is not gated by `payment_status` at all — the cashier can already open `/billing/visits/:id` and collect the moment a balance exists, discharge or not.
- Remaining work: **verification only** — manually walk an emergency visit through triage → orders → discharge once and confirm the bill accumulates and settles as expected. No code changes scoped here.

### Slice 3: Retrospective Credit Conversion on Patient Bill — ✅ DONE (2026-09-13)
- "Apply Insurance" / "Add Insurance" actions added per §2.3 above.
- Insurer-tariff re-pricing on payer switch added to `patchReceiptItem` (`receipts.service.ts`).
- New `visits.payment_status` write path added via the existing generic `PATCH /api/frontdesk/visits/:id`.
- "No coverage on file" case deep-links to the existing `PatientDetail.tsx` coverage form.
- Verified live against dev DB: receipt totals recalculate at the payer's contracted rate (not the self-pay rate), only non-invoiced `patient`-payer items are affected, and `visits.payment_status` write succeeds.
- **Bonus fix:** found and fixed a pre-existing crash in `patchReceiptItem`'s `copay_amount` CASE expression (bound `"undefined"` as a numeric literal on any payer switch without an explicit `copay_amount` — including the existing per-item dropdown in `ReceiptCard.tsx`).
- **Remaining before merge:** a real browser click-through of both new buttons has not been done — only the service-layer calls were verified via direct DB smoke tests, not the rendered UI/interaction.

---

## 4. Verification Plan

### Automated Unit & Integration Tests
```bash
# Test 1: Patient Registration Cash vs Credit routing
npx vitest run src/pages/patients/__tests__/PatientRegister.billingMethod.test.tsx

# Test 2: Inflow Check-in Dialog Cash vs Credit behavior
npx vitest run src/components/encounters/__tests__/PatientCheckInDialog.test.tsx

# Test 3: Visits Queue Gating & Triage Intake enablement
npx vitest run src/pages/visits/__tests__/VisitsQueueGating.test.tsx

# Test 4: Full Production Build
npm run build
```

### Manual Acceptance Testing
1. **Cash Registration**: Register Cash patient ➔ Verify routing to Cashier to collect KES 700.
2. **SHA Registration**: Register SHA patient ➔ Button says "Register & Send to Triage (Cashless)", lands on `/visits`, patient is immediately in "Waiting" tab with "Start Intake" enabled.
3. **Inflow Check-In**: Check in existing SHA patient ➔ Button says "Check In & Send to Triage", dialog closes, patient is cleared.
4. **Retroactive Insurance**: Open a cash bill with KES 1,500 due ➔ Click "Apply Insurance" ➔ Patient due becomes KES 0, Insurance claim becomes KES 1,200.
