# PRD: Lab send-out — outsourced vendors, barcode, and report intake

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `lab-send-out-vendors` |
| **Version** | 1.0 draft |
| **Date** | 2026-08-31 |
| **Status** | Draft — **Gate G1 pending** (product review) |

---

## Background & Problem

Many hospitals in flowMD **do not run an in-house laboratory**. They still order diagnostic tests in the HIS, but fulfilment happens at an **outside lab (vendor)**:

1. Staff order lab tests in the existing **Orders / Lab** flow.
2. Sample is collected; hospital prints a **barcode / requisition** and sends the sample to the vendor.
3. When the report arrives (email, paper, or PDF), staff **upload the PDF** and/or enter structured results.
4. Doctors and lab desk staff must see in the **lab tracker** that the test was **outsourced**, which vendor holds it, and when the result arrived.

### Problem today

- Lab ordering exists (`/orders?type=lab`, clinical diagnostic orders API).
- Line items already support a **`refer_out`** flag and catalog **facility availability** (`in_house` / `refer_out` / `not_offered`).
- **`contracted_organizations`** with `org_type = laboratory` exists in the data model and backend API — but **no hospital UI** to manage outsourced lab vendors.
- **No barcode generation**, send-out status workflow, or **PDF report attachment** on lab order items.
- Hospitals cannot configure **who** receives send-out tests or **track** vendor fulfilment end-to-end.

### What we are building

Extend the **existing clinical diagnostic orders** module — not a standalone LIS product. Phased delivery: vendor master → send-out on orders → barcode print → PDF report intake → optional vendor portal later.

---

## Confirmed product decisions

| Decision | Answer |
|----------|--------|
| **Who adds lab vendors?** | Hospital **`super_admin`** (tenant-scoped). **Not** flowMD `platform_admin`. |
| **Vendor scope** | Per hospital (`organization_id`). Each hospital maintains its own outsourced lab list. |
| **Data model reuse** | `contracted_organizations` with `org_type = laboratory` for vendor master (v1). |
| **Clinical module** | Extend diagnostic orders + lab tracker UI — no new top-level “Laboratory” app. |
| **Vendor portal** | Out of scope for v1; staff upload PDFs when reports arrive. |
| **In-house lab flag** | Hospital can indicate whether it runs its own lab (defaults send-out behaviour) — Phase 1 optional setting. |

---

## Role model

| Role | Who | Vendor master | Assign vendor on order | Upload vendor PDF |
|------|-----|---------------|------------------------|-------------------|
| **`super_admin`** | Hospital top admin | **Create / edit / deactivate** | Yes | Yes |
| **`provider_admin`** | Hospital org admin | **View only** (v1) — co-manage optional in v2 | Yes | Yes |
| **Lab desk / phlebotomist** | Operational staff | View list (read) | Yes | Yes |
| **Doctor / nurse** | Ordering clinician | View list (read) | Yes (when ordering send-out) | No (default) |
| **`platform_admin`** | flowMD company staff | **No** — cross-tenant hospital onboarding only | No | No |

```text
Hospital super_admin
  → Settings / Org setup → Lab vendors (outsourced)
  → Adds vendors for THIS hospital only

Lab desk / clinician
  → Orders → Lab → pick send-out test → select vendor → print barcode → upload PDF when report arrives
```

**Rationale:** Vendor contracts are hospital-specific. flowMD `platform_admin` onboard hospitals; they do not manage each hospital’s PathCare vs City Diagnostics relationship.

---

## Goals & Success Metrics

| Goal | Metric | Target |
|------|--------|--------|
| Hospital can register outsourced labs without SQL | Vendors created via UI | 100% of send-out hospitals in pilot |
| Send-out visible in tracker | Order items show outsourced badge + vendor name | 100% of `refer_out` lines |
| Report traceability | PDF linked to order item with received timestamp | 100% of completed send-out results |
| Barcode lookup | Desk can scan/enter code and open order item | < 5 s lookup |
| Role safety | Non–super-admin cannot create vendors | 403 on vendor CRUD |

---

## User Personas

| Persona | Role | Needs |
|---------|------|--------|
| **Hospital Super Admin** | `super_admin` | Add/edit outside labs; compliance fields; deactivate unused vendors |
| **Lab Desk Staff** | lab / reception / nurse | Print requisition, mark sent to vendor, upload PDF when report arrives |
| **Doctor** | `doctor` | Order send-out tests; see vendor and result status in tracker |
| **Hospital Admin** | `provider_admin` | View vendor list; may assign vendor on orders (v1 read-only on master) |

---

## Vendor master — required and optional fields

