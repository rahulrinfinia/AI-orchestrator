# Enterprise HMIS Dynamic Department & Service Mapping Plan

## Overview
This plan establishes a clean, production-grade **Department-to-Service Mapping Architecture** across `his-global-south`. 

Every department (General OPD, Emergency, Maternity/OBGYN, Paediatrics, Surgery, or any future department) can directly configure its **Doctor Consultation Service**, **Triage/Intake Service**, and **Free Follow-up Grace Days** from the Service Catalog. This completely eliminates hardcoded code strings (`CONSULT-NEW`, `CONSULT-OPD`, `CONSULT-EMERGENCY`, `TRIAGE-ED`, `REG-FEE`) across all billing handlers.

---

## 1. Database Schema & Migration

### Schema Extension on `departments` Table:
```sql
ALTER TABLE departments 
ADD COLUMN default_consultation_service_id uuid REFERENCES service_catalog(id) ON DELETE SET NULL,
ADD COLUMN default_followup_service_id uuid REFERENCES service_catalog(id) ON DELETE SET NULL,
ADD COLUMN default_triage_service_id uuid REFERENCES service_catalog(id) ON DELETE SET NULL,
ADD COLUMN followup_grace_days integer DEFAULT 7,
ADD COLUMN is_followup_free boolean DEFAULT true;
```

### Initial Data Migration:
Seed the existing 11 departments with their initial canonical service links (e.g. OPD → `CONSULT-NEW`, Emergency → `CONSULT-EMERGENCY` & `TRIAGE-ED`, etc.) so current data seamlessly migrates.

---

## 2. Dynamic Service Roles per Department

When configuring **ANY** department in Facility Master:

| Configuration Field | Dropdown Display | Purpose |
| :--- | :--- | :--- |
| **Consultation Service** | `[ CONSULT-OPD — General OPD Consultation Fee ]` | Doctor's primary consultation fee |
| **Follow-up Service** | `[ CONSULT-FOLLOWUP — OPD Follow-up Consultation Fee ]` | Follow-up / review visit fee |
| **Triage / Intake Service** | `[ TRIAGE-ED — Emergency Triage Assessment Fee ]` | Nursing triage / intake assessment fee |
| **Free Follow-up Window** | `[ 7 ] Days` | Revisit grace window (e.g., 7 days, 14 days, or 0 days) |
| **Is Follow-up Free?** | `[ Toggle: Yes / No ]` | If enabled, follow-ups within grace days are billed at **₹0.00 (Fee Waived)** |

---

## 3. How Check-in & Triage Resolve Dynamically (Zero Hardcoding)

```mermaid
flowchart TD
    subgraph Flow1 ["Entry Point 1: Normal Registration Desk (/patients/register)"]
        N_Reg["Receptionist selects Department\n(e.g., Emergency / OPD / Maternity)"]
        N_Check{"Visit Type?"}
        N_New["New Visit: Pick department.default_consultation_service_id\n(e.g., Emergency Doctor Fee: ₹1,500)"]
        N_Followup["Follow-up Visit: Check department.followup_grace_days\n(Free ₹0 or department.default_followup_service_id)"]
        
        N_Reg --> N_Check
        N_Check -->|New| N_New
        N_Check -->|Follow-up| N_Followup
    end

    subgraph Flow2 ["Entry Point 2: Dedicated Emergency Triage Desk (Fast-Track)"]
        T_Intake["Nurse performs Emergency Triage\n(Vitals + Acuity Red/Yellow/Green)"]
        T_Charge["1. Posts Triage Charge:\nReads department.default_triage_service_id\n(e.g., Triage Assessment: ₹0.00 / ₹100)"]
        
        T_Doc["2. Doctor attends patient in ER"]
        T_DocCharge["Posts Doctor Consultation Charge:\nReads department.default_consultation_service_id\n(e.g., Emergency Doctor Fee: ₹1,500)"]
        
        T_Intake --> T_Charge --> T_Doc --> T_DocCharge
    end
```

---

## 4. Frontend Department Configuration UI

In **Facility Master (`/facilityMaster`) → Edit Department**:
* **Doctor Consultation Service:** Searchable Dropdown displaying **`[CODE] — Service Name (Standard Rate: ₹...)`**
  * *Example:* `[CONSULT-OPD] General OPD Consultation Fee (₹500.00)`
  * *Example:* `[CONSULT-EMERGENCY] Emergency Doctor Consultation Fee (₹1,500.00)`
* **Triage / Intake Service:** Searchable Dropdown displaying **`[CODE] — Service Name`**
  * *Example:* `[TRIAGE-ED] Emergency Triage & Acuity Assessment (₹100.00)`
* **Follow-up Service:** Searchable Dropdown displaying **`[CODE] — Service Name`**
  * *Example:* `[CONSULT-FOLLOWUP] Follow-up Review Consultation (₹300.00)`
* **Free Follow-up Window:** `[ 7 ] Days` (Configurable: e.g. 0, 3, 7, 14, 30 days)
* **Free Follow-up Policy:** `[ Toggle: 100% Free during grace window ]` (If ON, auto-bills ₹0.00 during the window)

---

## 5. Automatic Price Fetching & Payment Method Screen (`CollectPaymentDialog`)

