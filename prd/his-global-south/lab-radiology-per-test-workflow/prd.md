# PRD: Per-Test Status, Panel Results & Upload Parity (Lab & Radiology)

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature key** | `lab-radiology-per-test-workflow` |
| **Product** | flowMD |
| **Version** | **1.0 draft** |
| **Date** | 2026-09-04 |
| **Status** | Draft — **Gate G1 pending** (clinical + lab-ops review) |
| **Related** | [technical-design.md](./technical-design.md) · builds directly on the per-test expandable-row work already shipped this session (`LabOrderTracker.tsx`, `RadiologyOrderTracker.tsx`) |
| **Depends on** | `testRows` per-test view-model (`ordersWorkspace.service.ts`), already-shipped mixed in-house/send-out tab separation |

---

## 1. Summary

The per-test expandable rows shipped earlier this session solved list separation and per-test visibility, but exposed three follow-on gaps once real usage started:

1. **No way to advance a single test's status** — only order-level bulk actions exist (mark all send-out tests sent, etc.); nothing lets lab staff progress one test at a time.
2. **Panel tests can't be resulted correctly** — "Liver Function Panel" is one order item with one scalar `result_value`, but it's actually 5-6 distinct analytes (ALT, AST, ALP, Bilirubin, Albumin, Total Protein), each needing its own value/unit/reference range.
3. **Upload is send-out-only** — an in-house test has no PDF-upload alternative to manual value entry, even though the infrastructure for it already exists and is already generic across item types.

**Non-negotiable:** every one of these three capabilities must work identically for **both** in-house and send-out (external) tests — not asymmetric. Confirmed explicitly with the user: per-test status buttons and order-level bulk actions **both** stay (batch courier pickup is a real workflow, not just individual convenience).

---

## 2. Background & problem

Discovered during live testing of the per-test row redesign:

| Symptom | Root cause |
|---|---|
| Lab staff can't mark one test "collected" without touching the rest of the order | No per-item status column or endpoint exists; only order-level 4-state status (`pending/collected/processing/completed`), with two of the six pipeline steps shown in the UI (`received`, `verified`) being fake — detected via a substring marker hidden in the order's free-text `notes` field |
| Liver Function Panel result entry is one text box | `diagnostic_order_items.result_value` is a single scalar column; `lab_test_catalog.sub_test_names` already lists the panel's analyte *names* but carries no unit/reference-range metadata to drive a real form |
| In-house tests have no "just upload the report" option | `report-documents` upload endpoint is already generic (works for any item type, already role-gated per lab/radiology) but has only ever been wired into send-out UI |

---

## 3. Goals & success metrics

| Goal | Metric | Target |
|------|--------|--------|
| Per-test status advances independently | Advancing test A's status doesn't affect sibling test B on the same order | 100% |
| Panel results captured per-analyte | Liver Function Panel shows 6 labeled fields, not 1 | 100% in QA |
| Upload available on every test | In-house test row has an upload option, same as send-out | 100% |
| Symmetric in-house/send-out UX | Same 3 capabilities present regardless of test type | 100% |
| No regression | Existing order-level bulk actions (Assign laboratory, Mark sent, etc.) keep working unchanged | CI green |
| Non-panel tests unaffected | Single-analyte test entry form stays exactly as it is today | 100% |

---

## 4. User personas

- **Lab technician / phlebotomist** — collects specimens, advances in-house test status, enters or uploads results.
- **Lab desk staff (send-out)** — assigns external laboratories, advances send-out status per test or in bulk, uploads/receives external reports.
- **Radiographer** — same per-test status/upload parity, radiology side.
- **Doctor** — views results, benefits from panel tests being readable per-analyte instead of one blob string.

---

## 5. User workflows

### Workflow 1: Advance one test's status without touching the rest of the order

**Trigger:** Lab tech has collected the specimen for 1 of 3 tests on an order.
**Persona:** Lab technician

1. Expand the order row.
2. On that one test's row, advance its status (e.g. pending → collected).
3. The other two tests on the order remain at their own, independent status.

### Workflow 2: Enter a panel result

**Trigger:** Liver Function Panel result comes back from the analyzer.
**Persona:** Lab technician

1. Expand the order, click "Enter Result" on the panel test's row.
2. Form renders one labeled field per analyte (name, unit, reference range pulled from catalog).
3. Save — stored per-analyte, not as one string.

### Workflow 3: Upload instead of manual entry (in-house)

**Trigger:** An in-house analyzer produces a PDF instead of discrete values.
**Persona:** Lab technician

1. On an in-house test's row, choose "Upload Report" instead of "Enter Result."
2. Same upload flow already used for send-out reports.

---

## 6. User stories

### US-1: Per-test status control

**As a** lab technician, **I want** to advance one test's status independently **so that** a multi-test order doesn't force me to treat all its tests as one unit.

**Acceptance Criteria:**
- [ ] Per-test status control present on every test row, in-house and send-out
- [ ] Order-level bulk actions still work unchanged, side by side with per-test controls
- [ ] Advancing one test's status has zero effect on sibling tests

**Priority:** Must Have

### US-2: Panel result entry

**As a** lab technician, **I want** a labeled field per analyte for panel tests **so that** I can record Liver Function Panel (or any panel) correctly.

**Acceptance Criteria:**
- [ ] Panel tests render N labeled fields (name/unit/reference range from catalog)
- [ ] Non-panel tests are completely unaffected — same single-value form as today
- [ ] Works for both in-house entry and send-out manual entry

**Priority:** Must Have

### US-3: Upload parity

**As a** lab technician, **I want** to upload a report for an in-house test **so that** I'm not forced into manual entry when a PDF is what I have.

**Acceptance Criteria:**
- [ ] Upload option present on in-house test rows (already present on send-out)
- [ ] Reuses existing `report-documents` upload infrastructure, no new storage mechanism

**Priority:** Should Have

---

## 7. Scope

### In Scope

- 3 new nullable timestamp-style additions enabling per-item status derivation for in-house tests (`received_at`, `processing_at`)
- `result_components` jsonb column on `diagnostic_order_items` for panel results (additive — scalar columns untouched for non-panel tests)
- Catalog enrichment: `lab_test_catalog` sub-test names gain unit + reference range metadata
- New lightweight backend endpoint: advance one item's status without forcing a result
- `enterOrderResults` extended to accept `result_components` for panel items
- Frontend: per-test status control, dynamic panel-aware entry form, upload option — wired symmetrically for in-house and send-out on both trackers

### Out of Scope

- Redesigning the order-level status pipeline's existing "received"/"verified" notes-substring hack — noted as pre-existing technical debt, not fixed in this pass
- Any change to `clinical_observations` (confirmed disconnected from this flow, not reused here — its FHIR-component shape was considered but the simpler `result_components` jsonb on the existing item table was chosen to avoid pulling in an unrelated, currently-unused subsystem)
- LOINC coding or any terminology-standardization work for panel analytes
- Changing how panels are ordered/created (still one order item per panel — analytes are a result-time concept only, not an order-item-count concept)

---

## 8. Edge cases

- A panel test where only some analytes are filled in — must save partial data, not require all-or-nothing (mirrors existing order-level partial-completion behavior).
- Advancing a test's status out of order (e.g. skipping "collected" straight to "processing") — needs an explicit decision: allow freely, or enforce sequential progression? (Flagged for technical-design.md.)
- A test that starts as a panel gets its catalog definition edited later (analyte list changes) — already-recorded historical results should not retroactively change shape.

---

<!-- Paste docs/templates/approval.md when ready for Gate G1 -->