Vendors are stored as **`contracted_organizations`** with **`org_type = laboratory`**.

### Required on create (MVP — form cannot submit without)

| Field | Label (UI) | Validation |
|-------|------------|------------|
| `name` | Lab name | Non-empty; max length per existing platform rules |
| `code` | Lab code | Non-empty; unique per hospital; auto-uppercase; used in lists and barcode prefix |
| `org_type` | *(hidden)* | Fixed `laboratory` |
| Contact | Phone **or** email | At least one of `contact_phone` or `contact_email` required |
| `address.line1` | Address line 1 | Non-empty |
| `address.city` | City | Non-empty |

### Strongly recommended (warn if empty; allow save)

| Field | Label (UI) | Purpose |
|-------|------------|---------|
| `contact_name` | Contact person | Coordination when report delayed |
| `contact_email` | Report / coordination email | Report delivery; may reuse for PDF notification later |
| `contact_phone` | Phone | Sample pickup / handoff |
| `address.state` | State / province | Requisition print |
| `address.postal_code` | PIN / postal code | Requisition print |
| `status` | Status | Default **`active`** when super_admin creates (not `pending`) |

### Optional (collapsible section — compliance)

| Field | Label (UI) | Purpose |
|-------|------------|---------|
| `trading_name` | Trading name | Brand name if different from legal name |
| `registration_number` | Registration number | Licensed lab verification |
| `registration_authority` | Registration authority | Issuing body |
| `registration_valid_from` | Valid from | Credential window |
| `registration_valid_to` | Valid to | Expiry tracking |
| `facility_registry_code` | Facility registry code | Link to national registry if applicable |
| `notes` | Internal notes | e.g. “CBC only before 4pm” |
| Documents | MOU / accreditation | Via contracted-org documents upload (existing pattern) |

### Phase 2 lab-specific fields (not required for vendor master v1)

| Field | Purpose |
|-------|---------|
| `report_email` | Dedicated inbox if different from `contact_email` |
| `default_turnaround_hours` | SLA display on tracker |
| `barcode_prefix` | Optional override; default = `code` |

---

## User workflows

### WF-1 — Super admin adds an outsourced lab

1. Super admin opens **Settings → Lab vendors** (or Org setup → Outsourced laboratories).
2. Clicks **Add vendor**.
3. Fills required fields (name, code, contact phone or email, address line 1 + city).
4. Optionally adds registration and uploads MOU document.
5. Saves → vendor appears as **Active** in list.
6. Vendor is available in lab order vendor dropdown for that hospital only.

### WF-2 — Doctor orders a send-out lab test

1. Clinician opens **Orders → Lab** for a patient visit/encounter.
2. Selects tests marked **refer out** (or hospital has no in-house lab → default send-out).
3. Picks **vendor** from hospital’s active lab vendor list.
4. Submits order → line items show status **Pending collection** / **Awaiting send-out**.

### WF-3 — Lab desk sends sample to vendor

1. Lab desk opens **Lab tracker**; filters outsourced / send-out items.
2. Collects sample; clicks **Generate barcode & print requisition**.
3. Marks item **Sent to vendor** (records timestamp and user).
4. Hands sample to vendor or courier.

### WF-4 — Report arrives; staff uploads PDF

1. Report arrives by email or paper.
2. Lab desk opens order item in tracker → **Upload report PDF**.
3. System stores document, links to order item, sets status **Report received** / **Completed**.
4. Doctor reviews PDF and/or structured results in tracker and consultation workspace.

---

## User stories & acceptance criteria

### Epic A — Vendor master (Slice 1)

**US-A1 — Super admin creates lab vendor**

- **As** hospital `super_admin`
- **I want** to add an outsourced laboratory vendor
- **So that** send-out orders can be assigned to the correct external lab

**Acceptance criteria:**

- [ ] Only `super_admin` can access **Add vendor** / **Edit vendor** / **Deactivate vendor**.
- [ ] Form requires: lab name, lab code, (phone OR email), address line 1, city.
- [ ] `org_type` is fixed to `laboratory` (not user-selectable).
- [ ] Duplicate `code` within the same hospital returns a clear error.
- [ ] New vendor defaults to **active** status.
- [ ] `provider_admin` and clinical roles can **view** vendor list but **cannot** create or edit (v1).
- [ ] `platform_admin` has **no** access to hospital vendor CRUD.

**US-A2 — Super admin lists and deactivates vendors**

- [ ] List shows name, code, contact, city, status (active/inactive).
- [ ] Search/filter by name or code.
- [ ] Deactivating a vendor hides it from **new** order dropdowns; existing open orders retain vendor reference.
- [ ] Inactive vendors remain visible in admin list with inactive badge.

