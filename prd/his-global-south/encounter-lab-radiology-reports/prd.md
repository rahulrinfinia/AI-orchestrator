# PRD: Encounter — Reports & Documents (Lab + Radiology)

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature key** | `encounter-lab-radiology-reports` |
| **Product** | flowMD |
| **Version** | **1.0** |
| **Date** | 2026-09-05 |
| **Status** | Draft — **Gate G1 pending** (product UX approved; engineering review) |
| **Related** | [diagnostic-results-approval-workflow PRD](../diagnostic-results-approval-workflow/prd.md) · [Implementation spec](../../../specs/features/his-global-south/encounter-lab-radiology-reports.md) · [technical-design.md](./technical-design.md) · [slices/](./slices/README.md) |
| **Depends on** | [Diagnostic results approval workflow](../diagnostic-results-approval-workflow/prd.md) (doctor sees **released** results); existing order/report APIs |
| **Blocks** | None |

---

## 1. Summary

Doctors should **view and print lab and radiology reports for the current consultation encounter** without leaving the encounter to `/orders` or `/laboratory`.

Add a new consultation tab **“Reports & Documents”** (name intentionally broad for future non-clinical docs). **v1:** lab + radiology only. Same list on **signed/read-only encounter** chart.

**Reuse-first:** existing drawers (`LabResultDrawer`, `RadiologyReportDrawer`), PDF viewer (`SendOutReportDialog`), and `GET /api/clinical/orders?encounterId=` — no new LIS/RIS module.

**Release rule:** Doctor sees a line only when **approved/released** by pathologist (lab) or radiologist (radiology), except **emergency triage bedside POC** (immediate).

---

## 2. Background & problem

| Symptom | Root cause |
|---------|------------|
| Doctor orders labs/rads on Plan but cannot see results in consult | Fulfillment only on trackers; no encounter UI |
| Signed chart shows test names only — no results/PDFs | `EncounterReadOnly` badges order names, not report content |
| Doctor navigates to `/laboratory` mid-consult | Broken workflow; context switch |
| Thin encounter order fetch missing `has_report_pdf`, approval fields | `listEncounterDiagnosticOrders` returns minimal rows |

---

## 3. Goals & success metrics

| Goal | Metric | Target |
|------|--------|--------|
| Doctor views released lab result in encounter | Open tab → View → Print | 100% manual QA |
| Doctor views released radiology (typed + PDF) | Same UX as lab | 100% |
| Pending/rejected not shown as final | Classifier correct per line | 100% unit tests |
| Signed encounter shows same reports | Read-only embed works | 100% |
| No new backend module for v1 | Reuse GET orders + report-documents | Confirmed in review |
| Consultation-only v1 | IPD out of scope | N/A |

---

## 4. User personas

- **Ordering doctor (OPD consult)** — primary user; views/prints reports during or after visit.
- **Nurse / other clinical staff** — may view read-only encounter chart with reports section.

---

## 5. User workflows

### Workflow 1: View released lab report during consultation

**Trigger:** Lab result approved while doctor still in consult (or doctor returns to open visit).  
**Persona:** Doctor

1. Open consultation workspace.
2. Go to **Reports & Documents** tab (after Plan).
3. See lab line with status **Result available** (released).
4. Click **View report** → `LabResultDrawer`; **Print**.

### Workflow 2: Awaiting approval — doctor visibility

**Trigger:** Ops submitted result; pathologist has not approved.  
**Persona:** Doctor

1. Open **Reports & Documents** tab.
2. Line shows **“Awaiting approval”** — no View/Print.
3. If `isCritical`, **CRITICAL** badge visible (urgency signal).

### Workflow 3: View reports on signed encounter

**Trigger:** Doctor opens completed encounter chart.  
**Persona:** Doctor

1. Navigate to `/encounters/:visitId`.
2. **Reports & Documents** section (or embedded tab component, read-only).
3. Same view/print actions for **released** lines only.

### Workflow 4: Bedside POC (ED) — immediate view

**Trigger:** Bedside result recorded during emergency triage on same encounter.  
**Persona:** Doctor

1. Reports tab shows result **without** awaiting approval (approval exempt).

---

## 6. User stories

### US-1: Reports & Documents tab in consultation

**As an** OPD doctor, **I want** a tab in the consultation workspace for lab and radiology reports **so that** I don’t leave the encounter to find results.

**Acceptance Criteria:**

- [ ] Tab label **“Reports & Documents”**; stage key `reportsAndDocuments`
- [ ] Placement **after Plan**, before Care Templates
- [ ] Deep link `/consultation/:visitId?tab=reportsAndDocuments`
- [ ] Outside linear SOAP Back/Next pipeline (optional access)