The payment screen must seamlessly consume the auto-calculated line items from the database without any manual price entry by the cashier:

```mermaid
sequenceDiagram
    autonumber
    participant UI as Registration / Checkout UI (PatientRegister.tsx)
    participant API as Fastify Backend API
    participant DB as PostgreSQL (departments + item_prices)
    participant Receipt as Invoicing & Receipts Service
    participant PayModal as Payment Method Dialog (CollectPaymentDialog.tsx)

    UI->>API: 1. User selects Department (e.g. Maternity / OPD / Emergency)
    API->>DB: 2. Query department.default_consultation_service_id -> item_prices
    DB-->>API: 3. Returns live active unit_price (Cash or Payer contracted rate)
    API-->>UI: 4. Displays real-time breakdown preview (Reg Fee + Consultation Fee)
    
    UI->>API: 5. Submit Registration ("Complete & Pay")
    API->>Receipt: 6. Creates Receipt & Invoice with line items automatically priced from DB
    Receipt->>DB: 7. Saves receipt_items (status = 'DRAFT' or 'PENDING_PAYMENT')
    Receipt-->>PayModal: 8. Opens CollectPaymentDialog pre-filled with Total Amount (e.g. ₹500.00 / ₹1,500.00)
    
    PayModal->>PayModal: 9. Shows exact itemized breakdown (Registration + Consultation)
    PayModal->>API: 10. Cashier chooses Cash (with change due calculation), Card, or M-Pesa -> Confirms
    API->>Receipt: 11. Marks Receipt status = 'PAID' and prints receipt
```

### Key UI Integrations for Payment:
1. **[CollectPaymentDialog.tsx](file:///Users/rahulranjan/Desktop/Projects/AI-orchestrator/projects/his-global-south/src/pages/patientBill/components/CollectPaymentDialog.tsx):**
   * Pre-fills `pay.amount` directly with the auto-calculated database balance.
   * Renders the itemized list of billable services (`billableItems`) populated directly from `item_prices`.
   * Supports **Cash** (with tender & change-due calculations), **M-Pesa** (transaction codes), and **Card** (auth codes).
2. **[PatientRegister.tsx](file:///Users/rahulranjan/Desktop/Projects/AI-orchestrator/projects/his-global-south/src/pages/patients/PatientRegister.tsx):**
   * Automatically passes the department fee breakdown into checkout.
3. **[handlers.ts](file:///Users/rahulranjan/Desktop/Projects/AI-orchestrator/projects/his-global-south/backend/src/modules/rcm/shared/handlers.ts):**
   * Links `receipt_items` directly to the department's configured `service_catalog_id`.

---

## 6. Service Catalog Lifecycle & Immutable Versioning Architecture

To preserve clinical and financial audit integrity, the catalog employs **PostgreSQL Partial Unique Indexes** to support **true immutable historical versioning**:

```sql
-- Partial Unique Index on active custom services:
CREATE UNIQUE INDEX uq_svccat_org_custom_code 
ON service_catalog (org_id, code) 
WHERE (is_custom = true AND active = true);
```

### Versioning Lifecycle Rules:
1. **Historical Immutability (Archive on Deletion):**
   * When an existing service (e.g. `CONSULT-NEW` Version 1, `uuid-v1`) is deleted/deactivated, its row is set to `active = false`.
   * The row is **never purged or overwritten**.
   * All historical encounters, invoices, receipts, and insurance claims from past dates remain permanently linked to `uuid-v1`.
2. **Clean Insert for New Versions (Recreation):**
   * When a hospital creates a new service using the same code `CONSULT-NEW`:
   * Because the old row is `active = false`, it does **not** occupy the `uq_svccat_org_custom_code` partial index.
   * The backend executes a **fresh `INSERT`** generating a brand new UUID (`uuid-v2`), new creation timestamp, and new price rows in `item_prices`.
   * The new `uuid-v2` becomes the active version in the catalog.
3. **Department Mapping Linkage:**
   * Dropdowns in Facility Master only query `WHERE active = true`.
   * Active departments point to the active version `uuid-v2`.
   * If a currently mapped service is archived, the department gracefully retains its foreign key until the admin re-maps it to the new version.

---

## 7. Verification Plan

1. **Automated Tests:**
   * Backend integration tests verifying dynamic price resolution across departments (OPD, Emergency, Maternity) without any hardcoded strings.
   * Testing follow-up visits within grace window (₹0.00) vs outside grace window.
   * Testing automatic receipt generation with correct line item prices from `item_prices`.
   * Testing service recreation with the same code: verifying old inactive row is preserved with original UUID and new active row is created with fresh UUID.
   * Running `npm -C backend test` and `npm test`.
2. **Manual Verification:**
   * Edit a department in Facility Master, assign consultation and triage services with `[CODE] — Name (Rate)`.
   * Register a patient in that department → verify the payment/checkout screen is pre-filled with the exact database amount.
   * Complete payment via `CollectPaymentDialog` with Cash / Card / M-Pesa → verify receipt shows `PAID` with correct line items.
   * Deactivate a service in Catalog Browser, re-create a new service with the same code → verify both historical audit trail and new version are preserved.

