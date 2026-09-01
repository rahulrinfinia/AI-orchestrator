# Slice LCF-3 — Vendor guard UX, consultation alignment, regression

| Field | Value |
|-------|--------|
| **ID** | LCF-3 |
| **Depends on** | LCF-2 |
| **Technical design refs** | AD-6, AD-9, AD-10 |
| **Tracer** | Hospital with send-out test enrolled but **no lab vendors** → doctor sees test **disabled** in picker with tooltip → cannot submit → after admin adds vendor → order succeeds → full desk tracer on both Laboratory tabs |

---

## Purpose

Polish edge cases, align consultation lab ordering with enrolled-only policy, and regression-test Laboratory desk workflows against corrected routing.

---

## In scope

### Frontend — vendor guard UX

- Lab order form: when org has zero active lab vendors, **send-out** enrolled rows shown **disabled** with tooltip (*Add an outsourced lab vendor in Org setup*)
- Submit error toast maps `NO_ACTIVE_LAB_VENDORS` to friendly message
- Optional: hook `useLabVendorsList` count (existing from lab-send-out-vendors)

### Frontend — consultation / visit plan

- Lab test picker in consultation (`VisitPlanSectionsFull` or equivalent): use **enrolled-only** clinical lab catalog API
- Show `FacilityAvailabilityBadge` from server `facilityAvailability` (in_house / refer_out)
- Do not offer unenrolled national rows for order placement

### Regression — Laboratory desk

- Manual + automated tracer:
  - In-house: Collect → Receive → Process → Enter results → Verify
  - Send-out: Assign vendor → Print → Mark sent → Awaiting report → Upload PDF
- Mixed order: in-house line on In-house tab only; send-out line on Send-out tab only
- POC test enrolled in-house → In-house tab (not send-out)

### Docs / status

- Update `prd/.../slices/status.yaml` on merge
- Note in feature ticket any deferred items

### Tests

- Frontend: disabled send-out row when no vendors (mock empty vendor list)
- Barrel/import stability if touching `@/modules/clinical`

---

## Out of scope

- Radiology enrolment fulfilment
- Hospital-wide “no in-house lab” toggle
- New desk features beyond regression

---

## Acceptance criteria (from PRD)

- [ ] US-A3: disabled picker UX when zero vendors
- [ ] US-C2: send-out and in-house desk workflows unchanged and correct
- [ ] Edge: POC enrolled in-house not on send-out tab
- [ ] Edge: admin fulfilment change does not alter open orders

---

## Approval

| Role | Status |
|------|--------|
| Product | Pending |
| Engineering | Pending |
