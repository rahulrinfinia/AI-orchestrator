# LSO-2 — Vendor on send-out orders + tracker status

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `lab-send-out-vendors` |
| **Slice** | LSO-2 |
| **Branch** | `feat/lab-send-out-vendors` from `develop` |
| **Goal** | Clinician assigns an outsourced lab vendor when placing send-out lab orders; tracker shows outsourced badge, vendor name, and item-level send-out status from the API |
| **Depends on** | LSO-1 (implemented) |
| **PRD** | [prd.md](../../../prd/his-global-south/lab-send-out-vendors/prd.md) |
| **Technical design** | [technical-design.md](../../../prd/his-global-south/lab-send-out-vendors/technical-design.md) |
| **Slice spec** | [slice-2.md](../../../prd/his-global-south/lab-send-out-vendors/slices/slice-2.md) |
| **Status** | Planned — ready for implement after Approval below |

---

## Approval

- [ ] Product: acceptance criteria match PRD US-B1, US-B2
- [ ] Tech: AD-3, AD-5, AD-8, AD-11, AD-12, AD-14, AD-15 respected; TD §9 matrix referenced
- [ ] Scope: no barcode/PDF/document table work (LSO-3/4); no vendor portal; no radiology send-out

**Approved by:** _name_  
**Date:** _YYYY-MM-DD_

**Agent rule:** Implement may not start until all boxes are checked and approver is named.

---

## Architecture constraints (immutable)

| ID | Constraint | This slice |
|----|------------|------------|
| AD-3 | Item-level `send_out_status`; do not overload `diagnostic_orders.status` | New column + CHECK; set only when `refer_out = true` |
| AD-5 | Vendor required at order submit when `refer_out` | Validate org + `org_type=laboratory` + `active` + `status=active` |
| AD-8 | Backend joins vendor name on list/detail | Return `vendor_id`, `vendor_name`, `vendor_code`, `send_out_status`, timestamps — no client-side vendor lookup on tracker rows |
| AD-11 | Standard error envelope + domain codes | `ORDER_SEND_OUT_ERROR` / extend `clinical.constants.ts` |
| AD-12 | Paginated list includes SQL `total` | Extend GET orders list to `{ items, total, limit, offset }` (breaking shape change — update frontend + integration mocks) |
| AD-14 | Encounter/patient belong to caller org on mutations | Guard create + PATCH send-out |
| AD-15 | `withOrgAuth` + suspended hospital rejection | All routes; integration mocks `active: true` |
| TD §9 | Constants, mapping, types, response schemas, CI twins | See Validation section |

**Do not:** wire barcode generate/print (LSO-3); create `diagnostic_order_item_documents` (LSO-4); add `has_in_house_lab` org setting; refactor unrelated OPD modules.

---

## Previous slices / current code

### LSO-1 (implemented in `projects/his-global-south/`)

| Area | Exists |
|------|--------|
| API | `/api/platform/lab-vendors` — full CRUD + PATCH status; paginated list; response schemas |
| Data | `contracted_organizations` rows with `org_type = laboratory` |
| Frontend | `/org-setup/lab-vendors`, `labVendors.service.ts`, `useLabVendorsList({ active: 'true' })` |

**Reuse for LSO-2 vendor picker:** `useLabVendorsList({ active: LAB_VENDOR_ACTIVE_FILTER.ACTIVE })` — active vendors only; deactivated vendors excluded from new orders but remain on existing order rows.

### Baseline orders module (pre–LSO-2)

