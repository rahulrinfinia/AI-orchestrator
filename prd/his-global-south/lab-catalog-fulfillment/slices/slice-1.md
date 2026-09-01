# Slice LCF-1 — Fulfilment type on lab enrollment (DB + API + Catalog Browser)

| Field | Value |
|-------|--------|
| **ID** | LCF-1 |
| **Depends on** | — (Laboratory desk tabs from `lab-send-out-vendors` recommended merged first) |
| **Technical design refs** | AD-1, AD-2, AD-8, AD-9 |
| **Tracer** | Catalog admin → **Catalog Browser → Lab tests** → Enrol national/custom test → choose **Send-out (external)** → save → row shows **Send-out** badge → `items_master.lab_fulfillment_type = send_out` in DB |

---

## Purpose

Persist **in-house vs send-out** at enrollment time. Thinnest end-to-end path: admin configures fulfilment; no doctor/order changes yet.

---

## In scope

### Backend — migration

- Add `items_master.lab_fulfillment_type` (`in_house` \| `send_out`)
- CHECK from constants; NOT NULL when `lab_test_catalog_id IS NOT NULL`; default `in_house`
- Backfill existing lab enrollments → `in_house`
- Update `items-master.pgschema.ts`

### Backend — constants & types

- `LAB_FULFILLMENT_TYPE` + `LAB_FULFILLMENT_TYPE_VALUES` in platform/catalog constants
- Map helper → `FACILITY_AVAILABILITY` for clinical overlay (AD-2)

### Backend — item master API

- `createItemMaster` / `updateItemMaster`: accept `labFulfillmentType` when lab catalog link present; default `in_house`
- `getItemMasterEnrolData`: return `labFulfillmentType`
- Fastify schemas: body + response; Title Case AJV messages
- Unit tests for validation (`INVALID_LAB_FULFILLMENT_TYPE`)

### Backend — catalog browse (platform)

- Lab catalog browser list for org includes `lab_fulfillment_type` on enrolled rows (join `items_master`)

### Frontend — constants

- `src/clinical/constants/labFulfillment.ts` — mirror backend literals + labels

### Frontend — Catalog Browser

- **EnrolSheetPanel**: required **Fulfilment type** (In-house / Send-out), default In-house; load/save via item master API
- **AddLabSheet**: same control on create+enrol path
- **LabTestsTab**: **In-house** / **Send-out** badge on enrolled rows
- Types updated in `catalogBrowser/types.ts`

### Tests

- Backend unit: create/update item master with fulfilment type
- Frontend: EnrolSheet renders fulfilment control; save payload includes type

---

## Out of scope

- Doctor lab order picker changes (LCF-2)
- `catalogResolve` / `refer_out` fix (LCF-2)
- Order create validation (LCF-2)
- Vendor-count guard on order submit (LCF-2/3)

---

## Acceptance criteria (from PRD)

- [ ] US-A1: Fulfilment required on enroll/add; default In-house; visible on edit
- [ ] US-A2: Admin can change fulfilment on existing enrollment
- [ ] US-D1: Existing enrollments backfilled to `in_house`

---

## Approval

| Role | Status |
|------|--------|
| Product | Approved | 2026-08-31 |
| Engineering | Approved | 2026-08-31 |

Fill **Approval** in implement plan before coding.
