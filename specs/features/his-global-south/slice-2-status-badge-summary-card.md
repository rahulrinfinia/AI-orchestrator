# Technical Spec: Slice 2 — Visual Feedback (Claim Status Badge & Visit Summary Card)

## 1. Overview
This slice enhances the visual feedback on the Patient Bill page:
1. When a claim has already been filed for the visit, `PatientBillTopBar` displays **`[ ✅ Claim Filed: CLM-XXXX ]`** (clicking navigates to Track Claims).
2. `VisitSummaryCard` displays an inline status badge next to `Insurance claim: KES X` (`Unclaimed` vs `Claimed: CLM-XXXX`).

---

## 2. File Changes

### `src/pages/patientBill/components/PatientBillTopBar.tsx`
- Add `onViewClaim?: () => void` to `PatientBillTopBarProps`.
- When `linkedClaim` is present:
  ```tsx
  {linkedClaim && (
    <Button
      size="sm"
      variant="outline"
      onClick={onViewClaim}
      className="border-emerald-500/50 bg-emerald-50/50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 font-medium text-xs gap-1.5"
      title="View claim in Track Claims"
    >
      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
      Claim Filed: {linkedClaim.claimNumber || 'Submitted'}
    </Button>
  )}
  ```

### `src/pages/patientBill/components/VisitSummaryCard.tsx`
- Extend `VisitSummaryCardProps` with `linkedClaim?: ClaimListItem | null`.
- On the `Insurance claim` line item:
  ```tsx
  {insuranceTotal > 0 && (
    <div className="flex justify-between items-center text-teal-600">
      <span className="flex items-center gap-1">
        <ShieldCheck className="h-3.5 w-3.5" /> Insurance claim
      </span>
      <div className="flex items-center gap-1.5">
        {linkedClaim ? (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 font-mono text-[10px] py-0 px-1.5 h-4">
            Claimed
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-amber-50 text-amber-900 border-amber-300 font-mono text-[10px] py-0 px-1.5 h-4">
            Unclaimed
          </Badge>
        )}
        <span>{formatCurrency(insuranceTotal)}</span>
      </div>
    </div>
  )}
  ```

### `src/pages/patientBill/index.tsx`
- Pass `linkedClaim={linkedClaim}` to `<VisitSummaryCard />`.
- Pass `onViewClaim={() => navigate('/claims?tab=tracker')}` to `<PatientBillTopBar />`.

---

## 3. Approval
Status: Approved by Human
Approver: User
Date: 2026-09-19