| Area | Exists today | Gap |
|------|--------------|-----|
| Table | `diagnostic_order_items.refer_out` boolean (baseline migration) | No `vendor_id`, `send_out_status`, timestamps, `specimen_barcode` |
| Create | `createDiagnosticOrder()` persists `refer_out` from catalog resolve | No `vendor_id` on wire; no `send_out_status` on insert |
| Catalog | `catalogResolve.ts` sets `referOut` when `facilityAvailability === REFER_OUT` | Wire does not accept explicit `refer_out` override yet |
| List/get | `json_agg` item objects in `orders.service.ts` | Omits `refer_out`, vendor fields, send-out status |
| Routes | 7 endpoints under hardcoded `/api/clinical/orders` | No `ORDERS_API_BASE`; **no response schemas** on most routes; no PATCH send-out |
| Constants | `ORDER_STATUS` = pending/completed/cancelled only | DB CHECK also allows `collected`, `processing` — fix drift |
| Frontend form | `LabOrderForm.tsx` → `placeLaboratoryOrder()` sends `{ testName }` only | No vendor select; no `referOut` / `vendorId` |
| Frontend tracker | `LabOrderTracker.tsx` → `getLabOrders()` via `ordersMock.ts` | No outsourced badge; UI pipeline status only |
| Tests | `clinical.rest.test.ts`, `clinical-service-surface.integration.test.ts` | No send-out/vendor coverage; list returns array not paginated shape |

**Reference clone `his-global-south-pr51`:** Same orders backend as main clone; **no** LSO-1 or send-out work — use main clone only.

---

## Relevant files

### New — backend

```text
backend/src/db/migrations/015_lab_send_out_order_items.sql
backend/src/modules/clinical/orders/orders.mapping.ts
backend/src/modules/clinical/orders/sendOut.service.ts          # if orders.service.ts grows too large
backend/src/modules/clinical/orders/__tests__/orders.sendOut.service.test.ts
backend/src/modules/clinical/orders/__tests__/orders.schema.test.ts   # extend or create
```

### Modify — backend

```text
backend/src/modules/clinical/pgschema/diagnostic-order-items.pgschema.ts
backend/src/modules/clinical/clinical.constants.ts              # SEND_OUT_STATUS, ORDER_STATUS fix, ORDERS_API_BASE, errors
backend/src/modules/clinical/catalogs/catalogs.types.ts         # vendorId, referOut on DiagnosticOrderItemInput
backend/src/modules/clinical/catalogs/catalogResolve.ts         # merge explicit referOut from wire
backend/src/modules/clinical/orders/orders.types.ts
backend/src/modules/clinical/orders/orders.schema.ts            # create/list/detail/send-out + response schemas
backend/src/modules/clinical/orders/orders.service.ts           # vendor validation, joins, paginated list
backend/src/modules/clinical/orders/orders.controller.ts
backend/src/modules/clinical/orders/orders.routes.ts            # ORDERS_API_BASE; PATCH send-out
backend/src/__tests__/integration/clinical-service-surface.integration.test.ts
backend/src/__tests__/integration/db-mock-impl.ts               # default rows for new columns
```

### New — frontend

```text
src/clinical/constants/orders.ts
src/clinical/types/orders.types.ts
src/hooks/queries/useDiagnosticOrders.ts                        # or extend existing if present
```

### Modify — frontend

```text
src/services/orders.service.ts
src/services/ordersMock.ts                                        # map new API fields; sendOut filter to API
src/components/orders/LabOrderForm.tsx
src/components/orders/LabOrderTracker.tsx
src/components/orders/OrderStatusBadge.tsx                      # optional outsourced badge helper
src/lib/queryKeys.ts                                            # queryKeys.orders
src/components/orders/__tests__/LabOrderForm.test.tsx
src/components/orders/__tests__/LabOrderTracker.test.tsx
```

### Reference only

```text
backend/src/modules/platform/providerMaster/labVendors/labVendors.service.ts   # validateLabVendor(orgId, vendorId)
backend/src/modules/platform/pgschema/contracted-organizations.pgschema.ts
backend/src/modules/frontdesk/patients/patientsRegistration.schema.ts            # response schema pattern
src/services/labVendors.service.ts
src/hooks/queries/useLabVendors.ts
src/platform/constants/labVendors.ts
```

