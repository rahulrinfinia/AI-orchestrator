# PM-4 — Mechanism B: Scheme Versioning (Purana Data Safe)

| Field | Value |
|---|---|
| **Feature** | `payer-master` / `accepted-plans` |
| **Slice** | 4 |
| **Depends on** | [PM-1](./slice-1.md) |
| **Status** | Planned |
| **Goal** | Administrator creates a new version of a payer contract with cloned rates; old version is frozen as read-only to protect historical bills and audit trails. |

---

## 1. Purpose

When a payer (such as SHA, Britam, or Jubilee) updates fee schedules or clinical coverage rules, updating existing rates in-place corrupts past patient invoices, previous receipts, and submitted claims. Scheme Versioning guarantees 100% data immutability for past patient care.

---

## 2. Scope & Implementation Details

### A. Frontend UI (`PayerTariffsTab.tsx` & `AcceptedPlansPage.tsx`)
- Add button: `[ 🔄 Create New Scheme Version ]`.
- Opens a modal dialog (`CreatePlanVersionDialog.tsx`):
  - **New Version Name**: e.g. `SHA Level 3 (2027 Gazette Revision)`
  - **Effective From Date**: defaults to tomorrow or chosen date.
  - **Clone Options**: Checkbox `[x] Clone current contracted rates and payer codes` (enabled by default).
  - **[ Create Version ]** button.

### B. Backend API (`payerCatalog.service.ts`)
- Implement `createContractVersion(organizationId, sourceContractId, input)`:
  - Runs in an atomic database transaction:
    1. Read `sourceContract` and its `price_list_id`.
    2. Create new `price_lists` record:
       - `name: input.versionName`
       - `code: ${sourceContract.code}-V${nextVersion}`
       - `currency: sourceContract.currency`
    3. Copy all `item_prices` from `sourceContract.price_list_id` to `newPriceList.id`.
    4. Copy all `plan_benefits` (preserving `service_code` crosswalk).
    5. Create new `org_payer_contracts` record:
       - `price_list_id = newPriceList.id`
       - `active = true`
       - `contracted_from = input.effectiveFrom`
       - `contracted_to = input.contractedTo ?? null`
    6. Update `sourceContract`:
       - `contracted_to = input.effectiveFrom`
       - `active = false` (or tagged as archived/frozen).
  - Return `{ newContractId, newPriceListId }`.

### C. Frontdesk Routing Protection
- Frontdesk registration and check-in queries:
  ```sql
  WHERE active = true
    AND CURRENT_DATE BETWEEN contracted_from AND COALESCE(contracted_to, '9999-12-31')
  ```
- Historical visits retain their foreign key to the previous contract and price list. Their charges and claim codes are 100% immutable.

---

## 3. Automated Tests & Acceptance

1. **Atomic Clone Test**:
   - Given Contract v1 with `CONSULT-NEW` @ KES 1,200 (`PMF-12-001`).
   - Execute `createContractVersion(orgId, contract1Id, { versionName: '2027 Revision' })`.
   - Verify Contract v2 exists with its own unique `price_list_id`.
   - Verify Contract v2 has `CONSULT-NEW` @ KES 1,200 (`PMF-12-001`).
2. **Immutability Test**:
   - Update `CONSULT-NEW` in Contract v2 to KES 1,500 (`PMF-12-002`).
   - Query Contract v1 -> verify price is still KES 1,200 and code is still `PMF-12-001`.
   - Verify Contract v1 is marked `active = false`.
