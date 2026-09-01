# LCF-3 — Vendor guard UX, consultation alignment, regression

**Project:** his-global-south  
**Slice:** LCF-3  
**Status:** Implemented (local — not committed)

## Summary

Polishes send-out vendor guard UX in lab ordering, aligns consultation lab picker with enrolled-only catalog policy, and adds regression coverage for Laboratory desk tab routing.

## Changes

### Shared helpers

- `src/types/catalogEnrollment.ts` — `facilityAvailabilityFromLabCatalogRow()` prefers server `facilityAvailability`, maps `labFulfillmentType` when needed
- `src/clinical/constants/labFulfillment.ts` — `LAB_VENDOR_GUARD`, `isLabSendOutUnavailable()`
- `src/clinical/constants/orders.ts` — frontend mirror of `ORDER_CREATE_ERROR` codes
- `src/utils/apiError.ts` — friendly fallback for `NO_ACTIVE_LAB_VENDORS`

### Lab order form (`LabOrderForm.tsx`)

- `useLabVendorsList({ active: true, limit: 1 })` — zero vendors → send-out rows disabled with tooltip
- Submit errors surface backend `NO_ACTIVE_LAB_VENDORS` via `showApiErrorToast`

### Consultation plan (`VisitPlanSectionsFull.tsx`)

- Lab `LiveCatalogPicker` uses `enrolled_only=true`
- `adaptLabRows()` uses server fulfilment fields (not legacy `canPerform` heuristic)
- Same vendor guard on picker rows and AI recommendation “Order” chip
- Order placement errors use `showApiErrorToast`

### UI copy

- `FacilityAvailabilityBadge` title updated for enrolled-only context

### Tests

- `LabOrderForm.test.tsx` — disabled send-out when no vendors
- `LabOrderTracker.test.tsx` — mixed-order tab routing; POC in-house stays on In-house tab
- `labOrderTracker.fixtures.ts` — `IN_HOUSE_ORDER_FIXTURES.pocInHouse`

## Validation

```text
npm run lint && npx tsc -b          # frontend
npm run test -- LabOrderForm LabOrderTracker  # targeted vitest
```

## Manual tracer (deferred to QA)

- In-house: Collect → Receive → Process → Enter results → Verify
- Send-out: Assign vendor → Print → Mark sent → Awaiting report → Upload PDF
- Add vendor in Org setup → send-out picker re-enables

## Files touched

| Area | Path |
|------|------|
| Types | `src/types/catalogEnrollment.ts` |
| Constants | `src/clinical/constants/labFulfillment.ts`, `orders.ts` |
| Utils | `src/utils/apiError.ts` |
| Orders UI | `src/components/orders/LabOrderForm.tsx` |
| Consultation | `src/components/consultation/VisitPlanSectionsFull.tsx`, `FacilityAvailabilityBadge.tsx` |
| Tests | `LabOrderForm.test.tsx`, `LabOrderTracker.test.tsx`, `labOrderTracker.fixtures.ts` |
| Status | `prd/his-global-south/lab-catalog-fulfillment/slices/status.yaml` |
