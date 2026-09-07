# PRD: Radiology Report Entry (In-House)

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature key** | `radiology-report-entry` |
| **Product** | flowMD |
| **Version** | **1.0 draft** |
| **Date** | 2026-09-03 |
| **Status** | Draft — **Gate G1 pending** (product + clinical review) |
| **Related** | [technical-design.md](./technical-design.md) · [Diagnostic results approval workflow PRD](../diagnostic-results-approval-workflow/prd.md) |
| **Depends on** | None for entry UI; **release to doctor** governed by approval workflow PRD (ops submit → radiologist approve) |

---

## 1. Summary

In-house radiology orders (studies performed on-site, as opposed to send-out/external orders) currently have **no way to record a report or progress the order past "Ordered."** Send-out radiology orders already have a working report-upload flow via `SendOutReportDialog`. This feature adds the equivalent for in-house orders: a report-entry screen (findings / impression / recommendation), a manual critical-finding flag, and PDF attachment — reusing the existing lab result-entry pattern and file-upload infrastructure rather than building either from scratch.

**Non-negotiable:** No changes to the existing lab result-entry flow or send-out radiology flow. This feature is **additive only**.

---

## 2. Background & problem

Discovered while investigating a user report of radiology orders showing "no button" for in-house studies:

| Symptom | Root cause |
|---|---|
| In-house radiology order shows no status progression past "Ordered" | No status-transition UI exists; `RadiologyOrderTracker.tsx` only renders action buttons for send-out orders, plus narrow "Acknowledge"/"Cancel" cases |
| Clicking the order opens a drawer with nothing in it | `RadiologyReportDrawer.tsx` is **read-only** — it can only display a report if one already exists; there is no create/write path |
| No "Upload report" option for in-house orders | Never built — `SendOutReportDialog` (the working upload flow) only applies to send-out orders (gated behind facility assignment) |
| `getRadiologyReport()` returns fabricated fields | `recommendation`, `radiologist`, and `pacsAvailable` are hardcoded stubs in `ordersWorkspace.service.ts` — no backing data exists |

Labs do not have this gap: `LabResultEntryDrawer.tsx` + `enterOrderResults` already provide full result entry, and the backend endpoint (`enterOrderResultsHandler`) is **already role-gated for radiology** (`RADIOLOGY_ROLES` check exists in the handler today) even though nothing on the frontend calls it for radiology yet.

This is a **pre-existing, undocumented product gap** — not part of the `emergency-triage` PRD's approved scope (which explicitly lists "Rebuilding order entry UIs" as out of scope). Building on `feat/emergency-triage` branch per explicit user decision, but this is an independent feature.

---

## 3. Goals & success metrics

| Goal | Metric | Target |
|------|--------|--------|
| Radiographer/doctor can record a report for an in-house study | Report entry succeeds and persists | 100% in QA |
| Critical findings are flagged and visible | Manually-flagged critical report triggers the existing "Critical Finding" banner | 100% |
| Report PDF can be attached | Upload succeeds, reusing existing `uploads`/MinIO pipeline | 100% |
| No regression to labs or send-out radiology | Existing lab + send-out test suites stay green | CI green |
| Reports are amendable, not silently overwritten | Correcting a verified report creates a new linked row, original preserved | 100% |

---

## 4. User personas

- **Radiographer** — performs the study, writes findings/impression/recommendation, flags critical findings, uploads the report PDF, **submits for approval** (does not release to ordering doctor).
- **Ordering doctor (OPD consult)** — views **released** reports via encounter **Reports & Documents** tab and `RadiologyReportDrawer` (see [encounter-lab-radiology-reports PRD](../encounter-lab-radiology-reports/prd.md)).
- **Radiologist (approval desk)** — reviews pending reports on radiology approval queue; **approve** or **reject** (see [diagnostic-results-approval-workflow PRD](../diagnostic-results-approval-workflow/prd.md)).

---

## 5. User workflows

### Workflow 1: Enter an in-house radiology report

**Trigger:** Radiographer opens an in-house order in "Ordered" or in-progress state.
**Persona:** Radiographer / Radiologist

