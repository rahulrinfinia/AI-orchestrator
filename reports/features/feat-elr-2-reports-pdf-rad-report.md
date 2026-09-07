# Report — ELR-2 PDF + radiology + sub-tabs

| Field | Value |
|-------|--------|
| **Project** | his-global-south |
| **Branch** | `feat/elr-2-reports-pdf-rad` |
| **Spec** | `specs/features/his-global-south/encounter-lab-radiology-reports-slice-2.md` |
| **Date** | 2026-09-05 |

---

## Summary

Extended the encounter **Reports & Documents** tab with Laboratory/Radiology sub-tabs, full approval-aware classifier, PDF view/print (lab + radiology), radiology drawer, and CRITICAL badges on pending lines.

---

## Changes

- Sub-tabs with line counts; parallel lab/radiology fetch
- Classifier covers PDF, typed lab, verified radiology, rejected hidden, pending labels
- View/Print actions reuse `LabResultDrawer`, `RadiologyReportDrawer`, existing print helpers
- `getEncounterRadiologyOrders` API client helper

---

## Tests

- `encounterReportAvailability.test.ts` — **13 passed**

---

## Follow-ups

- ELR-3: signed encounter read-only embed
- Manual QA: ops submit → approve → doctor View/Print in tab
