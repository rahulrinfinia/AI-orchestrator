# PRD: Patient Bill 'Raise Insurance Claim' Integration

## 1. Problem Statement
When hospital billing staff complete or review a patient's bill for an insured visit, they currently have to navigate separately to `/claims`, search for the patient or visit, and then initiate the claim. Providing a direct contextual action on the Patient Bill screen (`/patients/:patientId/billing/:visitId`) streamlines the revenue cycle and eliminates missed claim opportunities.

## 2. Key Requirements
1. **Unclaimed Insurance Bill:** Show an active **`[ ⚡ Raise Insurance Claim ]`** button on `PatientBillTopBar` when insurance coverage/items exist (`insuranceTotal > 0`) and no claim has been created yet.
2. **Deep-Link Auto-Fill:** Clicking the button navigates to `/claims?tab=submit&source=visit&visitId=${visitId}`, auto-filling demographics, diagnoses, and service line items.
3. **Already Claimed Feedback:** If a claim already exists for the visit, display a badge/button **`[ ✅ Claim Filed: CLM-XXXX ]`** that links to `/claims?tab=tracker`.
4. **Summary Card Status:** In `VisitSummaryCard`, show an indicator next to the insurance portion (`Unclaimed` vs `Claimed`).
5. **Pure Cash Exclusion:** For pure cash/self-pay patients with no insurance items, hide the claim button completely.

## 3. Slices
- **Slice 1:** Tracer bullet — Claim detection & TopBar "Raise Claim" action.
- **Slice 2:** Status badge & Visit Summary Card feedback.
- **Slice 3:** End-to-end verification and regression testing.
