# ELR-3 — Signed encounter embed

| Field | Value |
|-------|--------|
| **Feature** | `encounter-lab-radiology-reports` |
| **Slice** | 3 |
| **Depends on** | [ELR-1](./slice-1.md) (shared list component); ELR-2 recommended for full modality parity |
| **Technical design** | [../technical-design.md](../technical-design.md) §3.5, AD-2 |
| **Goal** | Signed/read-only encounter chart shows same Reports & Documents list |

---

## Purpose

Embed `EncounterDiagnosticReportsList` on `EncounterReadOnly` so doctors review released results after sign without returning to consultation workspace.

---

## User stories addressed

| Story | Coverage |
|-------|----------|
| US-6 Signed encounter chart | Full |

Reuses US-2–US-5 behaviour from ELR-2 when that slice is merged first.

---

## Scope

### `EncounterReadOnly.tsx`

- Add section **“Reports & Documents”** below diagnostic order badges (or replace name-only badges for results)
- Pass `clinicalEncounterId` + `variant="encounter-chart"`
- Same view/print actions for released lines

### Verify

- `clinicalEncounterId` available on encounter detail payload
- Post-sign visit: released results still load via orders API

### Tests

- Component: embed renders list with read-only variant
- Manual: signed encounter → view released lab/radiology

---

## Out of scope

- Editing orders or results on signed chart
- IPD encounter types
- Polish (ELR-4)

---

## Acceptance criteria (slice)

- [ ] `/encounters/:visitId` shows Reports & Documents section
- [ ] Same classifier and actions as consultation tab
- [ ] Released results view/print work on signed encounter
- [ ] No regression to existing encounter summary sections

---

## Modules / files (reference)

| Area | Path |
|------|------|
| Chart | `pages/encounters/EncounterReadOnly.tsx` |
| Reuse | `EncounterDiagnosticReportsList.tsx` |

---

## Approval

- [ ] Product — US-6 satisfied
- [ ] Tech — single shared list component (AD-2)
- [ ] **Approved by:** ___
- [ ] **Date:** YYYY-MM-DD

**Agent rule:** Do not implement until all boxes are checked.
