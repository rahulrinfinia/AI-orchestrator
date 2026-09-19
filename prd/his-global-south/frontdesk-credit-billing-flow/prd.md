# PRD: Front-Desk Cash vs. Credit Flow, Direct Triage Routing, Emergency Billing & Retroactive Credit Conversion

| Field | Value |
|---|---|
| **Project** | `his-global-south` |
| **Feature key** | `frontdesk-credit-billing-flow` |
| **Product** | flowMD |
| **Version** | 1.0 |
| **Date** | 2026-09-13 |
| **Status** | Approved by Product / Awaiting Implementation |
| **Related** | [ticket.md](./ticket.md) · [plan.md](./plan.md) |

---

## 1. Executive Summary

In a high-throughput Global South healthcare facility, the front-desk receptionist and cashier handle two fundamentally different patient financial journeys upon arrival:
1. **Cash (Self-Pay) Patients**: Patients without active third-party coverage must pay their registration and outpatient consultation fee upfront at the cashier counter before being released to clinical nurse triage.
2. **Credit (SHA / Private Insurance / Corporate) Patients**: Patients with verified third-party coverage are **cashless at arrival** (Patient Due = KES 0). Front-desk receptionists must **not** force them through payment collection. Instead, the visit encounter is registered and checked in, statutory/contracted claim lines are auto-posted to the billing ledger (e.g. SHA Outpatient Consultation `PMF-12-001` @ KES 1,200), the visit's front-desk gate is set to `cleared`, and the patient is routed directly to the **Nurse Triage queue** (`/visits`).

Additionally, this PRD clarifies and codifies:
- **Zero Inflow Dialog Redundancy**: Step 3 of Patient Registration already captures arrival clinic details (department, doctor, visit type, insurance). Registering must directly dispatch the patient to Nurse Triage without popping up the secondary Inflow Check-In Dialog (`PatientCheckInDialog.tsx`).
- **Emergency Billing Lifecycle**: Clinical care in casualty/ED cannot be impeded by financial gates. Emergency arrivals are `exempt` from upfront payment; clinical services rendered during ED stay accumulate on the visit receipt and are settled at **Emergency Discharge or Inpatient Transfer**.
- **Retroactive Credit / Insurance Discovery**: When a patient initially arrives as Cash/Emergency (due to missing card or emergency state) and later provides valid SHA or insurance details, billing clerks can convert the visit bill from Self-Pay to Insurance with 1 click, re-adjudicating charges from patient liability to payer claims.

---

## 2. Background & Problem Statement

### 2.1 The Friction in Current Registration Flow
- In `PatientRegister.tsx`, when a receptionist selects Credit / SHA, the primary button confusingly displays `"Register & Continue to Payment"`.
- Upon submission, if a check-in error occurs or registration mode falls back, the application opens `PatientCheckInDialog.tsx` ("Inflow Form") over the screen. Receptionists find this redundant and frustrating because they just filled department, doctor, and insurance in Step 3.
- In Emergency mode, backend `createEmergencyPatient` already auto-checks in the arrival, but the frontend attempted a second check-in, encountering a `409 DUPLICATE_VISIT` error and triggering the fallback dialog.

### 2.2 Domain Clarification: Patient Gate Clearance vs. Payer Claim Settlement
- Setting `visits.payment_status = 'cleared'` represents **Front-Desk Patient Gating** only: it signals to the triage nurse and doctor that the patient is permitted to proceed into clinical areas without paying cash.
- It does **not** mark the insurance claim as paid. The claim remains in `DRAFT` or `SUBMITTED` status under the **RCM Claims Module** (`/claims`), where the hospital finance team submits and tracks reimbursement from SHA or private insurers.

---

## 3. Personas & Use Cases

1. **Front-Desk Receptionist (Faith)**: Wants to register an SHA patient in under 45 seconds, see KES 0 due, click "Register & Send to Triage", and hand the patient a routing slip without hitting payment screens or extra popups.
2. **Triage Nurse (Sister Mary)**: Monitors `/visits` (Patient Flow queue). Insured patients appear in the "Waiting" tab with "Start Intake" enabled immediately upon check-in; cash patients appear under "Awaiting Payment" until cleared by cashier.
3. **Emergency Medical Officer / Casualty Nurse**: Receives critical patients immediately. Triage fee is free/statutory. All lab orders, X-rays, and medications automatically post to the visit bill.
4. **Billing Clerk / Cashier (John)**: 
   - Collects registration and consultation fees for cash OPD arrivals.
   - Settle emergency bills at discharge.
   - Converts self-pay visits to insurance when relatives bring policy cards post-admission.

---

## 4. User Stories & Acceptance Criteria