1. Open the order from `RadiologyOrderTracker.tsx` (in-house tab).
2. Enter findings, impression, recommendation.
3. Optionally mark as critical finding (manual flag, same pattern as labs' Normal/Low/High/Critical dropdown).
4. Optionally attach a PDF (reuses `uploadPlatformFile`).
5. **Submit for approval** (any role in `RADIOLOGY_ROLES`, including `radiographer`) — requires non-empty findings + impression when submitting typed report. Sets line to **`pending_approval`**; ordering doctor does **not** see result until **radiologist approves** on approval queue (or admin break-glass).

**Note:** Separate **Verify** on ops desk is **superseded** by approval-queue approve action per [diagnostic-results-approval-workflow PRD](../diagnostic-results-approval-workflow/prd.md).

**Data Requirements:**

| Step | Data needed | Source |
|------|-------------|--------|
| Report content | findings/impression/recommendation | New `radiology_reports.content` (jsonb) |
| Critical flag | boolean | New `radiology_reports.is_critical` |
| PDF | uploaded file | Existing `uploads` table / MinIO |

### Workflow 2: Amend a verified report

**Trigger:** Senior radiologist needs to correct a previously verified report.
**Persona:** Radiologist

1. Open the existing verified report.
2. Create an amendment — a new `radiology_reports` row with `amends_report_id` pointing at the original; original row is never overwritten.

---

## 6. User stories

### US-1: Record findings for an in-house radiology study

**As a** radiographer, **I want** to enter findings/impression/recommendation for a completed study **so that** the ordering doctor can see the result.

**Acceptance Criteria:**
- [ ] Report entry screen available for in-house orders only (send-out flow unchanged)
- [ ] Content persists to `radiology_reports`
- [ ] Existing read-only `RadiologyReportDrawer` displays the saved content

**Priority:** Must Have

### US-2: Flag a critical finding

**As a** radiographer, **I want** to manually flag a report as critical **so that** the existing critical-finding banner surfaces it immediately.

**Acceptance Criteria:**
- [ ] Manual flag control in the entry screen (not auto-detected)
- [ ] Flag persists to `radiology_reports.is_critical`
- [ ] Existing `RadiologyOrderTracker` critical banner fires correctly (via dual-write to `diagnostic_order_items.abnormal_flag` — see technical-design.md)

**Priority:** Must Have

### US-3: Attach a report PDF

**As a** radiographer, **I want** to attach a scanned/generated report PDF **so that** it's available alongside the structured findings.

**Acceptance Criteria:**
- [ ] Reuses existing `uploadPlatformFile` → MinIO pipeline (no new storage mechanism)
- [ ] PDF viewable via signed URL, same pattern as send-out lab reports

**Priority:** Should Have

### US-4: Amend a verified report

**As a** senior radiologist, **I want** to correct a previously verified report without destroying the original **so that** there's a clinical audit trail.

**Acceptance Criteria:**
- [ ] Amending creates a new row linked via `amends_report_id`
- [ ] Original row is never deleted or overwritten

**Priority:** Should Have

---

## 7. Scope

### In Scope

- New `radiology_reports` table and its read/write endpoints
- In-house radiology report-entry UI (mirrors `LabResultEntryDrawer` pattern)
- Manual critical-finding flag
- PDF attachment (reuse of existing upload infra)
- Report amendment (new row, `amends_report_id` linkage)
- Dual-write to `diagnostic_order_items.abnormal_flag`/`result_value` so existing critical-banner/report-available badge logic keeps working without changes to the shared list endpoint

### Out of Scope

- Widening the backend order-status enum to natively support all 6 UI pipeline states (Ordered/Arrived/Imaging Done/Report Drafted/Report Verified/Delivered) — these continue to collapse onto the existing 5 generic states (`pending/collected/processing/completed/cancelled`), same as labs today
- Changing the shared diagnostic-orders list endpoint to join `radiology_reports` directly (the "Option B" alternative considered and deferred in favor of dual-write)
- OCR / text extraction from uploaded PDFs
- Any change to send-out (external) radiology reporting, which already works
- Any change to the lab result-entry flow

---

## 8. Edge cases

- Order has multiple studies (procedures) — report entry is per `diagnostic_order_item`, matching how lab results are already per-item.
- Report saved, pending approval — order should not show released to doctor until radiologist approves (see approval workflow PRD).
- Critical flag set on an amendment — banner logic re-evaluates from the current (dual-written) `abnormal_flag`, not the superseded draft.
- PDF upload fails after content save succeeds — content save and PDF link are separate steps; a partial save (content only, no PDF) must not block report completion.

## Design references

- None yet — no Figma/mockups produced during investigation.

---

<!-- Paste docs/templates/approval.md when ready for Gate G1 -->
