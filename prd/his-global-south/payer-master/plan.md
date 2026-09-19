# Comprehensive Plan: Universal Payer Code Mapping, Tariffs & Scheme Versioning

| Field | Value |
|-------|-------|
| **Project** | `his-global-south` |
| **Feature** | `payer-master` / `accepted-plans` (Tab 1 Tariffs & Crosswalk) |
| **Date** | 2026-09-12 |
| **Status** | Draft — **Awaiting Human Approval** |
| **Related docs** | [prd.md](./prd.md) · [ticket.md](./ticket.md) · [technical-design.md](./technical-design.md) |

---

## 1. Executive Summary & Problem Solved

In hospital revenue cycle management (RCM) across Kenya and the Global South, hospitals face three critical challenges when dealing with health insurance and statutory payers (such as the Social Health Authority / SHA, Jubilee, Britam, or corporate panels):
1. **Payer Claim Code Mismatch**: The hospital uses its own internal clinical codes (e.g. `CONSULT-NEW`, `DELIV-NORMAL`), but every payer mandates their own claim submission codes (e.g. SHA mandates `PMF-12-001` for OPD, `SHA-08-005` for Normal Delivery).
2. **Tedious Rate Negotiation & Data Entry**: Contracts are negotiated either at standard hospital rates, at a global discount (e.g. "10% off hospital chargemaster"), or according to government statutory ceilings. Currently, hospital staff must type hundreds of rates row-by-row.
3. **Fee Revision Risk (Breaking Past Patient Records)**: When payers update tariffs (e.g. SHA 2026 gazette matrix vs 2027 revision), updating rates in-place corrupts past bills, audit trails, and pending claims.

### The Solution: 5-Pillar Architecture
- **Pillar 1: 5-Column Rate Card & Crosswalk Table** displaying Hospital Current Rate side-by-side with an editable `Payer Claim Code [ ✍️ ]` and `Contracted Rate [ ✍️ ]`.
- **Pillar 2: 1-Click "Copy Standard Hospital Rates"** that copies base cash rates across all services at the overall level.
- **Pillar 3: Overall "Global Discount %" Applier** calculating flat negotiated discounts across all rows in 1 click.
- **Pillar 4: 1-Click "Load SHA Level 2 / Level 3" Statutory Matrix** pre-populating tariffs and codes from Kenya's official 19.03.2026 gazette.
- **Pillar 5: Mechanism B: Scheme Versioning (Purana Data 100% Safe)** where updating a tariff creates a new version with cloned mappings while freezing past versions to protect historical records.

---

## 2. Interactive Tariff Management Toolbar & Table Design

In **Payer Master / Accepted Plans (`/accepted-plans` & `/payer-master`) -> Tab 1: Tariffs & Services ($)**:

