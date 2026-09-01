# Slice LSO-3 — Barcode generate, print requisition, lookup

| Field | Value |
|-------|--------|
| **ID** | LSO-3 |
| **Depends on** | LSO-2 |
| **Technical design refs** | AD-6, AD-13 (lookup audit); §5.3, §7.3, §9 |
| **Tracer** | Lab desk opens tracker → selects send-out row → **Generate barcode & print requisition** → label prints with barcode + patient + tests + vendor → scan/enter code at desk → order item opens |

---

## Purpose

Operational send-out: printable specimen identity tied to order item; desk workflow via barcode lookup. Uses `specimen_barcode` column added in LSO-2 migration.

---

## In scope

### Backend

- **POST `/api/clinical/orders/items/:itemId/specimen-barcode`**
  - Auth: `withOrgAuth` + `LAB_ROLES`
  - Only when `refer_out = true` and vendor assigned
  - Generate if null: `{VENDOR_CODE}-{YYYYMMDD}-{6-char from item id}`
  - Return `{ specimen_barcode, print_payload }` where `print_payload` includes patient identifiers, test names, vendor name, hospital name (backend-assembled — not client-composed)
- **GET `/api/clinical/orders/by-barcode/:code`**
  - Auth: `withOrgAuth`
  - Param `:code` — `minLength: 6` (not UUID format)
  - Org-scoped lookup → item + order summary + patient ids for desk
  - Emit PHI audit event on successful lookup (ADR 0004 — no PHI in log body)

- Schemas: params, response, errors; full response schemas
- Idempotent: second POST returns existing barcode if already set

### Frontend

- **LabOrderTracker** — **Print requisition** action on send-out rows
- Print template: extend existing print utilities (`print.ts` / label pattern from lab order form)
  - Code128 or QR rendering of `specimen_barcode`
  - Fields from `print_payload` API response
- **Barcode lookup** — optional desk input/modal: enter or scan code → navigate to order item detail
- No PHI in localStorage

### Tests

- Unit: barcode format; idempotent generate; reject non–refer-out items
- Integration: POST generate → GET by-barcode returns same item
- Integration: cross-org barcode → 404
- Schema tests for new routes

---

## Out of scope

- PDF report upload (LSO-4)
- External barcode printer hardware drivers
- Multi-specimen aliquot tracking
- Vendor portal scan-in

---

## Endpoints

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/clinical/orders/items/:itemId/specimen-barcode` | `LAB_ROLES` |
| GET | `/api/clinical/orders/by-barcode/:code` | `withOrgAuth` |

Paths built from `ORDERS_API_BASE` in `orders.routes.ts`.

---

## Acceptance criteria

- [ ] Barcode generated only for `refer_out` lines with vendor
- [ ] Format matches AD-6: `{LAB_CODE}-{YYYYMMDD}-{suffix}`
- [ ] Unique constraint enforced — collision handled safely
- [ ] Print shows barcode, patient identifiers, tests, vendor, hospital
- [ ] Lookup by barcode opens correct item within org; wrong org → 404
- [ ] Repeat generate returns same barcode (idempotent)
- [ ] Audit event on lookup (user, org, resource id — no patient name in log)
- [ ] Full Fastify response schemas on both routes
- [ ] CI green; TD §9 satisfied

---

## Approval

| Role | Name | Date | Status |
|------|------|------|--------|
| Product | | | Pending |
| Engineering | | | Pending |
