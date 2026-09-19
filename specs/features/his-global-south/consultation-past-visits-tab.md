# Consultation — Past Visits tab (chart history in encounter)

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `consultation-past-visits-tab` |
| **Branch** | `feat/consultation-past-visits-tab` |
| **Depends on** | None (reuses existing visit list + readonly encounter APIs) |
| **Status** | **Parked** — PRD saved; pick up later |
| **Date** | 2026-09-09 |
| **PRD** | [prd/his-global-south/consultation-past-visits-tab/prd.md](../../../prd/his-global-south/consultation-past-visits-tab/prd.md) |

---

## 1. Problem

OPD/ED doctors work almost entirely from **Encounters** → **Consultation workspace**. They can see **longitudinal** data in consult (Subjective → Patient Health History, Known conditions banner) and **this visit’s** labs under **Reports & Documents**, but they **cannot** browse **prior visits** (SOAP, prescriptions, lab/radiology from past encounters) without leaving the workflow.

That history **already exists** on **Patient Records → Visit History → View Details** (`/encounters/:visitId`), but:

- **Patient Records** is front-desk nav, not doctor nav (`staticRoleAccess.ts` → `opdDoctorOnly` shows Encounters only).
- There is no in-consult path to the same data doctors remember from Visit History.

---

## 2. Solution (v1)

Add a **Past Visits** tab to the consultation workspace (same pattern as **Reports & Documents** and **Care Templates** — non-linear, jumpable tab).

| Step | UX |
|------|-----|
| 1 | Doctor opens **Past Visits** tab during an active consult |
| 2 | Table lists all visits for `encounter.patientId` (reuse `getEncounters({ patientId })`) |
| 3 | **View details** opens the **existing** readonly visit chart in a **sheet/drawer** (preferred v1) or new browser tab (fallback if drawer refactor is too large) |
| 4 | Detail shows the same content as `EncounterReadOnly` today: SOAP, diagnoses, prescriptions, **Reports & Documents**, procedures, follow-up |

**No new backend endpoints or tables in v1.** Compose existing APIs and UI building blocks.

---

## 3. User story

**As an** OPD/ED doctor in an active consultation,  
**I want** to see my patient’s prior visits and open a past visit’s note and results,  
**So that** I can make clinical decisions without asking front desk or losing my place in today’s encounter.

---

## 4. Architecture & reuse map

```text
ConsultationWorkspace
  └── PastVisitsTab (new)
        ├── PatientVisitHistoryTable (extract from PatientDetail visits tab)
        └── Visit detail
              ├── v1a (preferred): EncounterChartPanel (extract body from EncounterReadOnly)
              │     variant="drawer" | "embedded"
              └── v1b (fallback): window.open(`/encounters/${visitId}`) + consult stays open

Existing reuse (no duplication of lab/report logic):
  getEncounters({ patientId })              — PatientDetail already uses this
  getClinicalEncounterByVisit(visitId)      — EncounterReadOnly
  EncounterReportsAndDocumentsPanel         — already shared (consult + readonly page)
  prescriptionsService.listByEncounter      — EncounterReadOnly
  getProcedures / getFollowUp               — EncounterReadOnly
```

### Tab registration

Extend `CONSULTATION_STAGES` in `consultationWorkspace/types.ts`:

```text
… plan → reportsAndDocuments → careTemplates → pastVisits
```

Add `TabsTrigger` in `ConsultationStageNav.tsx` with `pointer-events-auto` (same as Reports / Care Templates).

Optional deep link helper:

```text
consultationPastVisitsPath(visitId) → /consultation/:visitId?tab=pastVisits
```

---

## 5. Implementation phases

### Phase A — Extract shared components (foundation)

| Task | Detail |
|------|--------|
| A1 | Extract **`PatientVisitHistoryTable`** from `PatientDetail.tsx` visits `TabsContent` |
| A2 | Props: `patientId`, `currentVisitId?`, `onViewVisit(visitId)`, `showStartVisitButton?: boolean` (default false) |
| A3 | Wire `PatientDetail` to use extracted table with `showStartVisitButton={true}` — **zero behavior change** on front desk |
| A4 | Extract **`EncounterChartPanel`** from `EncounterReadOnly.tsx` page body (everything below header/back except full-page chrome) |
| A5 | Props: `visitId`, `variant: 'page' \| 'drawer'`, `onClose?`, `hideBackToChartLink?: boolean` when embedded |
| A6 | `EncounterReadOnly` becomes thin wrapper: load by route param → render `EncounterChartPanel variant="page"` |

