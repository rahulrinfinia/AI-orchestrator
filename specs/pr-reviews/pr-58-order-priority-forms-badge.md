# PR #58 — `ORDER_PRIORITY` in order forms + `OrderStatusBadge`

**Project:** `his-global-south`  
**Branch:** `feat/dra-radiology-inhouse-approval`  
**Follow-up:** Tracker `PriorityBadge` fixed; extend to forms + shared badge  
**Pattern:** `ORDER_PRIORITY` / `ORDER_PRIORITY_LABELS` from `clinical/constants/orders.ts`

---

## Scope

| File | Raw strings to replace | Notes |
|------|------------------------|-------|
| `OrderStatusBadge.tsx` | Local `OrderPriority` type; `"stat"` / `"urgent"`; hardcoded labels | Shared badge — highest reuse value |
| `OrderPrioritySelect.tsx` | `"stat"` toast check; SelectItem `value="routine"` etc. | Used by both order forms |
| `LabOrderForm.tsx` | Success modal badge; Place Order button class + label; `initialPriority = "routine"` | Import `OrderPriority` from constants |
| `RadiologyOrderForm.tsx` | Success modal badge + est. wait; Place Order button; `initialPriority = "routine"` | Add `ORDER_PRIORITY_EST_WAIT` for wait copy |
| `ordersWorkspace/types.ts` | Duplicate inline `OrderPriority` union | Re-export from constants (single source) |

**Out of scope:** Status half of `OrderStatusBadge` (order status labels — separate concern).

---

## Step 1 — Add est. wait labels (radiology success modal only)

In `clinical/constants/orders.ts` after `ORDER_PRIORITY_LABELS`:

```typescript
export const ORDER_PRIORITY_EST_WAIT: Record<OrderPriority, string> = {
  [ORDER_PRIORITY.ROUTINE]: '~1–2 hours',
  [ORDER_PRIORITY.URGENT]: '~30 min',
  [ORDER_PRIORITY.STAT]: 'Immediate',
};
```

---

## Step 2 — Single `OrderPriority` type

`ordersWorkspace/types.ts`:

```typescript
export type { OrderPriority } from '@/clinical/constants/orders';
```

Remove inline `"routine" | "urgent" | "stat"`.

---

## Step 3 — `OrderStatusBadge.tsx`

- Import `ORDER_PRIORITY`, `ORDER_PRIORITY_LABELS`, `type OrderPriority` from `@/clinical/constants/orders`
- Remove local type alias
- Compare with `ORDER_PRIORITY.*`; labels from `ORDER_PRIORITY_LABELS`

---

## Step 4 — `OrderPrioritySelect.tsx`

- Import `ORDER_PRIORITY`, `ORDER_PRIORITY_VALUES`, `ORDER_PRIORITY_LABELS`, `OrderPriority` from constants
- `handleChange`: `next === ORDER_PRIORITY.STAT`
- Map `ORDER_PRIORITY_VALUES` → `SelectItem value={p}` label={ORDER_PRIORITY_LABELS[p]}

---

## Step 5 — `LabOrderForm.tsx`

- Import `ORDER_PRIORITY`, `ORDER_PRIORITY_LABELS`, `OrderPriority` from constants (drop workspace type import if redundant)
- `initialPriority = ORDER_PRIORITY.ROUTINE`
- Success modal: `priority: OrderPriority`; badge styling via `ORDER_PRIORITY.*`; label via `ORDER_PRIORITY_LABELS`
- Submit button: `ORDER_PRIORITY.STAT` / `URGENT` for className; suffix via labels

---

## Step 6 — `RadiologyOrderForm.tsx`

Same as lab form + success modal est. wait via `ORDER_PRIORITY_EST_WAIT[priority]`.

---

## Validation

```sh
cd projects/his-global-south
npx tsc -b
npx vitest run src/components/orders/__tests__/LabOrderForm.test.tsx
rg 'priority === \"|value=\"routine\"|value=\"urgent\"|value=\"stat\"' \
  src/components/orders/OrderStatusBadge.tsx \
  src/components/orders/OrderPrioritySelect.tsx \
  src/components/orders/LabOrderForm.tsx \
  src/components/orders/RadiologyOrderForm.tsx
# Expected: no matches
```

---

## Approval

- [x] Human approves — implement immediately
- [x] Implemented — tsc clean; 64/64 order tests pass; zero stale priority literals in scope files
