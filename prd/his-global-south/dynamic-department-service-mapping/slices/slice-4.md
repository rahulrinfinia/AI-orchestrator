# Slice 4: Patient Registration & CollectPayment Dialog Integration

## Goal
Connect the frontend Patient Registration desk (`PatientRegister.tsx`) and Checkout payment modal (`CollectPaymentDialog.tsx`) to dynamically display and charge the department's configured database fees.

## Deliverables
1. `src/pages/patients/PatientRegister.tsx`
   - Real-time fee preview on department selection (Registration Fee + Department Doctor Consultation Fee).
2. `src/pages/patientBill/components/CollectPaymentDialog.tsx`
   - Pre-fills `pay.amount` directly with the auto-calculated database balance from `receipt_items`.
   - Supports Cash, Card, and M-Pesa.
3. End-to-end verification and test suite execution.
