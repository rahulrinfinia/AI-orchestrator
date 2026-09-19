# PM-5 — Downstream RCM Claim Generation & E2E Crosswalk

| Field | Value |
|---|---|
| **Feature** | `payer-master` / `accepted-plans` |
| **Slice** | 5 |
| **Depends on** | [PM-1](./slice-1.md), [PM-2](./slice-2.md), [PM-3](./slice-3.md), [PM-4](./slice-4.md) |
| **Status** | Planned |
| **Goal** | Downstream billing and electronic claims automatically emit the mapped payer statutory claim code and contracted credit rate. |

---

## 1. Purpose

The ultimate objective of crosswalk mapping is seamless billing and claim filing. When a doctor or cashier selects a familiar hospital service (`Normal Delivery`), the downstream RCM claim file must emit the exact statutory code (`SHA-08-005`) and the contracted tariff (KES 10,000 on 100% Credit), without requiring clinical staff to memorize insurance codes.

---

## 2. Scope & Implementation Details

### A. Claim Generation (`backend/src/modules/rcm/shared/handlers.ts`)
- During receipt line adjudication and claim line creation:
  - Read `plan_benefits.service_code` for the active patient's plan and the line's `service_catalog_id`.
  - Set `claim_lines.service_code = plan_benefits.service_code ?? service_catalog.code`.
  - Set `claim_lines.unit_price = item_prices.unit_price`.
  - Set `claim_lines.claimed_amount = item_prices.unit_price * quantity`.
  - Set `claim_lines.patient_copay = 0` (for 100% credit statutory plans).

### B. End-to-End Verification
- **Test Flow**:
  1. Patient registered with `Social Health Authority (SHA) Level 3 Plan`.
  2. Patient checked into Maternity Ward.
  3. Doctor documents Normal Delivery (`DELIV-NORMAL`).
  4. Cashier reviews bill:
     - Patient copay: KES 0.
     - Payer receivable: KES 10,000.
  5. Claim generated:
     - Service Code: `SHA-08-005`.
     - Amount: KES 10,000.00.
     - Status: `ready_for_submission`.

---

## 3. Acceptance Criteria

- All unit and integration tests across backend and frontend pass (`npm test`).
- TypeScript compiler emits 0 errors (`npx tsc --noEmit`).