---

## Phases

### Phase A — Foundation (migration + constants + types)

**Migration number:** `015_lab_send_out_order_items.sql` (latest today is `014`).

1. **Edit pgschema first** — `diagnostic-order-items.pgschema.ts`:
   - Add columns: `vendor_id`, `send_out_status`, `specimen_barcode`, `sent_to_vendor_at`, `sent_to_vendor_by`, `report_received_at`
   - FK: `vendor_id` → `contracted_organizations.id`; `sent_to_vendor_by` → `profiles.id`
   - CHECK: `send_out_status` via `textInArrayCheck(SEND_OUT_STATUS_VALUES)` — **never** bind CHECK literals with `${value}` in `` sql` ``
   - Partial unique index: `specimen_barcode` WHERE NOT NULL (nullable until LSO-3)
   - Import `contracted_organizations` from platform pgschema for FK

2. **Generate + curate migration:**
   - `npm run db:generate` in `backend/`
   - Hand-add `COMMENT ON COLUMN` for every new column (purpose per slice spec)
   - Apply locally: `npm run db:migrate`

3. **`clinical.constants.ts`** additions:

   ```typescript
   export const ORDERS_API_BASE = '/api/clinical/orders';

   export const SEND_OUT_STATUS = {
     PENDING_COLLECTION: 'pending_collection',
     SENT_TO_VENDOR: 'sent_to_vendor',
     AWAITING_REPORT: 'awaiting_report',
     REPORT_RECEIVED: 'report_received',
     COMPLETED: 'completed',
   } as const;
   export const SEND_OUT_STATUS_VALUES = [ /* … */ ] as const;

   export const SEND_OUT_ACTION = {
     MARK_SENT: 'mark_sent',
     MARK_AWAITING_REPORT: 'mark_awaiting_report',
   } as const;
   export const SEND_OUT_ACTION_VALUES = [ /* … */ ] as const;

   export const ORDER_SEND_OUT_ERROR = {
     VENDOR_REQUIRED_FOR_SEND_OUT: 'vendor_required_for_send_out',
     INVALID_LAB_VENDOR: 'invalid_lab_vendor',
     INVALID_SEND_OUT_TRANSITION: 'invalid_send_out_transition',
     ITEM_NOT_SEND_OUT: 'item_not_send_out',
   } as const;
   ```

4. **Fix ORDER_STATUS drift** — extend to match DB CHECK:

   ```typescript
   export const ORDER_STATUS = {
     PENDING: 'pending',
     COLLECTED: 'collected',
     PROCESSING: 'processing',
     COMPLETED: 'completed',
     CANCELLED: 'cancelled',
   } as const;
   ```

5. **Backend types** — `orders.types.ts`:
   - Extend `OrderItem` / `OrderItemWire` with `referOut?: boolean`, `vendorId?: string`
   - `SendOutItemWire`, `DiagnosticOrderListResponse`, `PatchSendOutBody`
   - Unions from constants — not `string`

6. **Frontend mirrors** — `src/clinical/constants/orders.ts`, `src/clinical/types/orders.types.ts`

### Phase B — Backend API

7. **`orders.mapping.ts`** (new):
   - `shapeOrderListRow()` / `shapeOrderItemRow()` — snake_case wire with joined `vendor_name`, `vendor_code`
   - `toSendOutStatus()` — narrow DB strings
   - `mergeReferOutFromWire(resolved, wireItem)` — explicit `refer_out` on wire overrides catalog when provided (v1 minimum)

8. **Vendor validation helper** — in `sendOut.service.ts` or `orders.service.ts`:
   - `assertValidLabVendor(orgId, vendorId)` — query `contracted_organizations` where `org_type = laboratory`, same org, `active = true`, `status = active`
   - Return structured 422: `invalid_lab_vendor` or reuse LSO-1 error codes where appropriate

9. **Extend `createDiagnosticOrder()`** (and append-items path if lab items can be appended):
   - After `resolveDiagnosticOrderItems()`, for each line determine final `referOut` (catalog OR wire override)
   - When `referOut === true`:
     - Require `vendorId` on matching wire item → else 422 `vendor_required_for_send_out`
     - Validate vendor → else 422 `invalid_lab_vendor`
     - Set `send_out_status = pending_collection`, persist `vendor_id`
   - When `referOut === false`: `vendor_id` and `send_out_status` remain NULL
   - Wrap order + items insert in **transaction** (AD-14: validate encounter/patient in org before insert)
   - Extend insert values in the items loop (currently line ~82–91 in `orders.service.ts`)

10. **Extend `listDiagnosticOrders()`**:
    - Add query filters: `sendOut?: string` (`'true'`/`'false'`), `offset`
    - SQL filter on `diagnostic_order_items.refer_out` when `sendOut=true` (HAVING or subquery — not client filter)
    - Left join `contracted_organizations` as vendor on `diagnostic_order_items.vendor_id`
    - Extend `json_build_object` in `json_agg` with: `refer_out`, `vendor_id`, `vendor_name`, `vendor_code`, `send_out_status`, `sent_to_vendor_at`, `report_received_at`
    - Return `{ items, total, limit, offset }` with separate count query (AD-12)

11. **Extend `getDiagnosticOrder()`** — same extended item shape as list.

12. **New `patchSendOutStatus(userId, orgId, itemId, { action })`**:
    - Load item + parent order; verify org scope (AD-14)
    - Require `refer_out = true` else 422 `item_not_send_out`
    - Transitions:
      - `mark_sent`: from `pending_collection` → `sent_to_vendor`; set `sent_to_vendor_at`, `sent_to_vendor_by`
      - `mark_awaiting_report`: from `sent_to_vendor` → `awaiting_report`
    - Invalid transition → 422 `invalid_send_out_transition`
    - Auth: `LAB_ROLES` (`CLINICAL_ROLES` + `lab_tech`)

13. **`orders.schema.ts`** — full schemas (AD-9):
    - Extend create body item schema: `refer_out`, `vendor_id` (format uuid), `catalog_id`
    - Extend list query: `sendOut`, `offset`; fix `status` enum to use `ORDER_STATUSES`
    - Response schemas: `orderItemResponseSchema`, `orderListResponseSchema`, `orderDetailResponseSchema`, `patchSendOutBodySchema`, `errorResponseSchema`
    - Title Case AJV messages: `Vendor Id`, `Send Out Action`, etc.

14. **`orders.routes.ts`**:
    - Replace hardcoded paths with `` `${ORDERS_API_BASE}` ``, `` `${ORDERS_API_BASE}/:id` ``, etc.
    - Add `PATCH ${ORDERS_API_BASE}/items/:itemId/send-out` with full schema
    - Wire response schemas on **all touched routes** (create, list, get, send-out patch)

15. **`orders.controller.ts`** — thin handlers; map service failures to status codes via existing `sendResult` pattern if present.

### Phase C — Frontend

16. **`orders.service.ts`** — typed methods:
    - Update list return type to paginated shape
    - `patchSendOutStatus(itemId, action)` → PATCH send-out endpoint
    - Extend create payload items with `referOut`, `vendorId`, `catalogId`

17. **`queryKeys.orders`** + **`useDiagnosticOrders.ts`**:
    - `list(filters)`, `detail(id)`, mutations with invalidation
    - Filters include `sendOut: true` sent to API (do not strip)

18. **`LabOrderForm.tsx`**:
    - Track per selected test: `catalogId`, `referOut` (from lab catalog row when `facilityAvailability === 'refer_out'` or explicit toggle if product adds one)
    - When any selected line is send-out, show **vendor `Select`** populated from `useLabVendorsList({ active: 'true' })`
    - Block submit if send-out line lacks vendor; toast with link hint to Org setup when vendor list empty
    - Update `placeLaboratoryOrder()` / create call to send `{ catalogId, referOut, vendorId, testName }` per item
    - In-house lines: no vendor picker; `referOut: false`

19. **`LabOrderTracker.tsx`**:
    - Consume extended list API fields: `vendorName`, `sendOutStatus`, `referOut`
    - Show **Outsourced** badge + vendor name + send-out status label (from `SEND_OUT_STATUS` constants)
    - **Send-out filter** checkbox/tab → pass `sendOut=true` query param (backend filter)
    - **Mark sent** action (lab_tech / clinical roles) → `patchSendOutStatus` when status is `pending_collection`
    - Do **not** fetch vendor list to decorate rows — render API-provided `vendorName`

20. **`ordersMock.ts`**:
    - Map new snake/camel fields in list mapper
    - Pass `sendOut` filter to API query string
    - Keep fixtures for unit tests; production paths use real API shapes

21. **Tests** — update `LabOrderForm.test.tsx`, `LabOrderTracker.test.tsx` with mocked API returning vendor fields from backend shape.

### Phase D — Tests + docs

22. **Unit** — `orders.sendOut.service.test.ts`:
    - `refer_out` without `vendor_id` → 422 `vendor_required_for_send_out`
    - Invalid/cross-org/inactive vendor → 422 `invalid_lab_vendor`
    - `mark_sent` transition sets status + timestamps
    - Invalid transition rejected

23. **Schema** — `orders.schema.test.ts`:
    - Invalid item UUID on send-out PATCH
    - Title Case message on blank vendor id when refer_out true (if schema validates at AJV layer)

24. **Integration** — extend `clinical-service-surface.integration.test.ts`:
    - Create lab order with mock contracted org vendor + `refer_out`
    - List returns `vendor_name` in items
    - PATCH mark_sent updates `send_out_status`

25. **Integration mocks** — `db-mock-impl.ts`:
    - Default `diagnostic_order_items` mock rows include **all** new columns any handler destructures
    - Default `contracted_organizations` vendor row: `active: true`, `org_type: laboratory`, `status: active`

26. **openapi-get-sweep** — verify GET orders still < 500 after response schemas added; extend mock if serialization fails.

27. **README** — document new send-out endpoint in clinical orders module notes (create `orders/README.md` if missing).

---

## Step-by-step task checklist (implement order)

| # | Task | File(s) |
|---|------|---------|
| 1 | pgschema + constants + types (BE + FE mirrors) | pgschema, `clinical.constants.ts`, `orders.types.ts`, `src/clinical/constants/orders.ts` |
| 2 | Migration 015 + COMMENT ON + migrate | `015_lab_send_out_order_items.sql` |
| 3 | `orders.mapping.ts` + vendor validation helper | mapping, sendOut.service.ts |
| 4 | Extend create/append with vendor + send_out_status | `orders.service.ts`, `catalogResolve.ts`, `catalogs.types.ts` |
| 5 | Extend list/get with vendor join + paginated total | `orders.service.ts` |
| 6 | PATCH send-out service + controller | sendOut.service.ts, controller |
| 7 | Schemas + routes (ORDERS_API_BASE, response schemas) | `orders.schema.ts`, `orders.routes.ts` |
| 8 | Backend unit + schema + integration tests | `__tests__/*`, db-mock-impl |
| 9 | `npm run build` + vitest in backend | — |
| 10 | FE service, queryKeys, hooks | `orders.service.ts`, `useDiagnosticOrders.ts` |
| 11 | LabOrderForm vendor picker + create payload | `LabOrderForm.tsx` |
| 12 | LabOrderTracker outsourced UI + filter + mark sent | `LabOrderTracker.tsx`, `ordersMock.ts` |
| 13 | Frontend tests + `npm run lint` + `npx tsc -b` | — |
| 14 | Manual tracer + update status.yaml | hub `prd/.../slices/status.yaml` |

---

## Testing strategy

| Layer | What to test |
|-------|----------------|
| Unit | Vendor required when `refer_out`; invalid vendor 422; send-out status transitions |
| Schema | UUID params; Title Case AJV messages; extended create body |
| Integration | Create send-out order → list shows `vendor_name`; PATCH mark_sent |
| Regression | LSO-1 lab-vendors unchanged; in-house lab orders still work without vendor |
| openapi sweep | GET orders returns schema-valid payload; org mock `active: true` |
| Frontend | Vendor select blocks submit; tracker shows API vendor name; sendOut filter hits API |

---

## Validation commands

Run in `projects/his-global-south/`:

```bash
# Backend
cd backend
npm run db:migrate                    # after migration 015
npm run build
npm test -- --run src/modules/clinical/orders
npm test -- --run src/__tests__/integration/clinical-service-surface.integration.test.ts

# Frontend
cd ..
npm run lint
npx tsc -b
npm test -- --run src/components/orders
```

---

## Acceptance criteria

| Criterion | Validation |
|-----------|------------|
| Migration 015 applies; pgschema matches; COMMENT ON present | `db:migrate` + inspect migration file |
| Send-out item without `vendor_id` on create → **422** `vendor_required_for_send_out` | Unit test |
| Invalid/inactive/cross-org vendor → **422** `invalid_lab_vendor` | Unit test |
| List and detail return `vendor_name` from backend join | Integration test + manual tracker |
| Tracker shows outsourced badge + vendor + status for `refer_out` lines | Manual + component test |
| In-house lines (`refer_out=false`) show no vendor picker | Manual LabOrderForm |
| `mark_sent` sets `send_out_status=sent_to_vendor`, timestamps, user | Unit + integration |
| Deactivated vendor hidden from new orders; retained on existing rows | Manual: deactivate vendor, try new order |
| Zero vendors + send-out attempt → clear UI message → Org setup | Manual LabOrderForm |
| All changed routes have full response schemas | Schema/sweep tests |
| `ORDER_STATUS` constants match DB CHECK (5 values) | Grep + compile |
| CI green (lint, tsc -b, backend build, relevant tests) | Commands above |
| TD §9 matrix satisfied | Self-check against technical-design §9 |

---

## Manual tracer (post-implement)

1. **Super_admin:** Org setup → Lab vendors → ensure at least one active vendor (LSO-1).
2. **Clinician:** Orders → Lab → select a send-out test (catalog enrolled `refer_out` or explicit send-out line).
3. Pick **vendor** from dropdown → submit order.
4. **Lab tracker:** order shows **Outsourced** badge, vendor name, status `Pending collection`.
5. **Lab tech:** Mark sent → status becomes `Sent to vendor`.
6. Filter **Send-out only** → only outsourced lines shown.
7. **Regression:** place in-house lab order (no vendor) → succeeds; no vendor fields on row.

---

## Risks / notes

| Topic | Note |
|-------|------|
| List shape change | Moving from `unknown[]` to paginated `{ items, total }` breaks `ordersMock.ts` and any caller expecting a bare array — update all call sites in same slice |
| Catalog send-out | Today only catalog enrollment sets `referOut`; v1 also accepts explicit `refer_out` on wire for tests and manual send-out lines |
| `specimen_barcode` | Column added nullable; no generate API until LSO-3 |
| `report_received_at` | Column added; set manually or left null until LSO-4 PDF flow |
| Response schemas | First major orders route schema work — budget time for openapi-get-sweep mock fixes |
| Transaction | Create order + items should be one transaction once vendor validation added |

---

## Out of scope reminder

- Barcode generate/print/lookup (LSO-3)
- PDF upload + `diagnostic_order_item_documents` (LSO-4)
- Radiology send-out
- `organizations.has_in_house_lab`
- Vendor portal
