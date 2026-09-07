# ELR-1 — Tab shell + released lab tracer

| Field | Value |
|-------|--------|
| **Feature** | `encounter-lab-radiology-reports` |
| **Slice** | 1 |
| **Depends on** | [DRA-2](../diagnostic-results-approval-workflow/slices/slice-2.md) (approval fields on list API) OR dev seed with `approval_status = released` |
| **Technical design** | [../technical-design.md](../technical-design.md) AD-1–AD-4, AD-7 |
| **Goal** | Doctor can open Reports & Documents and view/print one released lab result |

---

## Purpose

Tracer bullet for encounter feature — minimal vertical slice: stage wiring, fetch service, list component, one happy path (released typed lab → drawer → print). No radiology/PDF/sub-tabs yet.

---

## User stories addressed

| Story | Coverage |
|-------|----------|
| US-1 Reports & Documents tab | Full — stage, nav, deep link |
| US-3 View and print released | Partial — lab typed only |
| US-7 Full order payload | Partial — fields needed for lab classifier |

---

## Scope

### Frontend — new files

- `src/services/encounterReports.service.ts` — `listEncounterDiagnosticReports(encounterId)`
- `src/clinical/constants/encounterReportAvailability.ts` — classifier (lab paths first)
- `src/components/consultation/EncounterDiagnosticReportsList.tsx` — basic list
- `src/pages/consultationWorkspace/components/tabs/ReportsAndDocumentsTab.tsx` — shell (single list, no sub-tabs yet)

### Frontend — wiring

- `consultationWorkspace/types.ts` — add `reportsAndDocuments` to `CONSULTATION_STAGES` after `plan`
- `ConsultationStageNav.tsx` — TabsTrigger “Reports & Documents”
- `index.tsx` — TabsContent when `clinicalEncounterId` present
- `consultationReportsPath(visitId)` helper

### Reuse

- `LabResultDrawer` — View report action
- `getLabOrderResult` — fetch drawer payload
- Print from drawer or existing helper

### Classifier (v1 subset)

- `released` or `approval_exempt` + lab typed content → `available`
- Other states → show row with “Not ready” or “Awaiting approval” (no View button)
- Filter rejected lines out

### Tests

- Unit: `classifyEncounterReportLine` — released, pending, exempt
- Component: available line shows View; pending hides View
- Manual: open tab → released lab → print

### Pre-flight

- Verify doctor role can `GET orders?encounterId=` and report-documents for released item (widen auth if 403)

---

## Out of scope

- Radiology sub-tab and drawer (ELR-2)
- PDF view (ELR-2)
- CRITICAL badge styling (ELR-2)
- `EncounterReadOnly` embed (ELR-3)
- Empty state polish, tab badge (ELR-4)
- Backend changes (none expected)

---

## Acceptance criteria (slice)

- [ ] Tab visible after Plan in consultation workspace
- [ ] Deep link `?tab=reportsAndDocuments` works
- [ ] List shows encounter lab lines with status labels
- [ ] Released lab line: View opens `LabResultDrawer`; Print works
- [ ] Pending line: no View/Print
- [ ] Tab does not block consultation sign/finalize
- [ ] Unit tests for classifier pass

---

## Modules / files (reference)

| Area | Path |
|------|------|
| Stages | `types.ts`, `ConsultationStageNav.tsx`, `index.tsx` |
| Tab | `ReportsAndDocumentsTab.tsx` |
| List | `EncounterDiagnosticReportsList.tsx` |
| Service | `encounterReports.service.ts` |
| Classifier | `encounterReportAvailability.ts` |
| Mappers | extend `ordersWorkspace.service.ts` patterns |

---

## Approval

- [ ] Product — US-1 + partial US-3 satisfied
- [ ] Tech — AD-1, AD-3, AD-4, AD-7; no new backend routes
- [ ] **Approved by:** ___
- [ ] **Date:** YYYY-MM-DD

**Agent rule:** Do not implement until all boxes are checked.
