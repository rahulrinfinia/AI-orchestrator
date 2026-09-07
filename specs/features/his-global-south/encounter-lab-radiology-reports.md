# Encounter — Reports & Documents Tab

**Project:** his-global-south  
**Status:** Plan (awaiting approval)  
**PRD:** [prd/his-global-south/encounter-lab-radiology-reports/prd.md](../../../prd/his-global-south/encounter-lab-radiology-reports/prd.md)  
**Technical design:** [prd/.../technical-design.md](../../../prd/his-global-south/encounter-lab-radiology-reports/technical-design.md)  
**Scope (v1):** Read-only doctor access to saved **lab and radiology reports** from the consultation encounter workspace and signed encounter chart — **reuse existing data and APIs; no new LIS/RIS module.**

**Tab naming (intentionally broad):** The user-facing tab is **“Reports & Documents”** so v1 ships lab/radiology only, but the same encounter tab can later host **non-clinical documents** (consent forms, referral letters, insurance PDFs, uploaded attachments, etc.) without renaming the UI.

---

## 1. Goal

Doctors should view and print **all lab and radiology reports tied to the current patient encounter** without leaving the encounter to `/orders` or `/laboratory`.

Support both report shapes already in the system:

| Report type | Source in DB/API | Doctor actions |
|-------------|------------------|----------------|
| **PDF / uploaded** | `diagnostic_order_item_documents` via `has_report_pdf` — **same path for lab and radiology** (in-house + send-out) | View/open PDF, print |
| **System-entered** | Lab: `result_value` / `result_components`; Radiology: `radiology_reports.content` when **`resulted_at`** is set (same release rule as lab) | View full detail in-tab, print |

**Lab ↔ Radiology parity (PDF):** Upload, storage, list, view, and print for PDF reports must be **identical** for both order types. Both trackers already use `SendOutReportDialog` → `POST /api/clinical/orders/items/:itemId/report-documents`. The encounter tab reuses that same API and the same PDF viewer/print helpers — no separate radiology PDF path in this feature.

Reports must be linked to the **diagnostic order** placed on (or associated with) the **clinical encounter**.

---

## 2. Current state (baseline)

### What exists

- **Ordering in encounter:** Plan tab → `DiagnosticOrderSection` places lab/radiology orders; `listEncounterDiagnosticOrders(encounterId, orderType)` already calls `GET /api/clinical/orders?encounterId=&orderType=`.
- **Fulfillment elsewhere:** Lab/radiology **trackers** (`/orders`, `/laboratory`) have result drawers, PDF upload/view, print — **not wired into encounter UI**.
- **Signed chart:** `EncounterReadOnly` shows lab/radiology order **names only** (badges) — no results or PDFs.
- **Data model:** `diagnostic_orders.encounter_id` (required on consult orders) links orders to clinical encounters; items carry results, PDF flags, and radiology report embed fields via `orderItemsJsonAggSql`.

### Reusable APIs (no new nested route required for v1)

| Need | Endpoint / helper |
|------|-------------------|
| Orders for encounter (enriched items) | `GET /api/clinical/orders?encounterId={clinicalEncounterId}` |
| Order detail | `GET /api/clinical/orders/{orderId}` |
| **PDF documents (lab + radiology, in-house + send-out)** | `GET /api/clinical/orders/items/{itemId}/report-documents` |
| Typed lab result (UI layer) | `getLabOrderResult(orderId, itemId?)` in `ordersWorkspace.service.ts` |
| Structured radiology (UI layer) | `getRadiologyReport(orderId, itemId?)` in `ordersWorkspace.service.ts` |

**Not used in encounter tab (legacy / optional):** `radiology_reports.upload_id` and `POST .../radiology-report/:reportId/upload` — only used when attaching a PDF to a **draft** from `RadiologyResultEntryDrawer`. Tracker “Upload Result” for radiology uses the same `report-documents` table as lab.

### Gaps

- No encounter tab for reports.
- `listEncounterDiagnosticOrders` returns **thin** rows (id, priority, test names) — **not** `has_report_pdf`, `resulted_at`, `radiology_report_status`, etc.
- Read-only signed encounter has no report viewing.
- Doctor role may not have lab-tech/radiographer roles — report **read** endpoints must remain accessible to clinical/doctor roles (verify auth on `listReportDocuments`).

