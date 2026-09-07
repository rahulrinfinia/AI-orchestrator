# ELR-2 — PDF + radiology + sub-tabs

| Field | Value |
|-------|--------|
| **Feature** | `encounter-lab-radiology-reports` |
| **Slice** | 2 |
| **Depends on** | [ELR-1](./slice-1.md), [DRA-3](../diagnostic-results-approval-workflow/slices/slice-3.md) for full E2E |
| **Technical design** | [../technical-design.md](../technical-design.md) AD-2, AD-3, AD-5, AD-6 |
| **Goal** | Complete doctor-facing report types and modality filter; all PRD Must-Have states |

---

## Purpose

Extend list to laboratory / radiology sub-tabs, PDF viewing, radiology drawer, CRITICAL badge, and full approval-state classifier. Manual E2E: ops submit → approver approve → doctor sees View in tab.

---

## User stories addressed

| Story | Coverage |
|-------|----------|
| US-2 Lab / radiology sub-sections | Full |
| US-3 View and print released | Full — PDF, lab, radiology |
| US-4 Pending and not-ready states | Full |
| US-5 Critical badge | Full |
| US-7 Full order payload | Full |

---

## Scope

### `ReportsAndDocumentsTab.tsx`

- Sub-tabs: **Laboratory (n)** / **Radiology (n)**
- Pass `modality` filter to list

### `EncounterDiagnosticReportsList.tsx`

- Per line: accession, priority, status label, CRITICAL badge when `isCritical`
- Actions: View report, Print — only when `available`
- Empty state per sub-tab (basic)

### Classifier extensions

- PDF: `hasReportPdf` + released → available
- Radiology typed: `RadiologyReportDrawer` when released
- Bedside `approval_exempt` → available immediately
- Rejected → omit row (AD-5)

### PDF view

- Reuse `SendOutReportDialog` read-only OR extract `ReportPdfPanel` if tracker-specific chrome blocks UX
- `listLabOrderReportDocuments(itemId)` — handle 403 toast

### Drawers

- `RadiologyReportDrawer` + `getRadiologyReport`
- Keep `LabResultDrawer` from ELR-1

### Tests

- Unit: classifier — PDF, radiology, rejected filter, critical flag
- Component: CRITICAL badge when awaiting approval
- Integration/manual: pending → 403 on PDF; after approve → view

---

## Out of scope

- Signed encounter embed (ELR-3)
- Tab badge count, SSE refresh (ELR-4)
- IPD

---

## Acceptance criteria (slice)

- [ ] Laboratory and Radiology sub-tabs with correct counts
- [ ] Released PDF: view + print (same UX both modalities)
- [ ] Released radiology typed: `RadiologyReportDrawer`
- [ ] Not ready / Awaiting approval labels correct; rejected hidden
- [ ] CRITICAL badge on line when `isCritical` (including pending)
- [ ] Manual E2E: Plan order → ops submit → approve → doctor View in tab

---

## Modules / files (reference)

| Area | Path |
|------|------|
| Tab | `ReportsAndDocumentsTab.tsx` |
| List | `EncounterDiagnosticReportsList.tsx` |
| Classifier | `encounterReportAvailability.ts` |
| Reuse | `RadiologyReportDrawer`, `SendOutReportDialog`, `printPdfFromUrl` |

---

## Approval

- [ ] Product — US-2–US-5 satisfied
- [ ] Tech — AD-2, AD-3, AD-5, AD-6; released-only view enforced
- [ ] **Approved by:** ___
- [ ] **Date:** YYYY-MM-DD

**Agent rule:** Do not implement until all boxes are checked.