### User Story 1: Cash Patient Registration & Check-In
**As a** front-desk receptionist,  
**I want** cash patients to be routed to the cashier immediately after registration,  
**So that** registration and consultation fees are collected before clinical triage begins.

- **AC-1.1**: When `billingMethod === 'cash'`, the primary submit button displays `Register & Continue to Payment` with a receipt icon.
- **AC-1.2**: Upon submission, the patient is registered and checked in with `payment_status: 'pending'`.
- **AC-1.3**: The user is immediately navigated to `/billing/visits/:visitId?collect=true&amount=:totalDue`.
- **AC-1.4**: In `/visits` (Patient Flow), the patient is placed in the `Awaiting Payment` tab and cannot proceed to Nurse Intake until paid.

### User Story 2: Credit / SHA Patient Direct Triage Routing
**As a** front-desk receptionist,  
**I want** insured and SHA patients to be checked in and routed directly to Nurse Triage upon registration,  
**So that** cashless patients do not face cashier delays or redundant modal popups.

- **AC-2.1**: When `billingMethod === 'credit'`, the primary submit button displays `Register & Send to Triage (Cashless)` with a triage/clinical icon.
- **AC-2.2**: The consultation fee breakdown displays:
  - Patient Payable: `KES 0 (Cashless)`
  - Payer / SHA Claim: `KES 1,200` (or contracted rate under `PMF-12-001`)
- **AC-2.3**: Upon submission, the patient and visit are created with `payment_status: 'cleared'`.
- **AC-2.4**: No secondary Inflow Dialog (`PatientCheckInDialog.tsx`) is opened.
- **AC-2.5**: The user is navigated to `/visits` (Patient Flow), and a success toast announces: *"Patient registered with active insurance & sent to Nurse Triage queue!"*
- **AC-2.6**: In `/visits`, the patient appears in the `Waiting` tab with the `Start Intake` button enabled.

### User Story 3: Inflow Check-In Dialog (`PatientCheckInDialog.tsx`) Optimization
**As a** receptionist checking in an existing patient from `/visits` or `/encounters`,  
**I want** the check-in dialog to differentiate between Cash and Credit,  
**So that** credit patients with 0 copay are not redirected to cashier billing.

- **AC-3.1**: For Cash patients or private insurance with copay > 0, the primary button says `Check In & Collect Payment` and routes to `/billing/visits/:id?collect=true`.
- **AC-3.2**: For SHA / Credit patients with copay = 0, the primary button says `Check In & Send to Triage`.
- **AC-3.3**: Submitting a 0-copay credit check-in closes the dialog, shows a success toast, and refreshes the queue on `/visits` without navigating to `/billing`.

### User Story 4: Emergency Billing Lifecycle
**As an** emergency nurse and cashier,  
**I want** emergency patients to receive immediate clinical care while accurately capturing all service charges,  
**So that** patient safety is prioritized and revenue is captured at discharge.

- **AC-4.1**: Emergency arrivals are checked in with `payment_status: 'exempt'`.
- **AC-4.2**: Emergency arrival triage (`TRIAGE-ED`) is KES 0 / statutory.
- **AC-4.3**: Orders placed during ED stay (labs, imaging, pharmacy) automatically post to the visit receipt as rendered charges.
- **AC-4.4**: At ED discharge, the cashier opens `/billing/visits/:id` to review itemized charges and collect payment (or submit insurance claim).

### User Story 5: Retrospective Credit / Insurance Conversion
**As a** billing clerk,  
**I want** to apply insurance to an existing self-pay visit when policy details are provided later,  
**So that** the patient's balance is cleared and charges are billed to the payer.

- **AC-5.1**: On `/billing/visits/:id`, when an uninsured or self-pay visit has unbilled charges, provide an action `Apply Insurance Coverage`.
- **AC-5.2**: Upon applying insurance, bill line items update from `payer_type: 'patient'` to `payer_type: 'insurance'`.
- **AC-5.3**: Patient payable recalculates to KES 0 (or copay), and the claimed amount updates to the payer tariff.
- **AC-5.4**: The visit's `payment_status` updates to `'cleared'`, releasing any front-desk hold.

---

## 5. Non-Functional Requirements & Guardrails

1. **Zero Financial Disruption**: Existing Cash / M-Pesa collection logic on `/billing` remains unchanged.
2. **Regression-Free Queue Gating**: Migration `035_visit_payment_gating.sql` and `VisitsQueueGating.test.tsx` continue to pass.
3. **Dashboard Parity**: Stats cards on `/visits` and `/encounters` accurately increment `Today's Visits` and `Waiting for Nurse` without false `awaitingPaymentCount` spikes for insured patients.