---

## 3. UX design

### 3.1 New consultation tab

Add stage **`reportsAndDocuments`** (display label: **“Reports & Documents”**) to consultation workspace.

**v1 content:** Lab + radiology reports only (sub-filter Laboratory / Radiology).  
**Future (out of v1):** Additional sections or filters for non-clinical encounter documents — same tab shell, new data sources.

**Placement:** After **Plan** and before **Care Templates** (product decision — reports follow orders placed on Plan).

**Wire in three places** (existing pattern — no dynamic registry):

1. `CONSULTATION_STAGES` in `src/pages/consultationWorkspace/types.ts`
2. `ConsultationStageNav.tsx` — new `TabsTrigger` (“Reports & Documents”)
3. `consultationWorkspace/index.tsx` — mount new tab component

**Deep link:** `/consultation/:visitId?tab=reportsAndDocuments` (same `?tab=` mechanism as Care Templates).

**Navigation:** Tab is **outside** the linear Back/Next SOAP pipeline (like Care Templates) — optional direct access; does not block sign flow.

### 3.2 Tab content layout

```
┌─────────────────────────────────────────────────────────────┐
│ Reports & Documents                                          │
├─────────────────────────────────────────────────────────────┤
│ [Laboratory (n)] [Radiology (n)]   ← v1 sub-tabs; future:    │
│                                     Other documents (n)      │
├─────────────────────────────────────────────────────────────┤
│ For each ORDER on this encounter:                            │
│   Accession · priority · status · ordered time               │
│   For each LINE ITEM:                                        │
│     Test/procedure name                                      │
│     Status: Not ready | In progress | Result available       │
│     CRITICAL badge on line when isCritical (lab + radiology) │
│     Actions (when result available):                         │
│       · View report  → drawer/modal                          │
│       · Print        → existing print helpers                │
├─────────────────────────────────────────────────────────────┤
│ Empty state: “No lab or radiology orders for this visit”    │
│ Pending state: show line with “Not ready” (do not hide)      │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 View behavior by report kind (symmetric lab / radiology)

**Single classifier per line item — identical rules for both order types.**

**Release rule (product — two-tier HMIS):** A line is **available to the doctor** only when **approved/released** by pathologist (lab) or radiologist (radiology). Ops desk submit → **`pending_approval`** → approver queue → **`released`**. Full workflow: [diagnostic-results-approval-workflow.md](./diagnostic-results-approval-workflow.md).

| Priority | Condition | Kind | View action |
|----------|-----------|------|-------------|
| 1 | `approval_status === 'released'` (or `approved_at` set) + `has_report_pdf` | **PDF** | Open PDF + print |
| 2 | **Released** + typed content (lab: `result_components` / `result_value`; radiology: structured report) | System-entered | **`LabResultDrawer`** or **`RadiologyReportDrawer`** + print |
| — | `pending_approval` | Submitted, not released | **“Awaiting approval”** — no View/Print |
| — | `rejected` | Approver sent back to ops | **Not shown to doctor** (ops must re-submit) |
| — | No submit yet | — | **“Not ready”** |
| — | **`approval_exempt`** (bedside POC — emergency triage only) | Released at entry | **View / print immediately** — no approval queue |

**Prerequisite:** Approval workflow slices (platform roles + submit/approve/reject APIs + approval queues) land **before or with** encounter tab slice 2. Bedside exempt path must stay compatible with `recordBedsidePocResult` / `BedsideResultEntry`.

### 3.4 Signed / read-only encounter

Extend **`EncounterReadOnly`** (`/encounters/:visitId`) with a **“Reports & Documents”** section (or reuse the same tab component in read-only mode):

- Same list + view/print actions.
- No ordering actions.

Optional: **`ConsultationClosedView`** (`?readOnly=true`) — link “View reports” to the same panel or deep-link to read-only encounter section.

---

## 4. Data & filtering rules

### 4.1 Which orders to show

**Primary filter (v1):** `GET /api/clinical/orders?encounterId={clinicalEncounterId}`

- Includes all lab + radiology orders **placed on this consult encounter** (matches “ordered during this visit” mental model).

**Open product question (v1.1):** Also show orders **fulfilled** on a linked service-line encounter (`fulfilling_encounter_id`) or **patient-level** results completed after visit but ordered from this encounter — v1 stays encounter-scoped only.

### 4.2 Result availability

Reuse frontend helpers already aligned with trackers:

- `resultAvailable` / `hasReportPdf` from enriched order list mapping
- `isPdfOnlyLabResult`, `isPdfOnlyRadiologyResult` from `orderResults.ts`

### 4.3 Auth

- Confirm **`GET .../report-documents`** and **`GET /api/clinical/orders`** allow **doctor** role (not only lab tech / radiographer).
- If list documents is restricted, add **`clinicalOnly`** read path or widen role gate for GET (POST upload stays role-gated).

---

## 5. Technical approach (reuse-first)

### 5.1 Frontend — new files

| File | Responsibility |
|------|----------------|
| `src/pages/consultationWorkspace/components/tabs/ReportsAndDocumentsTab.tsx` | Tab shell: v1 lab/radiology sections; extensible for future document types |
| `src/components/consultation/EncounterDiagnosticReportsList.tsx` | Lab/radiology list + actions (used by tab + EncounterReadOnly) |
| `src/services/encounterReports.service.ts` (optional thin wrapper) | `listEncounterDiagnosticReports(encounterId)` → full order payloads |

### 5.2 Frontend — extend / reuse

| Asset | Reuse |
|-------|--------|
| `LabResultDrawer` | View + print typed lab / panel |
| `RadiologyReportDrawer` | View + print structured radiology **and** PDF-only radiology (embeds PDF like lab drawer) |
| `SendOutReportDialog` or extract `ReportPdfPanel` | **Shared** PDF view + print for lab **and** radiology line items |
| `getLabOrderResult`, `getRadiologyReport`, `listLabOrderReportDocuments` | Data loading — both PDF paths resolve via `report-documents` |
| `isPdfOnlyLabResult`, `isPdfOnlyRadiologyResult` | Same “PDF vs system-entered” split for both types |
| `printPdfFromUrl`, `printWithSuggestedPdfFilename` | Print |

### 5.3 Frontend — service change

Extend encounter order fetch to use **full list response** (not `DiagnosticOrderListRow` thin type):

```typescript
// Replace or supplement listEncounterDiagnosticOrders with:
listEncounterDiagnosticOrdersFull(encounterId: string): Promise<DiagnosticOrder[]>
// GET /api/clinical/orders?encounterId= — map items with hasReportPdf, resultedAt, etc.
```

Map via existing `ordersWorkspace` row mappers where possible (`toLabOrderTestRow`, `toRadiologyOrderTestRow` patterns) to avoid duplicating status logic.

### 5.4 Backend — v1

**Encounter tab (this feature):** Prefer zero backend changes if doctor can already GET orders + report-documents.

**Radiology tracker + approval (prerequisite — see [diagnostic-results-approval-workflow.md](./diagnostic-results-approval-workflow.md)):**

- Ops: submit for approval (lab + rad + PDF); no direct release to clinician.
- Approve APIs gated by `LAB_APPROVE_ROLES` / `RADIOLOGY_APPROVE_ROLES` (`pathologist`, `radiologist`, admin tier).
- Add `pathologist` role; wire `radiologist` into invite roster.

**Encounter tab (this feature):** Prefer minimal backend if approval fields already on order list GET.

**If auth gap found on read paths:**

- Widen read role on `listReportDocumentsHandler` to include doctor/clinical roles.
- Ensure OpenAPI response schemas document item fields doctors need (already mostly present).

**Optional v1.1:**

- `GET /api/clinical/encounters/:id/diagnostic-reports` convenience aggregator (single round-trip) — **not required for v1**.

---

## 6. Vertical slices (implementation order)

### Slice 1 — Tracer bullet (one order type, one line)

- Add tab shell + fetch `GET /orders?encounterId=`
- Show one line with **system-entered lab** result → `LabResultDrawer` + print
- **Same tab, same list component** ready for radiology rows (filter only)

**Done when:** Doctor opens consultation → **Reports & Documents** tab → sees lab result → prints.

### Slice 2 — PDF + radiology (symmetric with lab)

- **PDF lines (lab or radiology):** view/print via `report-documents` — identical UX, no type-specific branch
- **Structured radiology:** `RadiologyReportDrawer` when line **`released`** (after pathologist/radiologist approve)
- Sub-tabs or filter: Laboratory / Radiology
- Manual check: ops submit → approver approve → doctor sees **View Report** in encounter tab

**Prerequisite:** [Approval workflow](../diagnostic-results-approval-workflow/technical-design.md) slices A–C.

### Slice 3 — Read-only encounter chart

- Embed same list component in `EncounterReadOnly`
- Verify signed encounter still loads reports

### Slice 4 — Polish

- Empty/pending states, loading skeletons, error toasts
- Badge counts on tab label (“Reports (2)”)
- Refresh on realtime / focus (optional: poll while any item pending)

---

## 7. Testing plan

| Layer | Cases |
|-------|--------|
| **Unit** | Report availability classifier (PDF vs typed vs pending); map encounter orders to line rows |
| **Component** | Tab empty state; line with PDF shows View; line pending hides actions |
| **Integration** | `GET /orders?encounterId=` returns items with `has_report_pdf` / `resulted_at`; doctor role can list report-documents |
| **Manual** | Place lab order in Plan → fulfill in tracker → encounter tab view + print; same for radiography typed save (one step) and PDF upload; signed encounter read-only |

---

## 8. Out of scope (v1)

- Placing/editing orders from this tab (stays on Plan tab)
- Lab/radiology **tracker** workflow (assign send-out, mark received, enter results)
- Amendment history for radiology reports
- Patient-wide report archive across all encounters (only **this encounter’s orders**)
- New file storage or report generation
- **Non-clinical documents** in this tab (consent, referral, insurance, etc.) — tab name reserves space; implementation is a follow-on slice

---

## 9. Product decisions (resolved)

| # | Question | Decision |
|---|----------|----------|
| 1 | **Scope** | **This encounter only** — orders placed on the current clinical encounter (`GET /orders?encounterId=`). No patient-wide or cross-visit results in v1. |
| 2 | **Tab position** | **After Plan**, before Care Templates. |
| 3 | **Pending items** | **Show all ordered lines**; not-yet-resulted rows display **“Not ready”** (no View/Print actions). |
| 4 | **Critical results** | **Red CRITICAL badge on the line item** when `isCritical` is true (reuse lab/radiology tracker badge styling). No tab-level banner in v1. |
| 5 | **IPD / other visit types** | **Consultation only for v1** — not IPD or other service-line encounter types. |
| 6 | **Lab / radiology release** | **Two-tier HMIS workflow** — ops desk (`lab_tech` / `radiographer`) submits; **`pathologist` / `radiologist` approve** before doctor sees results. See [diagnostic-results-approval-workflow.md](./diagnostic-results-approval-workflow.md). *(Supersedes prior “same person finalizes” decision.)* |

---

## 10. Approval

- [x] Product approves UX (tab placement, pending vs available-only, encounter scope, critical badge)
- [ ] Engineering approves reuse approach (no new backend for v1)
- [ ] Ready for slice 1 implementation

---

## Appendix — key file references

| Area | Path |
|------|------|
| Consultation workspace | `src/pages/consultationWorkspace/index.tsx` |
| Stage constants | `src/pages/consultationWorkspace/types.ts` |
| Stage nav | `src/pages/consultationWorkspace/components/ConsultationStageNav.tsx` |
| Encounter order list API wrapper | `src/services/consultationWorkspace.service.ts` |
| Signed encounter | `src/pages/encounters/EncounterReadOnly.tsx` |
| Lab result drawer | `src/components/orders/LabResultDrawer.tsx` |
| Radiology drawer | `src/components/orders/RadiologyReportDrawer.tsx` |
| PDF dialog | `src/components/orders/SendOutReportDialog.tsx` |
| Order list API | `GET /api/clinical/orders?encounterId=` |
| Item projection | `backend/.../orders.mapping.ts` → `orderItemsJsonAggSql` |
