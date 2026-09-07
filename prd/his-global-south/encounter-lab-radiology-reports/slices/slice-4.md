# ELR-4 — Polish + realtime refresh

| Field | Value |
|-------|--------|
| **Feature** | `encounter-lab-radiology-reports` |
| **Slice** | 4 |
| **Depends on** | [ELR-2](./slice-2.md); optional [DRA-4](../diagnostic-results-approval-workflow/slices/slice-4.md) for SSE |
| **Technical design** | [../technical-design.md](../technical-design.md) AD-8 |
| **Goal** | Production-ready UX — empty states, loading, tab badge, refresh after approve |

---

## Purpose

Polish slice — no new user stories, improves discoverability and freshness when results release during an open consultation.

---

## User stories addressed

Enhances US-1 (tab badge) and general UX; no new PRD stories.

---

## Scope

### Empty / loading states

- No lab/radiology orders on encounter
- Orders exist but none in selected sub-tab
- Skeleton or spinner during fetch

### Tab badge

- Consultation nav badge: count of `available` lines (optional: include pending with critical only — product default: **available count only**)

### Realtime refresh

- react-query key `['encounter-diagnostic-reports', encounterId]`
- Refetch on tab focus; `staleTime: 30s`
- If DRA-4 merged: invalidate on `diagnostic_result.approval_pending` (optional — mainly helps approver; doctor refresh on focus is v1 minimum)
- Consider invalidate on window focus / manual refresh button if SSE insufficient

### Tests

- Component: empty states render
- Manual: approve while doctor on another tab → return to Reports → list updated

---

## Out of scope

- Doctor critical acknowledgement workflow
- Tab-level CRITICAL banner (product decision: line badge only v1)
- SMS notifications

---

## Acceptance criteria (slice)

- [ ] Meaningful empty states for no orders and empty sub-tab
- [ ] Loading state does not flash broken UI
- [ ] Tab badge shows count of viewable (released) lines when > 0
- [ ] List refreshes when returning to tab after approver release (manual QA)
- [ ] Frontend lint + tests pass

---

## Modules / files (reference)

| Area | Path |
|------|------|
| Tab / nav | `ConsultationStageNav.tsx`, `ReportsAndDocumentsTab.tsx` |
| List | `EncounterDiagnosticReportsList.tsx` |
| Realtime | `useRealtimeSync.ts` (optional hook) |

---

## Approval

- [ ] Product — polish acceptable for v1 launch
- [ ] Tech — AD-8; no new backend
- [ ] **Approved by:** ___
- [ ] **Date:** YYYY-MM-DD

**Agent rule:** Do not implement until all boxes are checked.
