# Slice LSO-2 — Vendor on send-out orders + tracker status

| Field | Value |
|-------|--------|
| **ID** | LSO-2 |
| **Depends on** | LSO-1 |
| **Technical design refs** | AD-3, AD-5, AD-8, AD-14; §4.1, §5.2, §7.2–7.3, §9 |
| **Tracer** | Clinician opens **Orders → Lab** → selects send-out test → picks **vendor** from LSO-1 list → submits order → **Lab tracker** shows **Outsourced** badge, vendor name, and `pending_collection` status |

---

## Purpose

Connect vendor master to clinical workflow. Send-out lab lines require a vendor at order submit; tracker and list APIs expose outsourced fulfilment state. Backend joins vendor name — frontend does not resolve vendors client-side.

---

## In scope

### Migration — `NNN_lab_send_out_order_items.sql`

Edit pgschema first → generate → hand-curate. **`COMMENT ON`** all new columns.

**`diagnostic_order_items` additions:**

| Column | Notes |
|--------|-------|
| `vendor_id` | uuid NULL FK → `contracted_organizations.id` |
| `send_out_status` | text NULL; CHECK via `SEND_OUT_STATUS_VALUES` |
| `specimen_barcode` | text NULL; unique partial index (used in LSO-3; nullable until then) |
| `sent_to_vendor_at` | timestamptz NULL |
| `sent_to_vendor_by` | uuid NULL FK → `profiles.id` |
| `report_received_at` | timestamptz NULL |

**Constants** — `clinical.constants.ts`:

- `SEND_OUT_STATUS` + `SEND_OUT_STATUS_VALUES`
- Extend `ORDER_STATUS` / `ORDER_STATUSES` to include DB values `collected`, `processing` (fix drift)
- `ORDERS_API_BASE = '/api/clinical/orders'`; refactor `orders.routes.ts` paths to use it

### Backend — extend `clinical/orders/`

- **POST `/api/clinical/orders`** — per item accept `refer_out`, `vendor_id`, `catalog_id`; when `refer_out`, require valid vendor (org, type laboratory, active); set `send_out_status = pending_collection`
- **GET list/detail** — join vendor; return per item: `vendor_id`, `vendor_name`, `vendor_code`, `refer_out`, `send_out_status`, timestamps; paginated list includes `total`
- **PATCH `/api/clinical/orders/items/:itemId/send-out`** — body `{ action }` where action ∈ `mark_sent`, `mark_awaiting_report`; updates status + timestamps + `sent_to_vendor_by`
- `orders.schema.ts` — extend create/list/detail/send-out schemas + response schemas
- `orders.mapping.ts` — joined aliases
- Org validation: encounter/patient belong to org on create (AD-14)
- Transactions for order + items insert

**Catalog / refer_out resolution:**

- When catalog enrollment indicates send-out OR item explicitly `refer_out`, enforce vendor rules
- Document in service how `FACILITY_AVAILABILITY.REFER_OUT` is set (minimum: allow explicit `refer_out` on wire for v1; optional catalog enrollment follow-up)

### Frontend

- **`LabOrderForm.tsx`** — vendor `Select` when line is send-out; block submit without vendor; pass `vendorId`, `referOut` on items
- **`LabOrderTracker.tsx`** — **Outsourced** badge, vendor name, `sendOutStatus` from API; filter `sendOut=true` sent to API (do not filter client-side only)
- Constants: `src/clinical/constants/orders.ts` — mirror `SEND_OUT_STATUS`
- Types: extend `src/clinical/types/orders.types.ts`
- Migrate production paths from `ordersMock.ts` to `orders.service.ts` for list/create/send-out (keep fixtures for tests)
- Hooks: extend order query hooks + invalidation via `queryKeys`

### Tests

- Unit: vendor required when `refer_out`; invalid vendor 422; send-out transition rules
- Integration: create send-out order with vendor; list shows vendor_name; PATCH mark_sent
- Integration: openapi-get-sweep covers extended GET orders; mock rows complete for new columns
- Schema tests for extended orders schemas

---

## Out of scope

- Barcode generate/print (LSO-3) — column exists but UI/API not wired
- PDF upload (LSO-4)
- `diagnostic_order_item_documents` table (LSO-4)
- Hospital `has_in_house_lab` org setting
- Radiology send-out (same patterns later; this slice lab `order_type=laboratory` only)

---

## Endpoints

| Method | Path | Change |
|--------|------|--------|
| POST | `/api/clinical/orders` | Extended body + validation |
| GET | `/api/clinical/orders` | Extended items + `sendOut` query filter + `total` |
| GET | `/api/clinical/orders/:id` | Extended items |
| PATCH | `/api/clinical/orders/items/:itemId/send-out` | **New** — `LAB_ROLES` |

---

## Acceptance criteria

- [ ] Migration applies; pgschema matches; COMMENT ON present
- [ ] Send-out item without `vendor_id` on create → **422** `vendor_required_for_send_out`
- [ ] Invalid/inactive/cross-org vendor → **422** `invalid_lab_vendor`
- [ ] List and detail return `vendor_name` from backend join (not frontend lookup)
- [ ] Tracker shows outsourced badge + vendor + status for `refer_out` lines
- [ ] In-house lines (`refer_out=false`) show no vendor picker
- [ ] `mark_sent` sets `send_out_status=sent_to_vendor`, timestamps, user
- [ ] Deactivated vendor hidden from new orders but retained on existing rows
- [ ] Zero vendors + send-out order attempt → clear UI message pointing to Org setup
- [ ] All changed routes have full response schemas
- [ ] CI green (lint, tsc -b, backend build, relevant tests)
- [ ] TD §9 matrix satisfied for this slice

---

## Approval

| Role | Name | Date | Status |
|------|------|------|--------|
| Product | | | Pending |
| Engineering | | | Pending |
