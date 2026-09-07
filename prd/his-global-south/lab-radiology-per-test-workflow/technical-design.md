# Technical Design: Per-Test Status, Panel Results & Upload Parity

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `lab-radiology-per-test-workflow` |
| **PRD** | [prd.md](./prd.md) |
| **Target repo** | `projects/his-global-south/` @ `feat/emergency-triage` |
| **Status** | Draft — pending implementation approval |
| **Date** | 2026-09-04 |
| **Depends on** | `testRows` per-test view-model already shipped (`ordersWorkspace.service.ts`, `LabOrderTracker.tsx`, `RadiologyOrderTracker.tsx`), existing `report-documents` upload endpoint, existing `SEND_OUT_ACTION` item-level send-out transitions |

---

## 0a. Forward-compatibility with future OCR/AI extraction (design constraint, not in scope to build now)

OCR-based auto-extraction from an uploaded report (read the PDF → auto-fill the result fields) is explicitly **not built in this pass** — but the data model and write paths below are deliberately chosen so that adding it later requires no redesign, only a new caller:

- **Lab:** `result_components` (§1a) is a plain structured array (`[{name, value, unit, referenceRange, flag}]`) written through `enterOrderResults` (§2b). A future OCR step would read an uploaded report and produce this same array — the endpoint doesn't distinguish "a human typed this" from "OCR extracted this." The likely future integration point is pre-filling the dynamic entry form (§3) for human review/confirmation before submit, not a silent auto-save — but that's a UI decision for later, not a schema one.
- **Radiology:** `content` (`{findings, impression, recommendation}`, already shipped this session via `upsertRadiologyReport`) has the identical property — a future OCR/AI-extraction step populates the same three fields through the same endpoint.

**The commitment this locks in:** both write endpoints must stay source-agnostic — accept a structured payload, persist it, no assumption about who/what produced it. Do not couple either endpoint to "submitted via the manual form" in a way that would require changing it when an OCR caller is added later.

---

## 0. Non-regression constraint

**Additive only.**
- `diagnostic_order_items.result_value`/`result_unit`/`reference_range`/`abnormal_flag` — untouched, still the path for non-panel tests.
- `lab_test_catalog.sub_test_names` — untouched, kept for backward compatibility; new richer data lives in a new column.
- Order-level bulk send-out actions (`handleMarkSent`, `handleMarkAwaitingReport`, `AssignSendOutFacilityDialog`) — unchanged, kept alongside new per-test controls per explicit user confirmation.
- `enterOrderResults`'s existing scalar-result code path — unchanged; `result_components` is a new, optional, additional path only taken for panel items.

---

## 1. Schema

### 1a. `diagnostic_order_items` — new migration `026_lab_item_status_and_panels.sql`

```sql
ALTER TABLE public.diagnostic_order_items
  ADD COLUMN IF NOT EXISTS received_at timestamptz,
  ADD COLUMN IF NOT EXISTS processing_at timestamptz,
  ADD COLUMN IF NOT EXISTS result_components jsonb;

COMMENT ON COLUMN public.diagnostic_order_items.received_at IS
  'In-house per-item status timeline (with collected_at/resulted_at) — specimen received by lab.';
COMMENT ON COLUMN public.diagnostic_order_items.processing_at IS
  'In-house per-item status timeline — specimen actively being processed.';
COMMENT ON COLUMN public.diagnostic_order_items.result_components IS
  'Per-analyte panel results: [{name, value, unit, referenceRange, flag}]. NULL for non-panel '
  'items, which keep using result_value/result_unit/reference_range/abnormal_flag as before.';
```

Per-item derived status becomes a 6-state timeline (mirrors `LAB_PIPELINE_STEPS`): `resulted_at → processing_at → received_at → collected_at`, first-match-wins, `ordered` if none set. No sequence is enforced server-side — a status can be set out of order (e.g. `processing_at` without `received_at`); this matches how order-level bulk actions already behave today (no existing sequence enforcement to preserve consistency with).

### 1b. `lab_test_catalog` — same migration, additive column

```sql
ALTER TABLE public.lab_test_catalog
  ADD COLUMN IF NOT EXISTS sub_test_components jsonb;

COMMENT ON COLUMN public.lab_test_catalog.sub_test_components IS
  'Richer panel analyte definitions: [{name, unit, referenceRange}]. sub_test_names (existing, '
  'names-only) stays for backward compat; the result-entry form prefers this column when present '
  'and falls back to sub_test_names (name-only fields, no unit/range) otherwise.';
```

