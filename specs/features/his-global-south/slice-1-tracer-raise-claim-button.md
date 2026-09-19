# Technical Spec: Slice 1 — Tracer Bullet (Raise Claim Button on Patient Bill)

## 1. Overview
This slice adds claim detection on the Patient Bill page and renders the `[ ⚡ Raise Insurance Claim ]` button on the top action bar when the current visit has unclaimed insurance billing.

---

## 2. File Changes

### `src/pages/patientBill/index.tsx`
- Query claims using React Query:
  ```ts
  const { data: claimItems = [] } = useQuery<ClaimListItem[]>({
    queryKey: ["claim-list-items"],
    queryFn: () => claimsService.listClaimListItems(),
    staleTime: 1000 * 30,
  });
  ```
- Compute `linkedClaim`:
  ```ts
  const linkedClaim = useMemo(() => {
    if (!visitId || !claimItems.length) return null;
    return claimItems.find((c) => c.visitId === visitId) ?? null;
  }, [claimItems, visitId]);
  ```
- Compute `hasInsurancePortion`:
  ```ts
  const hasInsurancePortion = useMemo(() => {
    if (!bill) return false;
    return (
      (bill.insuranceTotal || 0) > 0 ||
      (bill.receipts || []).some((r) =>
        (r.items || []).some((i) => i.payerType === "insurance" || Boolean(i.insurancePlan))
      )
    );
  }, [bill]);
  ```
- Add handler `handleRaiseClaim`:
  ```ts
  const handleRaiseClaim = useCallback(() => {
    navigate(`/claims?tab=submit&source=visit&visitId=${visitId}`);
  }, [navigate, visitId]);
  ```
- Pass `hasInsurancePortion`, `linkedClaim`, and `onRaiseClaim={handleRaiseClaim}` to `<PatientBillTopBar />`.

---

### `src/pages/patientBill/components/PatientBillTopBar.tsx`
- Extend `PatientBillTopBarProps`:
  ```ts
  hasInsurancePortion?: boolean;
  linkedClaim?: ClaimListItem | null;
  onRaiseClaim?: () => void;
  ```
- Render `[ ⚡ Raise Insurance Claim ]` button when `hasInsurancePortion && !linkedClaim`:
  ```tsx
  {hasInsurancePortion && !linkedClaim && onRaiseClaim && (
    <Button
      size="sm"
      onClick={onRaiseClaim}
      className="bg-teal-600 hover:bg-teal-700 text-white font-medium shadow-xs gap-1.5"
    >
      <Zap className="h-4 w-4" /> Raise Claim
    </Button>
  )}
  ```

---

## 3. Verification
- Verify TypeScript types build cleanly.
- Verify clicking the button opens `/claims?tab=submit&source=visit&visitId=...` with all line items loaded.

---

## 4. Approval
Status: Approved by Human
Approver: User
Date: 2026-09-19
