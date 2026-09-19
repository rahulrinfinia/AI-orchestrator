# PR #58 — `ORDER_STATUS` constants in lab order status mapping

**Project:** `his-global-south`  
**Reviewer:** @hemantinfinia — `"Constants."` on `mapApiOrderToLabStatus` string comparisons  
**Status:** Implemented

---

## Problem

`labOrderStatus.mapping.ts` compared `apiStatus` against raw strings (`'pending'`, `'processing'`, `'completed'`) and duplicated them in `LAB_UI_STATUS_TO_API`.

Backend already defines `ORDER_STATUS` in `clinical.constants.ts`; frontend had no mirror.

---

## Fix

1. Added `ORDER_STATUS` + `ORDER_STATUSES` + `OrderApiStatus` to `src/clinical/constants/orders.ts` (mirror of backend).
2. Updated `labOrderStatus.mapping.ts` — `LAB_UI_STATUS_TO_API` values and `mapApiOrderToLabStatus` branches use `ORDER_STATUS.*`.
3. Updated unit tests to pass `ORDER_STATUS` keys instead of string literals.

**No importer path changes** — `LAB_UI_STATUS_TO_API` export unchanged; `labOrders.ts` re-export unaffected.

---

## Draft reply

> Addressed — API status strings now use `ORDER_STATUS` from `orders.ts` (mirror of backend `ORDER_STATUS`) in both `LAB_UI_STATUS_TO_API` and `mapApiOrderToLabStatus`. Runtime values unchanged.
