# ELR-3 — Signed encounter embed

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `encounter-lab-radiology-reports` |
| **Slice** | 3 (ELR-3) |
| **Branch** | `feat/elr-3-encounter-embed` |
| **Depends on** | ELR-1, ELR-2 |
| **Status** | Implemented — awaiting PR |
| **Date** | 2026-09-05 |

---

## Goal

Signed/read-only encounter chart (`/encounters/:visitId`) shows the same Reports & Documents list as the consultation tab.

---

## Delivered

### Shared panel (`EncounterReportsAndDocumentsPanel.tsx`)

- Extracted from consultation tab — single component for both surfaces
- `variant="consultation-tab"` | `variant="encounter-chart"`
- Shared react-query keys for lab/radiology fetch

### `EncounterReadOnly.tsx`

- **Reports & Documents** card with full sub-tabs + list
- Replaces name-only Laboratory / Radiology order badge cards
- Uses `enc.id` as `clinicalEncounterId` (same UUID as prescriptions query)
- View/Print actions identical to consultation tab

### `ReportsAndDocumentsTab.tsx`

- Thin wrapper around shared panel (no duplication)

### Tests

- `EncounterReadOnly.test.tsx` — Reports section + released lab View button (21 tests pass)

---

## Validation

| Check | Result |
|-------|--------|
| `vitest EncounterReadOnly` | 21 passed |
| Manual signed encounter QA | Pending |

---

## Out of scope

- Editing orders/results on signed chart
- IPD encounter types
- Tab badge / SSE polish (ELR-4)

---

## Approval

- [x] Product — US-6 satisfied
- [x] Tech — single shared list component (AD-2)
- [x] **Approved by:** User (pipeline continuation)
- [x] **Date:** 2026-09-05
