# PRD: Consultation — Past Visits (chart history in encounter)

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature key** | `consultation-past-visits-tab` |
| **Product** | flowMD |
| **Version** | **1.0** |
| **Date** | 2026-09-09 |
| **Status** | **Draft — parked** (pick up later; no implementation started) |
| **Related** | [Implementation plan](../../../specs/features/his-global-south/consultation-past-visits-tab.md) · [Encounter lab/radiology reports PRD](../encounter-lab-radiology-reports/prd.md) |
| **Depends on** | Existing visit list API (`getEncounters`), readonly encounter chart (`EncounterReadOnly`), `EncounterReportsAndDocumentsPanel` |
| **Blocks** | None |

---

## 1. Summary

Doctors need **prior visit context** (SOAP notes, prescriptions, lab/radiology results) **during an active consultation** without leaving the encounter or relying on front desk to open Patient Records.

**v1:** Add a **Past Visits** tab to the consultation workspace. List all visits for the patient; **View details** opens the **same readonly chart** already used at Patient Records → Visit History → View Details (`/encounters/:visitId`), preferably in a **drawer** so today’s consult stays open.

**Reuse-first:** No new backend module; compose existing frontdesk visit list + clinical readonly encounter + reports panel.

---

## 2. Background & problem

| Symptom | Root cause |
|---------|------------|
| Doctor cannot see what happened at last visit while consulting | No past-visit UI in consultation workspace |
| Visit History with full detail (incl. labs) exists but doctors don’t reach it | **Patient Records** is front-desk nav; OPD doctor sidebar is **Encounters only** |
| Subjective tab shows allergies/meds but not past SOAP or old lab PDFs | Longitudinal FHIR summary ≠ per-visit chart |
| Reports & Documents tab is current visit only | By design (ELR feature); past results live on readonly visit page |
| After signing, “View Patient Record” exists but mid-consult gap remains | Post-sign shortcut; not usable during active consult |

---

## 3. Goals & success metrics

| Goal | Metric | Target |
|------|--------|--------|
| Doctor browses prior visits from consult | Past Visits tab reachable without sidebar Patient Records | 100% manual QA (doctor role) |
| Past visit detail matches existing readonly chart | SOAP, dx, Rx, reports parity with `/encounters/:visitId` | 100% |
| Doctor stays in today’s consult | Close detail → same consult tab/state | 100% |
| No new backend for v1 | Reuse existing APIs only | Confirmed in tech review |
| Front desk Patient Detail unchanged | Visit History regression pass | 100% |

---

## 4. User personas

- **OPD doctor** — primary; needs prior visit notes and results mid-consult.
- **ED doctor** — same need for return/ED patients; same tab in consultation workspace.
- **Receptionist** — continues using Patient Records → Visit History (unchanged).

---

## 5. User workflows

### Workflow 1: Review last visit during consultation

**Trigger:** Return patient; doctor wants last visit SOAP and labs.  
**Persona:** OPD/ED doctor

1. Open consultation workspace for today’s visit.
2. Select **Past Visits** tab (non-linear tab, like Reports & Documents).
3. See table: date, visit number, type, status (newest first).
4. Click **View details** on a prior visit.
5. Drawer (or new tab fallback) shows readonly chart: vitals, SOAP, diagnoses, prescriptions, **Reports & Documents**, procedures, follow-up.
6. Close drawer; continue today’s consult.

### Workflow 2: Current visit visible in list

**Trigger:** Doctor opens Past Visits while still documenting today.  
**Persona:** Doctor

1. Today’s visit appears in list with **Current visit** badge.
2. View details may show draft/unsigned state (same rules as existing readonly page).

### Workflow 3: Front desk unchanged

**Trigger:** Receptionist opens patient chart.  
**Persona:** Receptionist

1. Patient Records → Visit History → View Details.
2. Behavior identical to today (no regression).

---

## 6. User stories

| ID | Story | Priority |
|----|-------|----------|
| PV-1 | As a doctor in consult, I want a list of all patient visits so I can pick a prior encounter to review. | Must |
| PV-2 | As a doctor, I want to open a past visit’s full note and results without leaving today’s encounter. | Must |
| PV-3 | As a doctor, I want past visit lab/radiology reports with the same view/print behavior as the readonly encounter page. | Must |
| PV-4 | As a doctor, I want today’s visit clearly marked in the list. | Should |
| PV-5 | As reception, I want Patient Records Visit History to work exactly as before. | Must |

---

## 7. Requirements

### Must (v1)

- New **Past Visits** tab in consultation workspace stage nav.
- Visit list for `patientId` using existing `getEncounters({ patientId })`.
- **View details** opens existing readonly encounter content (extract/reuse `EncounterReadOnly` body).
- Read-only in consult tab — no Start New Visit, no edit past notes.
- Reuse `EncounterReportsAndDocumentsPanel` for past visit labs/radiology.
- Deep link support: `/consultation/:visitId?tab=pastVisits` (optional but consistent with other tabs).

### Should (v1)

- Detail in **drawer/sheet** inside consult (fallback: new browser tab to `/encounters/:visitId`).
- Loading and empty states on visit list.
- Current visit badge on active row.

### Could (later)

- Filter list to signed/completed visits only.
- Registration screening section on past visit detail.
- Add Patient Records to doctor sidebar (separate product decision).
- Cross-visit lab trend view.

### Won’t (v1)

- New backend endpoints or migrations.
- Aggregated “all labs ever” dashboard.
- Edit historical encounters from Past Visits tab.
- IPD inpatient chart integration.

---

## 8. UX notes

- Tab placement: after **Care Templates** (or before — product can tweak); same jumpable tab pattern as Reports & Documents.
- Drawer should be scrollable; long SOAP + reports expected.
- Certificate creation: hide or disable in drawer variant; full page route retains today’s behavior.
- Naming: **Past Visits** (clinical) vs **Visit History** (admin chart) — same data, doctor-facing label in consult.

---

## 9. Technical approach (summary)

Full implementation plan: [specs/features/his-global-south/consultation-past-visits-tab.md](../../../specs/features/his-global-south/consultation-past-visits-tab.md)

| Phase | Deliverable |
|-------|-------------|
| Extract | `PatientVisitHistoryTable`, `EncounterChartPanel` shared components |
| Wire | `PastVisitsTab` + consult nav registration |
| Polish | Empty/loading, current visit badge, drawer UX |
| Test | Table + tab tests; Patient Detail + readonly route regression |

**Estimated effort:** ~1.5–2 days, one PR. **No backend slice.**

---

## 10. Open questions (resolve before implement)

| # | Question | Default if no answer |
|---|----------|----------------------|
| 1 | Drawer vs new tab for v1 detail? | Drawer preferred; new tab fallback |
| 2 | Show unsigned/draft visits in list? | Yes, with empty/draft detail state |
| 3 | Add Patient Records to doctor nav in addition to tab? | No — tab only for v1 |

---

## 11. Approval (G1 — product)

- [ ] Product — Past Visits tab + drawer UX approved
- [ ] Product — out of scope items accepted
- [ ] **Approved by:** _pending_
- [ ] **Date:** _pending_

**Parked:** Saved for later pickup. Do not implement until G1 approval and implementation spec Approval section are checked.