### 2.1 Top Toolbar: Global Batch Operations
```text
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ TAB 1 TOOLBAR: Global Rate & Mapping Actions                                                                     │
│                                                                                                                  │
│ [ 📋 Copy Standard Hospital Rates ]  │  Discount: [ 10 ] %  [ Apply Discount ]                                   │
│ [ 🇰🇪 Load SHA Level 2 Data ]         │  [ 🇰🇪 Load SHA Level 3 Data ]  │  [ 🔄 Create New Scheme Version ]         │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Table Layout: Side-by-Side Comparison & Inline Crosswalk
```text
┌──────────────────┬───────────────┬──────────────────────┬──────────────────────┬─────────────────┬───────────────┐
│ Hospital Service │ Hospital Code │ Payer Claim Code [✍️]│ Hospital Current Rate│ Contracted Rate │ Actions       │
├──────────────────┼───────────────┼──────────────────────┼──────────────────────┼─────────────────┼───────────────┤
│ OPD Consultation │ CONSULT-NEW   │ [ PMF-12-001       ] │ KES 1,500            │ [ 1,200       ] │ [ Make Free ] │
│ Normal Delivery  │ DELIV-NORMAL  │ [ SHA-08-005       ] │ KES 15,000           │ [ 10,000      ] │ [ Make Free ] │
│ Caesarean Section│ DELIV-CS      │ [ SHA-08-006       ] │ KES 45,000           │ [ 30,000      ] │ [ Make Free ] │
│ General Ward Bed │ NURS-BED-GEN  │ [ PMF-07-001       ] │ KES 3,500 / day      │ [ 2,240       ] │ [ Make Free ] │
│ Chest X-Ray PA   │ RAD-CXR-PA    │ [ SHA-09-114       ] │ KES 1,200            │ [ 1,000       ] │ [ Make Free ] │
│ Obstetric US     │ RAD-US-OBS    │ [ SHA-09-105       ] │ KES 3,000            │ [ 2,500       ] │ [ Make Free ] │
│ Incision & Drain │ PROC-MINOR-ID │ [ SHA-19-146       ] │ KES 18,000           │ [ 14,000      ] │ [ Make Free ] │
│ Return Follow-up │ CONSULT-FLWUP │ [ PMF-12-001       ] │ KES 800              │ [ 0           ] │ [ FREE ]      │
└──────────────────┴───────────────┴──────────────────────┴──────────────────────┴─────────────────┴───────────────┘
```

---

## 3. Four Rate Setting & Mapping Methods

### Method 1: 1-Click "Copy Standard Hospital Rates" (100% Baseline)
- **Use Case:** Payer agrees to reimburse the hospital at standard chargemaster cash prices.
- **Action:** Admin clicks **`[ 📋 Copy Standard Hospital Rates ]`**.
- **Behavior:**
  - Reads `service.standardPrice` (Hospital Current Rate).
  - Copies it directly into the `Contracted Rate` input for every row in the active matrix.
  - Leaves `Payer Claim Code` untouched or defaults to hospital code if blank.

### Method 2: Overall "Global Discount %" (Negotiated Panel Discount)
- **Use Case:** Corporate payer (e.g. Britam, Jubilee, APA) negotiates a flat discount (e.g. 10% or 15% off hospital rates).
- **Action:** Admin types `10` into the Discount % box and clicks **`[ Apply Discount ]`**.
- **Formula:**
  $$\text{Contracted Rate} = \text{round}\left(\text{Hospital Current Rate} \times \left(1 - \frac{\text{Discount}}{100}\right)\right)$$
- **Behavior:**
  - Instantly updates all service rows with the discounted rate.
  - Staff can still manually fine-tune individual outlier rows (e.g., set specialized surgery or MRI manually).

### Method 3: Statutory Pre-Fill (Kenya SHA / POMSF Level 2 & Level 3)
- **Use Case:** Payer is the Social Health Authority (SHA) governed by Kenya's 19.03.2026 gazette matrix.
- **Action:** Admin clicks **`[ 🇰🇪 Load SHA Level 2 Data ]`** or **`[ 🇰🇪 Load SHA Level 3 Data ]`**.
- **Exact Extracted Data Seeded**:
  - **Level 2 (Dispensary)**:
    - OPD Consultation: Code `PMF-12-001` @ KES 1,200
    - Anti-D Injection: Code `SHA-08-004` @ KES 8,000
    - Pediatric Glasses: Code `SHA-05-002` @ KES 1,500
    - Dental Scaling: Code `SHA-11-005` @ KES 3,000
  - **Level 3 (Health Centre & Maternity)**:
    - Inpatient Bed Per Diem: Code `PMF-07-001` @ KES 2,240 / day
    - Normal Delivery: Code `SHA-08-005` @ KES 10,000 flat
    - Caesarean Section: Code `SHA-08-006` @ KES 30,000 flat
    - Multiple Births Vaginal: Code `SHA-08-007` @ KES 13,000 flat
    - Multiple Births CS: Code `SHA-08-008` @ KES 39,000 flat
    - Diagnostic X-Rays: Code `SHA-09-106+` @ KES 1,000 flat
    - Obstetric Ultrasound: Code `SHA-09-105` @ KES 2,500 flat
    - 122 Minor Surgeries (e.g., Incision & Drainage `SHA-19-146` @ KES 14,000; Circumcision `SHA-19-155` @ KES 22,400; Debridement `SHA-19-176` @ KES 33,600)
    - Palliative Care: Code `PMF-13-001` @ KES 2,240 / day
    - Substance Abuse Rehab: Code `PMF-10-005` @ KES 67,200 (45 days)

### Method 4: Manual Granular Mapping (Future / Any New Payer)
- **Use Case:** A brand-new insurer or corporate panel joins the hospital.
- **Action:** Staff types the payer's custom billing code directly into the `Payer Claim Code [ ✍️ ]` input and sets the negotiated rate.
- **Result:** Fully dynamic; zero developer code changes required when onboarding new payers.

---

## 4. Mechanism B: Scheme Versioning (Purana Data 100% Safe)

To prevent breaking historical patient bills, past receipts, or active claim audits:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ SCHEME VERSION LIFECYCLE                                                      │
│                                                                              │
│ [ 2026 Fee Schedule (v1) ] ──────────────► [ 2027 Fee Schedule (v2) ]        │
│ • Contract ID: c-001                       • Contract ID: c-002              │
│ • Price List: pl-001                       • Price List: pl-002 (Cloned)     │
│ • Active: FALSE (Frozen/Read-Only)         • Active: TRUE (Current)          │
│ • Historical Invoices & Claims: 100% SAFE  • New Patient Check-Ins Go Here   │
└──────────────────────────────────────────────────────────────────────────────┘
```