**Priority:** Must Have

### US-2: Laboratory and radiology sub-sections

**As a** doctor, **I want** to filter lab vs radiology **so that** I can scan results by type.

**Acceptance Criteria:**

- [ ] Sub-tabs or filters: Laboratory (n), Radiology (n)
- [ ] Only orders from **this encounter**

**Priority:** Must Have

### US-3: View and print released results

**As a** doctor, **I want** to view and print approved lab/radiology results **so that** I can act on them during the visit.

**Acceptance Criteria:**

- [ ] PDF: shared `report-documents` path + print helper
- [ ] Typed lab: `LabResultDrawer`
- [ ] Typed radiology: `RadiologyReportDrawer`
- [ ] Only **`released`** lines show View/Print

**Priority:** Must Have

### US-4: Pending and not-ready states

**As a** doctor, **I want** to see ordered tests that aren’t ready yet **so that** I know what’s still outstanding.

**Acceptance Criteria:**

- [ ] Not submitted → **“Not ready”**
- [ ] Pending approval → **“Awaiting approval”**
- [ ] Rejected (ops fixing) → not shown as result to doctor
- [ ] Pending lines **shown**, not hidden

**Priority:** Must Have

### US-5: Critical result badge

**As a** doctor, **I want** a CRITICAL badge on urgent lines **so that** I notice them in the tab.

**Acceptance Criteria:**

- [ ] Red CRITICAL badge when `isCritical` (reuse tracker styling)
- [ ] Shown even when awaiting approval

**Priority:** Must Have

### US-6: Signed encounter chart

**As a** doctor, **I want** the same report list on the signed encounter **so that** I can review results after sign.

**Acceptance Criteria:**

- [ ] `EncounterReadOnly` embeds same list component (read-only)
- [ ] Released results view/print work post-sign

**Priority:** Must Have

### US-7: Full order payload for encounter

**As a** developer, **I want** encounter order fetch to include approval and PDF fields **so that** the tab can classify lines correctly.

**Acceptance Criteria:**

- [ ] `listEncounterDiagnosticOrdersFull` or equivalent
- [ ] Items include `hasReportPdf`, `approvalStatus`, `approvedAt`, `isCritical`, etc.

**Priority:** Must Have

---

## 7. Scope

### In scope

- New tab + `EncounterDiagnosticReportsList` component
- Read-only embed on signed encounter
- Lab + radiology; PDF + typed; view + print
- Encounter-scoped orders only
- Consultation workspace only (v1)
- Integration with **approval workflow** (released-only display)
- CRITICAL badge on lines

### Out of scope

- Placing/editing orders from this tab (stays Plan tab)
- Lab/radiology tracker ops (separate PRD)
- IPD / other visit types
- Patient-wide results across encounters
- Non-clinical documents (tab name reserves space)
- Doctor acknowledgement of critical results
- Amendment history UI

---

## 8. Product decisions (resolved)

| # | Decision |
|---|----------|
| 1 | **This encounter’s orders only** |
| 2 | Tab **after Plan** |
| 3 | Show pending lines — **“Not ready”** / **“Awaiting approval”** |
| 4 | **CRITICAL** badge on line (no tab banner v1) |
| 5 | **Consultation only** — no IPD v1 |
| 6 | **Two-tier release** — doctor sees **approved/released** only; see [approval PRD](../diagnostic-results-approval-workflow/prd.md) |
| 7 | **Bedside POC** — immediate view (approval exempt) |

---

## 9. Edge cases

- Order placed on Plan, result approved after doctor signed — signed encounter chart still shows report when opened later.
- Mixed PDF + typed on same order — each line classified independently.
- Doctor role must GET report-documents (verify auth; widen if 403).
- Empty state: no lab/radiology orders on encounter.
- Realtime refresh optional (SSE invalidate on release event — polish slice).

---

## 10. Implementation slices (reference)

| Slice | Deliverable |
|-------|-------------|
| 1 | Tab shell + one released lab line → view + print |
| 2 | PDF + radiology + sub-tabs (requires approval workflow) |
| 3 | Signed `EncounterReadOnly` |
| 4 | Empty states, badge counts, polish |

Full detail: `specs/features/his-global-south/encounter-lab-radiology-reports.md`

---

## 11. Design references

- Implementation spec: `specs/features/his-global-south/encounter-lab-radiology-reports.md`
- Approval workflow: `specs/features/his-global-south/diagnostic-results-approval-workflow.md`
- No Figma yet.

---

<!-- Paste docs/templates/approval.md when ready for Gate G1 -->
