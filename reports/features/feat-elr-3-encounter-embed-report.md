# Report — ELR-3 signed encounter embed

| Field | Value |
|-------|--------|
| **Project** | his-global-south |
| **Branch** | `feat/elr-3-encounter-embed` |
| **Spec** | `specs/features/his-global-south/encounter-lab-radiology-reports-slice-3.md` |
| **Date** | 2026-09-05 |

---

## Summary

Embedded the shared **Reports & Documents** panel on the signed encounter chart (`EncounterReadOnly`). Doctors can view/print released lab and radiology results after sign without returning to the consultation workspace.

---

## Changes

- New `EncounterReportsAndDocumentsPanel` — shared by consultation tab and signed chart
- Replaced badge-only lab/radiology order cards with full interactive list
- Same classifier, sub-tabs, drawers, and print actions as ELR-2

---

## Tests

- `EncounterReadOnly.test.tsx` — **21 passed** (includes new Reports & Documents case)

---

## Follow-ups

- ELR-4: tab badge count, SSE refresh on approval
