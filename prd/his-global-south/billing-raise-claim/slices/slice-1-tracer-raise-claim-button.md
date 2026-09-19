# Slice 1: Tracer Bullet — Claim Detection & TopBar "Raise Claim" Action

## Goal
Enable billing staff on the Patient Bill page (`/patients/:patientId/billing/:visitId`) to see a prominent **`[ ⚡ Raise Insurance Claim ]`** button when an insurance portion is unclaimed, and deep-link directly into the pre-populated Claim Form.

## Scope
- Query claims list in `src/pages/patientBill/index.tsx`.
- Identify if the active visit has an existing claim draft/submission.
- In `PatientBillTopBar.tsx`, render `[ ⚡ Raise Insurance Claim ]` button if `hasInsurancePortion` and `!linkedClaim`.
- Navigate to `/claims?tab=submit&source=visit&visitId=${visitId}` on click.

## Approval
Status: Pending Human Approval