1. **Version Creation**:
   - Admin clicks `[ 🔄 Create New Scheme Version ]`.
   - Dialog asks for: Version Label (e.g. `SHA Level 3 - 2027 Revision`), Effective Date (`contracted_from`), and Expiry Date.
2. **Atomic Cloning**:
   - Backend creates a brand-new `price_lists` record (`pl-002`).
   - Copies all `item_prices` and `plan_benefits` (including `service_code` crosswalks) from `pl-001` to `pl-002`.
3. **Immutability of Version 1**:
   - Version 1's `contracted_to` is set to the cutoff date, and `active` is set to `false`.
   - Past encounters, bills, and claim line items retain their reference to `c-001` and `pl-001`. Their numbers can never change.
4. **Frontdesk Automatic Routing**:
   - Frontdesk patient check-in only displays schemes where `active = true` and `CURRENT_DATE BETWEEN contracted_from AND contracted_to`.
   - All new patients automatically receive Version 2 rates and claim codes.

---

## 5. Data Model & Crosswalk Persistence (Zero Schema Migrations)

We leverage existing PostgreSQL tables without modifying core schemas:

### A. Rate Storage (`item_prices`)
- `price_list_id`: Points to the specific contract version's price list.
- `item_id`: Points to `service_catalog.id` (or medication/lab test).
- `price`: Contracted rate (e.g. `10000.00`).

### B. Code Crosswalk Storage (`plan_benefits`)
- `plan_id`: Points to `insurer_plans.id`.
- `service_catalog_id`: Points to the hospital's internal service (`service_catalog.id`).
- `service_code`: **Stores the Payer Claim Code** (e.g. `PMF-12-001`, `SHA-08-005`, `CPT-59400`).
- `coverage_percentage`: 100 (for Credit billing).

### C. Downstream Claim Adjudication (`backend/src/modules/rcm/shared/handlers.ts`)
When a clinician orders or a cashier bills a service:
1. System identifies the patient's active contract and price list.
2. Resolves `item_prices.price` as the contracted tariff (Patient pays KES 0, balance moves to Credit AR).
3. Resolves `plan_benefits.service_code` as the claim code.
4. Electronic claim payload emits:
   ```json
   {
     "hospitalServiceCode": "DELIV-NORMAL",
     "hospitalServiceName": "Normal Delivery",
     "payerClaimCode": "SHA-08-005",
     "claimedAmount": 10000.00,
     "patientShare": 0.00,
     "payerShare": 10000.00
   }
   ```

---

## 6. Decomposed Vertical Slices

The feature is decomposed into 5 vertical slices under [`slices/`](./slices/README.md):

| Slice | Spec Link | Title | Core Deliverable |
|---|---|---|---|
| **PM-1** | [slice-1.md](./slices/slice-1.md) | **Tracer Bullet: Dual Rate Display & Inline Crosswalk** | `Hospital Current Rate (KES)` + `Payer Claim Code [ ✍️ ]` + `Contracted Rate [ ✍️ ]` table columns with DB persistence. |
| **PM-2** | [slice-2.md](./slices/slice-2.md) | **Batch Toolbar: Copy Standard & Global Discount %** | `[ 📋 Copy Standard Hospital Rates ]` + `Discount: [ 10 ] % [ Apply Discount ]` + `[ Set Follow-ups Free ]`. |
| **PM-3** | [slice-3.md](./slices/slice-3.md) | **Kenya Statutory Presets (SHA Level 2 & 3 Matrix)** | Official 19.03.2026 gazette tariffs & claim codes pre-fill in 1 click. |
| **PM-4** | [slice-4.md](./slices/slice-4.md) | **Mechanism B: Scheme Versioning (Purana Data Safe)** | `[ 🔄 Create New Scheme Version ]` with atomic cloning and freezing of past versions. |
| **PM-5** | [slice-5.md](./slices/slice-5.md) | **Downstream RCM Claim Generation & E2E Crosswalk** | Automatic emission of mapped `payerClaimCode` on insurance claim line items. |

---

## 7. Approval Gate

- **Status**: Approved by Human
- **Date**: 2026-09-12
- **Authorized Action**: Implementation of slices PM-1 through PM-5 proceeding.
