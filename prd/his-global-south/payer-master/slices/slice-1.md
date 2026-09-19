# PM-1 — Tracer Bullet: Dual Rate Display & Inline Payer Code Crosswalk

| Field | Value |
|---|---|
| **Feature** | `payer-master` / `accepted-plans` |
| **Slice** | 1 (Tracer Bullet) |
| **Depends on** | None |
| **Status** | Planned |
| **Goal** | Administrator views hospital current cash rate and can edit both the contracted rate and the payer's claim code in every service row. |

---

## 1. Purpose

Provide the foundational vertical slice connecting the frontend rate matrix table with backend persistence for:
1. **Hospital Current Rate (KES)**: Read-only baseline from the hospital's active Standard chargemaster.
2. **Payer Claim Code `[ ✍️ ]`**: Editable text input to map hospital internal services (`CONSULT-NEW`, `DELIV-NORMAL`) to payer codes (`PMF-12-001`, `SHA-08-005`).
3. **Contracted Rate `[ ✍️ ]`**: Editable numeric input for agreed tariff.

---

## 2. Scope & Implementation Details

### Frontend (`projects/his-global-south/src/pages/payerCatalog/components/PayerTariffsTab.tsx`)
- Add column `Hospital Current Rate (KES)`:
  - Renders `item.standardCashPrice` formatted with commas (e.g. `KES 1,500`).
  - Read-only, styled with muted/bold font-mono.
- Add column `Payer Claim Code [ ✍️ ]`:
  - Renders an input field `value={row.payerServiceCode ?? ''}` with placeholder `e.g. PMF-12-001`.
  - On change: updates local row state.
- Existing `Contracted Rate [ ✍️ ]`:
  - Renders numeric input `value={row.customPrice ?? ''}`.
- Update Save payload to submit:
  ```typescript
  items: Array<{
    itemId: string;
    price: number | null;
    payerServiceCode?: string | null;
  }>
  ```

### Backend (`projects/his-global-south/backend/src/modules/payerCatalog/`)
- **`payerCatalog.service.ts` -> `getContractTariffMatrix`**:
  - For each service row, lookup `plan_benefits.service_code` where `plan_benefits.plan_id = contract.insurer_plan_id` and `plan_benefits.service_catalog_id = items_master.service_catalog_id`.
  - Return `payerServiceCode: string | null` in each item record.
- **`payerCatalog.service.ts` -> `updateContractTariffMatrix`**:
  - Accept `payerServiceCode` in items update list.
  - In the database transaction:
    1. Upsert `item_prices` with `unit_price = item.price`.
    2. If `payerServiceCode` is provided and the item links to `service_catalog_id`:
       Upsert `plan_benefits` row with `service_code = item.payerServiceCode` for this `plan_id`.

---

## 3. Automated Tests & Acceptance

1. **Backend Integration Test**:
   - Query contract matrix -> verify `standardCashPrice` is returned.
   - Send `PUT /matrix` with `price: 1200` and `payerServiceCode: 'PMF-12-001'` for `CONSULT-NEW`.
   - Query contract matrix again -> verify `payerServiceCode === 'PMF-12-001'` and `payerPrice === 1200`.
2. **Frontend Component Test**:
   - Render `PayerTariffsTab` with mock data.
   - Verify `Hospital Current Rate` column displays formatted cash price.
   - Type new claim code in `Payer Claim Code` field -> verify field updates and Save button enables.
