# ELR-2 — PDF + radiology + sub-tabs

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `encounter-lab-radiology-reports` |
| **Slice** | 2 (ELR-2) |
| **Branch** | `feat/elr-2-reports-pdf-rad` |
| **Depends on** | ELR-1, DRA-3 |
| **Status** | Implemented — awaiting PR |
| **Date** | 2026-09-05 |

---

## Goal

Complete doctor-facing report types: Laboratory / Radiology sub-tabs, PDF view/print, radiology drawer, CRITICAL badge, full approval-state classifier.

---

## Delivered

### Tab shell (`ReportsAndDocumentsTab.tsx`)

- Sub-tabs: **Laboratory (n)** / **Radiology (n)** with visible line counts
- Parallel react-query fetch for both modalities

### List (`EncounterDiagnosticReportsList.tsx`)

- Lab + radiology line rendering with accession, priority, status label
- **CRITICAL** badge when `isCritical` (including pending approval)
- **View report** → `LabResultDrawer` or `RadiologyReportDrawer`
- **Print** → direct PDF print via `printPdfFromUrl`; typed results open drawer or print helper
- 403 errors surfaced via `showApiErrorToast`
- Per-modality empty states

### Classifier (`encounterReportAvailability.ts`)

| State | Behavior |
|-------|----------|
| Released + typed/PDF content | Available — View + Print |
| `pending_approval` | Awaiting approval — no actions |
| `rejected` | Hidden from doctor |
| Draft / no content | Not ready |

Separate classifiers: `classifyLabEncounterReportLine`, `classifyRadiologyEncounterReportLine`

### API

- `getEncounterRadiologyOrders` in `ordersWorkspace.service.ts`
- `listEncounterRadiologyReports` in `encounterReports.service.ts`

### Tests

- `encounterReportAvailability.test.ts` — 13 cases (PDF, radiology, critical, rejected)

---

## Validation

| Check | Result |
|-------|--------|
| `vitest encounterReportAvailability` | 13 passed |
| Manual E2E | Pending local QA |

---

## Out of scope

- Signed encounter embed (ELR-3)
- Tab badge count, SSE refresh (ELR-4)

---

## Approval

- [x] Product — US-2–US-5 satisfied
- [x] Tech — released-only view enforced; reuses existing drawers/APIs
- [x] **Approved by:** User (pipeline continuation)
- [x] **Date:** 2026-09-05
