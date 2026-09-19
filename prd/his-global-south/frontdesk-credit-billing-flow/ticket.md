# Ticket: Front-Desk Cash vs Credit Patient Flow, Direct Triage Routing, Emergency Billing & Retroactive Insurance Conversion

| Field | Value |
|---|---|
| **Project** | `his-global-south` |
| **Feature** | `frontdesk-credit-billing-flow` |
| **Type** | Feature & Workflow Optimization |
| **Priority** | High (Critical Frontdesk & Clinical Handover Path) |
| **Plan** | [plan.md](./plan.md) |
| **PRD** | [prd.md](./prd.md) |

---

## Summary

Optimize front-desk registration, patient flow check-in, and billing gating:
1. **Cash Patients**: Preserve existing upfront cash/M-Pesa payment collection at the cashier desk (`/billing/visits/:id?collect=true`).
2. **Credit / Insured Patients (SHA / Private / Corporate)**: 
   - On Patient Registration (`PatientRegister.tsx`), eliminate redundant Inflow Dialog (`PatientCheckInDialog.tsx`) popups. 
   - Directly check in the patient in backend with `payment_status = 'cleared'`, record statutory/contracted claim tariffs (e.g. KES 1,200 under SHA `PMF-12-001`), and route the receptionist directly to **Patient Flow / Nurse Triage (`/visits`)**.
3. **Emergency Billing Lifecycle**:
   - Ensure emergency arrival triage remains free/statutory (`TRIAGE-ED` @ KES 0, `payment_status: 'exempt'`).
   - Settle all accumulated emergency care charges (labs, imaging, meds, procedures) at **Emergency Discharge / Transfer** at the cashier counter.
4. **Retroactive Credit / Insurance Discovery**:
   - Provide a 1-click **"Apply Insurance Coverage / Switch to Credit"** action on the Visit Bill (`/billing/visits/:id`) to re-adjudicate self-pay items into insurance claims when a patient or relative presents insurance details after initial arrival.

---

## Deliverables

1. [prd.md](./prd.md) — Comprehensive PRD with user stories & acceptance criteria
2. [plan.md](./plan.md) — Step-by-step technical architecture, component diffs & verification plan
3. Implementation in `projects/his-global-south/`