**Rule:** Extract first, then wire consult — avoids copy-paste drift between Patient Detail and consult.

### Phase B — Consult tab (core)

| Task | Detail |
|------|--------|
| B1 | Add `PastVisitsTab.tsx` under `consultationWorkspace/components/tabs/` |
| B2 | Query: `['patient-visits', patientId]` → `getEncounters({ patientId })` |
| B3 | Render `PatientVisitHistoryTable` with `currentVisitId={visitId}` |
| B4 | Row action **View details** → open `Sheet`/`Drawer` with `EncounterChartPanel visitId={selected}` |
| B5 | Register tab in `index.tsx`, `ConsultationStageNav`, `CONSULTATION_STAGES` |
| B6 | Mark current visit in table: badge **Current visit**; do not block opening it (doctor may want today’s signed partial view) |

### Phase C — UX polish

| Task | Detail |
|------|--------|
| C1 | Empty state: “No prior visits recorded” |
| C2 | Loading skeleton on table |
| C3 | Drawer: scrollable, max height, **Close** returns to list without leaving consult |
| C4 | Sort visits **newest first** (match Patient Detail) |
| C5 | Optional: hide visits with no clinical encounter from detail (show row but detail empty state — same copy as EncounterReadOnly today) |

### Phase D — Tests & validation

| Layer | What |
|-------|------|
| Unit | `PatientVisitHistoryTable` — renders rows, calls `onViewVisit`, marks current visit |
| Component | `PastVisitsTab` — mock `getEncounters`, drawer opens on click |
| Regression | `EncounterReadOnly` tests still pass via thin wrapper |
| Manual QA | Doctor role: Encounters → consult → Past Visits → open old visit → see SOAP + lab reports |

**Commands (match CI before PR):**

```bash
cd projects/his-global-south && npm run lint && npx tsc -b
cd projects/his-global-south && npm test -- --run PatientVisitHistory PastVisits EncounterReadOnly
```

---

## 6. Rules & conventions to follow

Sourced from hub `AGENTS.md`, workspace HIS PR lessons, and `docs/conventions/` (run **`convention-loader`** before implement with the file list below).

### Module & file structure

| Rule | Application |
|------|-------------|
| Implementation lives under `projects/his-global-south/src/` | New tab under `pages/consultationWorkspace/components/tabs/` |
| Shared clinical UI under `src/components/consultation/` | `PatientVisitHistoryTable`, `EncounterChartPanel` |
| Do **not** create a portable root split | One folder per concern, no duplicate module roots |
| Service calls via `@/modules/clinical` barrel where already exported | `getEncounters`, `getClinicalEncounterByVisit` |

### Frontend patterns (match Care Templates / Reports tabs)

| Rule | Application |
|------|-------------|
| Non-linear tabs use `pointer-events-auto` on `TabsTrigger` | Past Visits same as Reports & Care Templates |
| `?tab=pastVisits` honored on workspace load | Extend existing `requestedTab` logic in `index.tsx` |
| Reuse `EncounterReportsAndDocumentsPanel` | Do not fork lab/radiology list UI |
| Minimize scope | No Patient Records nav change for doctors in v1 unless product asks |

### API & data

| Rule | Application |
|------|-------------|
| **No new backend routes in v1** | Org-auth endpoints already used by Patient Detail |
| Query keys include scoping ids | `['patient-visits', patientId]` |
| Visit ID vs clinical encounter ID | URL/list uses **frontdesk visit id**; panel resolves clinical encounter via `getClinicalEncounterByVisit` (same as readonly page) |

### RBAC (product, not security hole)

| Rule | Application |
|------|-------------|
| Doctors intentionally gain **read** access to chart history via consult tab | Aligns with clinical need; APIs already org-scoped |
| Do not add **write** actions on past visits from this tab | Read-only; no edit registration, no Start New Visit in consult tab |
| Certificate creation stays on readonly **page** variant only | Drawer variant: hide **New certificate** or disable with tooltip “Open full visit view” |

### Testing

| Rule | Application |
|------|-------------|
| Meaningful tests only | Table + tab interaction; not trivial “renders without crash” only |
| Barrel import tests: 60s timeout if importing full `@/modules/*` registries | If adding exports, follow existing test patterns |