### Epic B — Send-out on orders (Slice 2)

**US-B1 — Assign vendor on send-out order line**

- [ ] When order item is `refer_out = true`, vendor selection is **required** before submit (or before mark sent — product pick one; default: required on submit).
- [ ] Tracker shows **Outsourced** badge, vendor name, and fulfilment status pipeline.
- [ ] In-house items do not show vendor picker.

**US-B2 — Send-out status pipeline**

- [ ] Statuses (minimum): `pending_collection` → `sent_to_vendor` → `awaiting_report` → `completed`.
- [ ] Timestamps and user recorded on **sent to vendor** and **report received**.

### Epic C — Barcode & requisition (Slice 3)

**US-C1 — Generate and print barcode**

- [ ] Each send-out line gets a unique **specimen barcode** on generate/print.
- [ ] Print template includes: barcode, patient identifiers, tests, vendor name, hospital name.
- [ ] Lookup by barcode opens the correct order item (`GET …/by-barcode/:code` or equivalent).

### Epic D — PDF report intake (Slice 4)

**US-D1 — Upload vendor report PDF**

- [ ] Lab desk can upload PDF on a send-out order item.
- [ ] PDF viewable from tracker (signed URL / document viewer).
- [ ] Upload records `received_at` and `received_via = upload`.
- [ ] Structured result entry (existing results API) remains available alongside PDF.

### Epic E — Vendor portal (Slice 5 — out of scope v1)

Deferred: vendor login, pending requisition inbox, vendor-side upload.

---

## Phased delivery

| Phase | Slice | Scope |
|-------|-------|--------|
| **1** | Slice 1 | Vendor master UI + super_admin CRUD + validation |
| **2** | Slice 2 | Vendor on send-out orders + tracker badges/status |
| **3** | Slice 3 | Barcode generate + requisition print |
| **4** | Slice 4 | PDF upload + link to order item |
| **5** | Slice 5 | Vendor portal (if product approves) |

---

## In scope

- Hospital-scoped outsourced lab vendor master (`contracted_organizations`, type `laboratory`).
- Super_admin-only vendor create/edit/deactivate (v1).
- Vendor assignment on send-out diagnostic order items.
- Lab tracker UI: outsourced indicator, vendor, status, PDF upload.
- Barcode per send-out line + print requisition.
- Reuse existing upload/storage pattern for lab result PDFs.

## Out of scope (v1)

- Full LIS (specimen storage, QC, analyser interfaces).
- HL7/FHIR lab interfaces.
- Automatic email parsing from vendor inboxes.
- flowMD `platform_admin` managing hospital vendor lists.
- Global shared vendor catalogue across all hospitals.
- Billing/settlement with vendor (RCM hook possible later).
- Vendor self-service portal.

---

## Edge cases & permissions

| Scenario | Expected behaviour |
|----------|-------------------|
| Hospital has zero vendors | Send-out order blocked with message: “Add a lab vendor in Settings.” |
| Vendor deactivated mid-order | Existing order keeps vendor; new orders cannot select it. |
| Duplicate lab code | 409 / inline validation: code already exists for this hospital. |
| Missing phone and email on create | 422 — at least one contact method required. |
| Non–super-admin POST vendor | 403 Forbidden. |
| User from Hospital A | Cannot see Hospital B vendors (org scope enforced). |
| Upload non-PDF | Reject with clear error (PDF only for v1). |
| Report uploaded twice | Second upload allowed with version/history or replace — TBD in technical design. |

---

## Dependencies

- Existing clinical **diagnostic orders** module and lab tracker UI.
- Existing **`contracted_organizations`** table and platform provider-master API (extend validation + add UI).
- Existing **file upload** pattern (MinIO / platform uploads).
- Hospital **`super_admin`** role and org-scoped auth (unchanged).

---

## Open questions (for Gate G1)

| # | Question | Default if no answer |
|---|----------|----------------------|
| 1 | Should `provider_admin` co-manage vendors in v1? | **No** — super_admin only for CRUD |
| 2 | Vendor required at order submit vs at “send to vendor”? | **At submit** |
| 3 | Replace vs version history on second PDF upload? | **Append with history** |
| 4 | Hospital-level “we have in-house lab” toggle in v1? | **Defer** to Slice 2 |

---

## Approval

| Role | Name | Date | Status |
|------|------|------|--------|
| Product | | | Pending |
| Engineering | | | Pending |

Reply **APPROVE PRD** to proceed to technical design and slice decomposition.
