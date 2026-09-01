# Slice LCF-2 — Enrolled-only picker + catalog resolve + order create

| Field | Value |
|-------|--------|
| **ID** | LCF-2 |
| **Depends on** | LCF-1 |
| **Technical design refs** | AD-3, AD-4, AD-5, AD-6, AD-7 |
| **Tracer** | Doctor → **Orders → Laboratory → New order** → picker shows **only enrolled** tests with In-house/Send-out badge → order in-house test → **Laboratory In-house tab**; order send-out test → **Send-out tab** (no vendor at order time) |

---

## Purpose

Wire enrollment fulfilment through to clinical ordering. Doctors only order configured tests; `refer_out` is explicit, not inferred from missing enrollment.

---

## In scope

### Backend — catalog resolve

- Load `lab_fulfillment_type` from `items_master` when resolving lab tests
- Set `facilityAvailability`: `in_house` \| `refer_out` \| `not_offered` (AD-2)
- **`referOut = (facilityAvailability === refer_out)` only** (AD-3) — remove `!== in_house` inference
- Unit tests: enrolled in-house → false; enrolled send_out → true; not enrolled → not orderable

### Backend — clinical lab catalog

- `GET /api/clinical/lab-catalog?enrolledOnly=true`
- Returns only active org enrollments joined to `lab_test_catalog`
- Each row: `labFulfillmentType`, `facilityAvailability`, `itemsMasterId`, category (panel/individual/point_of_care)
- Response schema updated

### Backend — order create

- After resolve: any lab line with `not_offered` → **422** `CATALOG_NOT_ENROLLED`
- Any line with `referOut` and zero active lab vendors → **422** `NO_ACTIVE_LAB_VENDORS`
- Require resolvable catalog id for lab lines (v1)
- Integration tests with org mock `active: true`

### Frontend — Lab order form

- Fetch catalog with `enrolledOnly=true`
- Remove dependency on full unenrolled catalogue for picker
- Show **In-house** / **Send-out** badge per row (read-only)
- No vendor / send-out checkbox (confirm removed)
- Submit uses catalog ids only

### Frontend — orders mapping

- `ordersMock` / `mapApiRowToLabListItem`: `referOut` from item flags only (unchanged if backend correct)

### Tests

- Integration: order enrolled in-house → `refer_out false`; send-out → `refer_out true`, `send_out_status pending_collection`
- Integration: order with unenrolled catalog id → 422
- `LabOrderForm` test: enrolled-only list

---

## Out of scope

- Disable send-out rows in UI when no vendors (LCF-3 — backend 422 still applies)
- Consultation visit-plan lab picker (LCF-3)
- Full Laboratory desk regression suite (LCF-3)

---

## Acceptance criteria (from PRD)

- [ ] US-B1, US-B2, US-B3, US-B4
- [ ] US-A3 (API guard when send-out + no vendors)
- [ ] US-C1 (routing via correct `refer_out`)
- [ ] US-D2 (no silent send-out from not enrolled)

---

## Approval

| Role | Status |
|------|--------|
| Product | Approved | 2026-08-31 |
| Engineering | Approved | 2026-08-31 |
