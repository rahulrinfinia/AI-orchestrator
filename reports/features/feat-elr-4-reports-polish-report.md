# Report — ELR-4 polish + realtime refresh

| Field | Value |
|-------|--------|
| **Project** | his-global-south |
| **Branch** | `feat/elr-4-reports-polish` |
| **Spec** | `specs/features/his-global-south/encounter-lab-radiology-reports-slice-4.md` |
| **Date** | 2026-09-05 |

---

## Summary

Final polish for encounter Reports & Documents: unified react-query cache, tab badge for viewable results, skeleton loading, clearer empty states, refresh on tab focus/window focus/manual button, and SSE invalidation on new orders.

---

## Changes

- `ENCOUNTER_DIAGNOSTIC_REPORTS_QUERY_KEY` + 30s staleTime
- Consultation nav badge (available count only)
- Refresh button + tab-focus invalidation
- `useRealtimeSync` invalidates reports on `order.created`

---

## Tests

- **14** classifier/count tests; **21** EncounterReadOnly tests passing

---

## Feature complete

All four ELR slices implemented (ELR-1 → ELR-4). Ready for stacked PR review against DRA approval workflow branches.
