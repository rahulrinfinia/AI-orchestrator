# Payer Master: Tariffs, Universal Code Mapping & Scheme Versioning Report

| Field | Value |
|---|---|
| **Plan** | [prd/his-global-south/payer-master/plan.md](../../prd/his-global-south/payer-master/plan.md) |
| **Slices** | PM-1 through PM-5 in [prd/his-global-south/payer-master/slices/](../../prd/his-global-south/payer-master/slices/) |
| **Branch** | `feat/opd-billing` |
| **Repo** | `projects/his-global-south/` |
| **Date** | 2026-09-12 |
| **Status** | Verified & Ready for UI Testing |

---

## 1. Summary of Completed Slices

### PM-1 — Tracer Bullet: Dual Rate Display & Inline Payer Code Crosswalk
- **Hospital Current Rate (KES)**: Displayed as bold cash baseline chargemaster rate (`KES 1,500`, `KES 15,000`).
- **Payer Claim Code [ ✍️ ]**: Inline editable text input mapping hospital clinical codes (`DELIV-NORMAL`, `CONSULT-NEW`) to payer statutory billing codes (`SHA-08-005`, `PMF-12-001`).
- **Contract Rate (KES) [ ✍️ ]**: Negotiated contracted tariff with `FREE (KES 0)` badge and `Make Free` action.
- **Persistence**: Persists tariffs in `item_prices` and crosswalk codes in `plan_benefits.service_code` with zero schema migrations.

### PM-2 — Batch Toolbar: 1-Click Copy Standard Rates & Global Discount %
- **`[ 📋 Copy Standard Hospital Rates ]`**: 1-click batch copy of standard hospital rates to contracted rate inputs.
- **`Discount: [ 10 ] % [ Apply ]`**: Computes $\text{round}(\text{Cash Baseline} \times (1 - \text{Discount} / 100))$.
- **`[ Free Follow-ups ]`**: Instantly sets return/follow-up consultations to `KES 0`.

### PM-3 — Kenya Statutory Presets: SHA Level 2 & Level 3 Matrix
- Built [shaStatutoryPresets.ts](../../projects/his-global-south/src/pages/payerCatalog/constants/shaStatutoryPresets.ts) using official Gazette `Revised POMSF Benefits Tariffs Matrix 19.03.2026.xlsx`:
  - **`[ 🇰🇪 Load SHA Level 2 ]`**: OPD Consult (`PMF-12-001` @ KES 1,200), Dental Scaling (`SHA-11-005` @ KES 3,000), Anti-D (`SHA-08-004` @ KES 8,000), Pediatric Glasses (`SHA-05-002` @ KES 1,500).
  - **`[ 🇰🇪 Load SHA Level 3 ]`**: Level 2 plus Inpatient Bed (`PMF-07-001` @ KES 2,240), Normal Delivery (`SHA-08-005` @ KES 10,000), Caesarean Section (`SHA-08-006` @ KES 30,000), X-Rays (`SHA-09-114` @ KES 1,000), Ultrasound (`SHA-09-105` @ KES 2,500), Minor Surgeries (`SHA-19-146` @ KES 14,000, etc.).

### PM-4 — Mechanism B: Scheme Versioning (Purana Data 100% Safe)
- **`[ 🔄 New Version (Purana Data Safe) ]`** in `PayerMasterWorkspace` and `AddChildPlanDialog`.
- Automatically clones rates (`item_prices`) and statutory claim codes (`plan_benefits.service_code`) into the new version.
- Freezes previous contract (`active = false`, `contracted_to = effectiveDate`), ensuring past invoices, receipts, and submitted claims remain 100% immutable.
- Frontdesk registration routes incoming encounters to the newly activated version.

### PM-5 — Downstream RCM Claim Generation & E2E Crosswalk
- `backend/src/modules/rcm/shared/claimLines.ts` resolves mapped `plan_benefits.service_code` as `payerBenefitCode`.
- FHIR claim resource emissions include mapped statutory code in `productOrService.coding.code`.

---

## 2. Validation & Pre-Merge Gates

| Check | Command | Result |
|---|---|---|
| **Frontend Lint** | `npm run lint` | **Pass (0 errors)** |
| **Frontend TypeScript** | `npx tsc --noEmit` | **Pass (0 errors)** |
| **Backend TypeScript Build** | `npm -C backend run build` | **Pass (0 errors)** |
| **Frontend Test Suite** | `npm run test` | **Pass (149 test files, 1,262 tests passed, 0 failures)** |
| **Backend Test Suite** | `npm run test:backend` | **Pass (66 test files, 480 tests passed, 0 failures)** |
| **E2E Crosswalk Integration** | `sha-e2e-crosswalk.test.ts` | **Pass (3/3 tests passed)** |

---

## 3. Files Modified & Added

### Frontend
- `src/pages/payerCatalog/components/PayerTariffsTab.tsx` (Dual rates, editable codes, batch tools, SHA presets)
- `src/pages/payerCatalog/components/AddChildPlanDialog.tsx` (Scheme versioning mode, rate/code cloning, freeze switch)
- `src/pages/payerCatalog/PayerMasterWorkspace.tsx` (New version trigger, scheme navigation)
- `src/pages/payerCatalog/constants/shaStatutoryPresets.ts` (Official Gazette Level 2 & Level 3 statutory rules)
- `src/services/orgPayerContracts.service.ts` (TypeScript types for `payerServiceCode` and `archivePreviousContractId`)
- Tests: `PayerTariffsTab.test.tsx`, `PayerMasterWorkspace.test.tsx`, `orgPayerContracts.service.test.ts`

### Backend
- `backend/src/modules/payerCatalog/payerCatalog.service.ts` (`getContractTariffMatrix`, `updateContractTariffMatrix`, `addChildPlanContract` with rate & code cloning and contract archiving)
- `backend/src/modules/payerCatalog/payerCatalog.controller.ts` (Handlers for tariffs and child plan versioning)
- `backend/src/modules/payerCatalog/payerCatalog.types.ts` (`TariffItemInput`, `AddChildPlanInput`)
- `backend/src/modules/rcm/shared/claimLines.ts` (Fallback to mapped `plan_benefits.service_code`)
- Tests: `payer-enterprise-hybrid.test.ts`, `sha-e2e-crosswalk.test.ts`
