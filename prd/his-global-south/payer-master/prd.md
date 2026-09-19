# PRD: Enterprise Payer Master / Company Registration

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature key** | `payer-master` |
| **Product** | flowMD |
| **Version** | **1.0** |
| **Date** | 2026-09-10 |
| **Status** | Draft — **Awaiting Human Approval** |
| **Related** | [plan.md](./plan.md) · [ticket.md](./ticket.md) |

---

## 1. Summary & Problem Statement

Hospitals operating in enterprise and global-south environments (such as Kenyatta National Hospital) require an exhaustive, all-in-one Payer Master / Company Registration form that controls billing terms, credit policies, operational hospital restrictions, and visit charges across Outpatient (OPD), Emergency/Casualty, and Inpatient (IPD) departments.

flowMD currently manages canonical insurers and plans in a SaaS-style platform catalog (`/payerCatalog`), and accepted contracts at `/accepted-plans`. However, it lacks:
1. An integrated, single-form 3-column registration experience for hospital-level corporate/payer onboarding.
2. Operational flags for bed matrix, surgery grading, OPD credit restriction, and doctor unsettled fee hold.
3. Direct upfront visit fee configuration (OPD consultation, emergency triage, IPD bed/admission) during payer creation.

---

## 2. Requirements & Acceptance Criteria

### AC-1: Three-Column Payer Master Form
- **Payer Details**: Name, Short Name, Physical Addresses, Country, State, City, PIN, Phone, Fax, Email, GSTIN, Auto Reminder Days.
- **Classification**: Radio selection for `Insurance/Payer`, `Under Ins./Sponsor`, and `None`.
- **Operational Enforcements**: Checkbox flags for Express Reporting, Admission Not Allowed, EWS, OPD Not Allowed, Discount Not Show on OP Bill, Surgery Grading, OP Advance Mandatory, Panel Company, General Ward, OPD Credit Not Allowed, Bed Matrix Applicable, Credit Limit Restriction, and Surgery Component Exclusion rules.
- **Bill Details**: Billing/Collection addresses, Claim Filing Indicator Code, National Payer ID, Credit Limit (Days), Payment Type, Member ID Format regex, Company Type & Sub Type, Bill Submission Days, Invoice Dispatch Days, Billing Currency, Doctor Accounting flags (Release unsettled fee, Release period, Allow pharmacy discount, OTP for registration).
- **Other Information**: Validity dates, Status, Agreement Detail, Valid For, Free Visits, Stay Limit (Days), PAN No, TIN No, Tag Nomenclature, Report Tagging, Company Notes, Revenue Expected, SAP Company Code.
- **Contact Person**: Name, Designation, Mobile, Exclusion Type.

### AC-2: Visit & Encounter Fees Configuration
- During Payer addition, provide input fields to directly set visit rates:
  - **OPD**: `CONSULT-NEW`, `CONSULT-FOLLOWUP`, `CONSULT-SPECIALIST`, `REG-OPD`.
  - **Emergency Triage**: `TRIAGE-ED`, `CONSULT-EMERGENCY`, `BED-ED-OBS`, `BED-ED-CRITICAL`, `BED-ED-STANDARD`.
  - **IPD**: `IPD-ADMISSION`, `BED-GENERAL-WARD`, `BED-PRIVATE`, `BED-ICU`, `IPD-DOCTOR-VISIT`.
- Saving automatically generates or updates the dedicated `price_lists` and populates `item_prices` with these rates.

### AC-3: Find Payer & Quick Actions
- Global "Find Payer" combobox at the top to search, filter, and load existing registered payers into the form.
- Action buttons: `[ New ]` (resets form), `[ Save ]` (persists data & fee lines), `[ Export to Excel ]` (generates `.xlsx`).
- Set Pricing quick-action links for downstream pricing configurations.

### AC-4: Non-Negotiable Backward Compatibility
- Existing `/payerCatalog` and `/accepted-plans` modules must continue to work without modification.
- Existing clinical and cashier billing flows remain unaffected.