### PR hygiene

| Rule | Application |
|------|-------------|
| `npm run lint` + `npx tsc -b` before PR | Frontend |
| Self-review via `pre-review` skill | Before opening PR |
| One PR, one feature | This slice only; no unrelated consult fixes |

---

## 7. UX decisions (locked for v1)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Detail presentation | **Drawer/sheet** inside consult | Doctor stays in workflow |
| Fallback | New tab to `/encounters/:visitId` | If drawer extract slips schedule |
| Current visit in list | Show with **Current visit** badge | Transparency; detail may be draft |
| Start New Visit button | **Not** in consult tab | Front-desk action; avoid duplicate check-in |
| Patient Records nav for doctors | **Out of scope v1** | Consult tab is the doctor-facing entry |
| Aggregated “all labs ever” view | **Out of scope** | Per-visit detail is enough; reuse readonly panel |
| Registration screening on past visits | **Out of scope** | Optional v2: registration phase in detail drawer |

---

## 8. Files to create / modify

### New

| Path |
|------|
| `src/components/consultation/PatientVisitHistoryTable.tsx` |
| `src/components/consultation/EncounterChartPanel.tsx` |
| `src/pages/consultationWorkspace/components/tabs/PastVisitsTab.tsx` |
| `src/components/consultation/__tests__/PatientVisitHistoryTable.test.tsx` |
| `src/pages/consultationWorkspace/components/tabs/__tests__/PastVisitsTab.test.tsx` (optional if table tests suffice) |

### Modify

| Path | Change |
|------|--------|
| `src/pages/patients/PatientDetail.tsx` | Use `PatientVisitHistoryTable` |
| `src/pages/encounters/EncounterReadOnly.tsx` | Thin wrapper around `EncounterChartPanel` |
| `src/pages/consultationWorkspace/types.ts` | Add `pastVisits` stage + path helper |
| `src/pages/consultationWorkspace/components/ConsultationStageNav.tsx` | Tab trigger |
| `src/pages/consultationWorkspace/index.tsx` | Render `PastVisitsTab`, pass `patientId` + `visitId` |

### No change (v1)

- Backend routes / migrations
- `staticRoleAccess.ts` (unless product wants Patient Records link later)

---

## 9. Acceptance criteria

- [ ] OPD doctor with **Encounters-only** nav can open **Past Visits** from consultation workspace.
- [ ] Table shows all visits for the patient (same data source as Patient Detail → Visit History).
- [ ] Current visit is visually distinguished.
- [ ] **View details** shows SOAP, diagnoses, prescriptions, and **Reports & Documents** for the selected visit (parity with `/encounters/:visitId`).
- [ ] Doctor can close detail and return to active consult without losing tab/state.
- [ ] Patient Detail Visit History behavior unchanged for receptionist (regression).
- [ ] `EncounterReadOnly` direct URL still works for front desk / deep links.
- [ ] Lint + `tsc -b` pass; new/updated tests pass.

---

## 10. Out of scope (v1)

- New backend endpoints or visit-summary aggregation API
- Editing past notes from Past Visits tab
- SSE/live refresh of past visit list mid-consult
- IPD admission chart integration
- Adding **Patient Records** to doctor sidebar (separate product decision)
- Cross-visit lab trend graphs

---

## 11. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Large drawer content (long SOAP + reports) | Scrollable drawer; reuse readonly layout sections |
| Duplicate UI drift Patient Detail vs consult | Single `PatientVisitHistoryTable` + `EncounterChartPanel` |
| Doctor opens current visit draft | Same empty/draft states as EncounterReadOnly; badge sets expectation |
| Extract refactor breaks readonly page | Keep route wrapper; run existing EncounterReadOnly tests |

---

## 12. Effort estimate

| Phase | Size |
|-------|------|
| A — Extract shared components | ~0.5–1 day |
| B — Consult tab + drawer | ~0.5 day |
| C — Polish | ~0.25 day |
| D — Tests + QA | ~0.25 day |
| **Total** | **~1.5–2 days** one PR |

---

## Approval

- [ ] Product — Past Visits tab + drawer UX acceptable; no doctor Patient Records nav in v1
- [ ] Tech — reuse-only, no backend slice
- [ ] **Approved by:** _pending_
- [ ] **Date:** _pending_

**Do not implement until Approval section is checked.**