Existing panel catalog entries are **not** backfilled by this migration — `sub_test_components` starts NULL everywhere, populated by an admin editing the catalog (Catalog Browser → Lab tab). Panels without it yet still work via the `sub_test_names` fallback (plain labeled fields, no unit/reference-range shown).

### 1c. Drizzle mirrors

`diagnostic-order-items.pgschema.ts` and `lab-test-catalog.pgschema.ts` get the 4 new columns added (`timestamp({withTimezone:true,mode:'string'})` ×2, `jsonb()` ×2) — same pattern as every other additive column mirror this session.

---

## 2. Backend

### 2a. Per-item status advancement (in-house)

New function in `orders.service.ts`, sibling to `enterOrderResults`:

```ts
export async function advanceOrderItemStatus(
  orderItemId: string,
  organizationId: string,
  targetTimestampField: 'received_at' | 'processing_at',
): Promise<void>
```

Verifies org ownership (same join-through-`diagnostic_orders` pattern as every other item-scoped function this session), sets the one timestamp column to `now()`. Does **not** touch `resulted_at` — this is the "advance without resulting" mode `enterOrderResults` doesn't have. New route: `POST /api/clinical/orders/items/:itemId/status` with `{ field: 'received' | 'processing' }` in the body, gated by the existing `RADIOLOGY_ROLES`/`LAB_ROLES` role sets (draft-equivalent access — same as who can enter a result, not a narrower gate).

### 2b. Panel result entry

`enterOrderResults` (`orders.service.ts:506-554`) extended: `ResultEntry` gains an optional `resultComponents?: { name: string; value: string; unit?: string; referenceRange?: string; flag?: string }[]`. When present, write to `result_components` instead of `result_value`; when absent, unchanged scalar path. Order-completion check (`NOT EXISTS ... WHERE resulted_at IS NULL`) already works unmodified — `resulted_at` still gets stamped either way, so partial-completion and auto-complete logic need zero changes.

### 2c. Send-out per-test actions

No backend change — `SEND_OUT_ACTION` (assign_laboratory/mark_sent/mark_awaiting_report) already operates per `itemId` via the existing `PATCH .../send-out` route. This section is **frontend-only wiring**.

### 2d. Upload for in-house

No backend change — `report-documents` endpoint (`orders.routes.ts:88-119`) already accepts any `itemId` regardless of type, already role-gated per item type inside `linkReportDocumentHandler`. Frontend-only.

---

## 3. Frontend

**`ordersWorkspace.service.ts`:**
- `LabOrderTestRow` gains `receivedAt`/`processingAt` (for in-house status derivation, now 6-state not 3-state) and `resultComponents?: {name, value, unit, referenceRange, flag}[] | null`.
- New `advanceItemStatus(itemId, field)` service function → new endpoint from §2a.
- `submitOrderResults`'s `SubmitResultEntry` gains optional `resultComponents`.

**`LabOrderTracker.tsx` / `RadiologyOrderTracker.tsx` per-test row, both in-house and send-out:**
- **Status control**: small button group or dropdown next to the existing action button, showing the next 1-2 valid transitions (not a full dropdown of all 6 states — keeps it a light touch, matching the existing order-level `getInHouseLabAction`'s "one primary next action" pattern). In-house calls `advanceItemStatus`; send-out calls the existing `patchLabOrderSendOut(itemId, action)` already used by the order-level bulk buttons, just now triggered per-test.
- **Entry form** (`LabResultEntryDrawer.tsx`, `RadiologyResultEntryDrawer.tsx` follows the same pattern): each item row checks `catalogItem.isPanel` (needs to be threaded through from the order item's `lab_test_catalog_id` — the entry-fetch functions already join through catalog data for display name, extend to also carry `subTestComponents`/`subTestNames`). If panel: render one labeled input per analyte (unit/reference-range shown as read-only hints from `sub_test_components`, or bare labels if only `sub_test_names` exists). If not: unchanged single value/unit/flag/notes form.
- **Upload option**: in-house test rows gain the same "Upload Report" button send-out already has, reusing `SendOutReportDialog`'s underlying `uploadPlatformFile` + `linkReportDocument` calls (component itself may need a rename/generalization since "SendOut" is now inaccurate for an in-house use — recommend renaming to `TestReportUploadDialog` or adding a prop-driven label, decide at implementation time).

---

## 4. Validation plan

Per repo CI-matching rules: `backend/** ` → `npm run build`; `src/**` → `npm run lint` + `npx tsc -b`; schema/route changes → integration tests covering per-item status advancement (order status unaffected), panel result round-trip (write components, read them back correctly shaped), and a regression check that non-panel single-value entry is byte-for-byte unchanged.

---

<!-- Implementation not started — pending explicit go-ahead per project workflow. -->
