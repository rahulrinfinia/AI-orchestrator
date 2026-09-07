# ELR-1 — Tab shell + released lab tracer

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `encounter-lab-radiology-reports` |
| **Slice** | 1 (ELR-1) |
| **Branch** | `feat/elr-1-reports-tab` |
| **Depends on** | DRA-2 approval fields on list API |
| **Status** | Implemented — awaiting PR |
| **Date** | 2026-09-05 |

---

## Goal

Doctor opens **Reports & Documents** in consultation workspace and views/prints one released typed lab result (tracer bullet).

---

## Delivered

### Stage wiring

| File | Change |
|------|--------|
| `types.ts` | `reportsAndDocuments` stage + `consultationReportsAndDocumentsPath` |
| `ConsultationStageNav.tsx` | Clickable tab between Plan and Care Templates |
| `index.tsx` | Mount `ReportsAndDocumentsTab` |

### New components / services

| File | Role |
|------|------|
| `ReportsAndDocumentsTab.tsx` | Tab shell + react-query fetch |
| `EncounterDiagnosticReportsList.tsx` | Lab line list, status labels, View → `LabResultDrawer` |
| `encounterReports.service.ts` | `listEncounterLabReports` wrapper |
| `encounterReportAvailability.ts` | Classifier (released / pending / not ready / hide rejected) |
| `ordersWorkspace.service.ts` | `getEncounterLabOrders` — full payload via encounterId |

### Tests

| File | Coverage |
|------|----------|
| `encounterReportAvailability.test.ts` | 7 classifier cases |

---

## Validation

| Check | Result |
|-------|--------|
| `vitest encounterReportAvailability` | 7 passed |
| Manual E2E | Pending local QA |

---

## Out of scope (later slices)

- Radiology sub-tab + drawer (ELR-2)
- PDF view/print (ELR-2)
- `EncounterReadOnly` embed (ELR-3)
- Tab badge / empty-state polish (ELR-4)

---

## Approval

- [x] Product — US-1 + partial US-3 (lab typed)
- [x] Tech — reuse existing APIs, no backend changes
- [x] **Approved by:** User (pipeline continuation)
- [x] **Date:** 2026-09-05
