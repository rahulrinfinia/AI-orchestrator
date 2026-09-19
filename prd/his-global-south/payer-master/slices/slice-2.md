# PM-2 — Batch Toolbar: 1-Click Copy Standard Rates & Global Discount %

| Field | Value |
|---|---|
| **Feature** | `payer-master` / `accepted-plans` |
| **Slice** | 2 |
| **Depends on** | [PM-1](./slice-1.md) |
| **Status** | Planned |
| **Goal** | Administrator can bulk-copy standard hospital rates or apply a global percentage discount across all services in 1 click. |

---

## 1. Purpose

Eliminate manual row-by-row rate entry when negotiating contracts with private insurers or corporate panels. Administrators can either mirror standard hospital cash rates (100% baseline) or calculate an agreed panel discount (e.g. 10% or 15% off hospital chargemaster) in one operation.

---

## 2. Scope & Implementation Details

### Frontend (`projects/his-global-south/src/pages/payerCatalog/components/PayerTariffsTab.tsx`)

#### A. Top Toolbar Components
Render a dedicated action banner above the table:
```tsx
<div className="flex flex-wrap items-center gap-3 p-3 bg-muted/40 rounded-lg border">
  <Button variant="outline" size="sm" onClick={handleCopyStandardRates}>
    <Copy className="h-4 w-4 mr-2" />
    Copy Standard Hospital Rates
  </Button>

  <div className="flex items-center gap-1.5 border-l pl-3">
    <span className="text-xs font-medium text-muted-foreground">Discount:</span>
    <Input
      type="number"
      min="0"
      max="100"
      value={discountPercent}
      onChange={(e) => setDiscountPercent(e.target.value)}
      className="w-16 h-8 text-center"
      placeholder="%"
    />
    <span className="text-xs text-muted-foreground">%</span>
    <Button variant="secondary" size="sm" onClick={handleApplyDiscount}>
      Apply Discount
    </Button>
  </div>

  <Button variant="ghost" size="sm" onClick={handleSetFollowupsFree}>
    Set Follow-ups Free (KES 0)
  </Button>
</div>
```

#### B. Batch Handlers
1. **`handleCopyStandardRates`**:
   - Loops over all `items` in state.
   - For every item with `standardCashPrice > 0`, sets `customPrice = standardCashPrice`.
   - Triggers `isDirty = true` and shows success toast: `Copied standard rates to ${count} services`.

2. **`handleApplyDiscount`**:
   - Validates `discountPercent` is between 0 and 100.
   - For every item with `standardCashPrice > 0`:
     $$\text{customPrice} = \text{Math.round}\left(\text{standardCashPrice} \times \left(1 - \frac{\text{discountPercent}}{100}\right)\right)$$
   - Triggers `isDirty = true` and shows success toast: `Applied ${discountPercent}% discount to ${count} services`.

3. **`handleSetFollowupsFree`**:
   - Filters items where `code` or `itemCode` matches `CONSULT-FLWUP` or contains `FOLLOWUP`.
   - Sets `customPrice = 0`.

---

## 3. Automated Tests & Acceptance

1. **Copy Standard Rates Test**:
   - Initialize matrix with 3 items (`KES 1500`, `KES 10000`, `KES 45000`).
   - Click "Copy Standard Hospital Rates".
   - Verify all 3 `customPrice` fields equal `1500`, `10000`, `45000`.
2. **Global Discount Test**:
   - Set discount to `10%`. Click "Apply Discount".
   - Verify `1500` becomes `1350`, `10000` becomes `9000`, and `45000` becomes `40500`.
3. **Set Follow-ups Free Test**:
   - Click "Set Follow-ups Free".
   - Verify `CONSULT-FLWUP` contracted rate is set to `0`.
