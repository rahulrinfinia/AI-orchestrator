# Slice 2: Visual Feedback — Claim Status Badge & Visit Summary Card

## Goal
Provide real-time visual feedback on claim status directly within the Patient Bill page.

## Scope
- In `PatientBillTopBar.tsx`, if `linkedClaim` is present, display **`[ ✅ Claim Filed: CLM-XXXX ]`** badge that opens `/claims?tab=tracker`.
- In `VisitSummaryCard.tsx`, render a status chip (`Unclaimed` in amber vs `Claimed` in emerald) alongside `Insurance claim: KES X`.
- Ensure pure cash visits (`insuranceTotal === 0` and no claim) remain clean without extra buttons.

## Approval
Status: Pending Human Approval
