# ELR-4 — Polish + realtime refresh

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `encounter-lab-radiology-reports` |
| **Slice** | 4 (ELR-4) |
| **Branch** | `feat/elr-4-reports-polish` |
| **Depends on** | ELR-2, DRA-4 (optional SSE) |
| **Status** | Implemented — awaiting PR |
| **Date** | 2026-09-05 |

---

## Goal

Production-ready UX — empty/loading states, consultation tab badge for viewable results, refresh when returning to the Reports tab.

---

## Delivered

### Query consolidation

| Item | Detail |
|------|--------|
| Query key | `['encounter-diagnostic-reports', encounterId]` |
| Fetch | `fetchEncounterDiagnosticReports` — parallel lab + radiology |
| `staleTime` | 30s |
| `refetchOnWindowFocus` | enabled |

### Tab badge (`ConsultationStageNav`)

- Pill on **Reports & Documents** showing count of **released viewable** lines only
- Driven by `countAvailableEncounterReportLines` + shared query cache

### Refresh triggers

| Trigger | Behavior |
|---------|----------|
| Switch to Reports tab | Invalidates + refetches via `isActive` prop |
| Window focus | react-query refetch (30s stale) |
| Manual | **Refresh** button in consultation tab header |
| `order.created` SSE | Invalidates encounter reports query for that encounter |

### Empty / loading UX

- Skeleton cards while loading (no flash of broken UI)
- Encounter-level empty: no orders placed on visit
- Sub-tab empty: modality-specific copy (no orders vs orders pending)

### Tests

- `countAvailableEncounterReportLines` unit test
- Existing encounter + classifier tests pass (35 total in related suites)

---

## Out of scope

- Doctor critical acknowledgement workflow
- Tab-level CRITICAL banner
- SSE on approve/release (no backend event yet — tab focus + refresh cover v1)

---

## Approval

- [x] Product — polish acceptable for v1 launch
- [x] Tech — AD-8; no new backend
- [x] **Approved by:** User (pipeline continuation)
- [x] **Date:** 2026-09-05
