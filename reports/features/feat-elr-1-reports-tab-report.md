# Report — ELR-1 Reports tab + released lab tracer

| Field | Value |
|-------|--------|
| **Project** | his-global-south |
| **Branch** | `feat/elr-1-reports-tab` |
| **Spec** | `specs/features/his-global-south/encounter-lab-radiology-reports-slice-1.md` |
| **Date** | 2026-09-05 |

---

## Summary

Added **Reports & Documents** consultation tab (after Plan). Doctors see lab order lines for the current encounter with release-aware status labels; released typed results open `LabResultDrawer` for view/print.

---

## Changes

- New consultation stage `reportsAndDocuments` with deep link `?tab=reportsAndDocuments`
- Full-order fetch via `GET /api/clinical/orders?encounterId=&orderType=laboratory`
- Classifier respects two-tier approval (`released` / `pending_approval` / rejected hidden)

---

## Tests

- `encounterReportAvailability.test.ts` — 7 passed

---

## Follow-ups

- ELR-2: radiology + PDF view
- ELR-3: signed encounter read-only section
- Open PR stacked on DRA-4 (or rebase once approval slices merge)
