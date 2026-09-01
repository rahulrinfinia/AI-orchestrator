# Slice ET-2 — ER nurse list + ED doctor list

| Field | Value |
|-------|--------|
| **ID** | ET-2 |
| **Depends on** | ET-1 |
| **Technical design refs** | §7 (corrected), §9 (corrected) |
| **Tracer** | Sign in as `ed_nurse` → **Encounter** sidebar (existing item, no new menu) → "ER — Pending Triage" tab shows pending emergency encounters, sorted by priority then arrival time |

## Purpose

PRD §7's entry point: "ED nurse starts triage from the Encounter list, not a new menu" (AC-2), plus the doctor's triaged queue (AC-10).

**Revised 2026-08-26 — corrects a wrong assumption in the original technical design.** The real "Encounter list" is the front-desk queue page (`src/pages/encounters/index.tsx`), backed by `GET /api/frontdesk/visits` (`listVisits()` in `visits.service.ts`), **not** `/api/clinical/encounters`. That page fetches the whole day's visits once and buckets them entirely client-side into tabs (`waiting`/`intake`/`withProvider`/`done`) — it does no server-side status/type query filtering today. This slice follows that exact existing pattern rather than inventing a new server-filtered endpoint.

## In scope

- Extend `listVisits()`'s existing `active_enc` LATERAL join (`visits.service.ts`, ~line 478) to also select the ET-1 triage columns: `triage_status`, `triage_priority`, `current_step`, `arrived_at`, `triage_disposition`, `resuscitation_required`. Alias them plainly (no name collision with `visits`/`intake` columns) so they flow through `shapeVisitListRow()`'s `...rest` spread automatically — same mechanism `active_encounter_type`/`active_encounter_status` already use, no new shaping code needed.
- Frontend `Encounter` type (`src/services/encounters.service.ts`) — add the six new optional fields (`triageStatus`, `triagePriority`, `currentStep`, `arrivedAt`, `triageDisposition`, `resuscitationRequired`), matching the existing `activeEncounterType`/`activeEncounterStatus` field style.
- Two new client-side derived buckets in `src/pages/encounters/index.tsx`, computed from the same already-fetched `encounters` array (exactly like `waiting`/`intake`/`withProvider`/`done` at line 85-95 today):
  - `erPending`: `encounterType === 'emergency' && triageStatus === 'pending'`
  - `erTriaged`: `encounterType === 'emergency' && triageStatus === 'complete' && currentStep === 'doctor'`
  - Both sorted: priority P1→P4 first, then `arrivedAt` ascending (PRD §7.3) — client-side sort is fine here, the whole list is already bounded to "today" in memory, same as every other bucket on this page.
- Two new tabs in `EncountersQueueTabs.tsx`: "ER — Pending Triage" (nurse view, columns per PRD §7.1: Encounter No, MRN, Patient name, Age/Gender, Triage status, Time of arrival) and "ER — Triaged" (doctor view, columns per PRD §7.2: Priority badge, Encounter No, Patient name, Disposition) — **new lightweight list components** (`ErPendingList.tsx`, `ErTriagedList.tsx`), not a retrofit of the existing `EncounterList.tsx` (that component is OPD-shaped: "Start Intake" action, OPD status-color map, different columns than PRD §7.1/§7.2 ask for). Row click reuses the same `navigate('/consultation/:id')` pattern `EncounterList.tsx` already uses — no new routing.
- **UMR clarification (confirmed 2026-08-26):** PRD §7.1's "UMR" column = this system's `patient.patientId`, labeled **"MRN"** everywhere else it's shown (`PatientList.tsx`'s table header) — use "MRN" as the column label, not "UMR", for consistency with the rest of the app.
- Tab visibility: "ER — Pending Triage" only when the signed-in user's roles include `ed_nurse`; "ER — Triaged" only when roles include `ed_doctor`. Reuse whatever role-check hook (`useAuth`) already powers conditional sidebar items — same pattern, not a new mechanism.
- Priority badge component (P1 red / P2 orange / P3 yellow / P4 green) — first use of the color constants from technical-design.md §9, defined once here for reuse in ET-3/ET-5.

## Out of scope

- Any new backend query-param filtering (`GET /api/frontdesk/visits` schema is unchanged) — bucketing stays client-side, matching the existing page architecture
- Retrofitting `EncounterList.tsx` itself — it stays exactly as-is for OPD tabs
- The Emergency Triage form — `/consultation/:id` already exists and works for other encounter types; ET-3 adds the emergency-specific step inside it

## Backend changes this slice

| File | Change |
|------|--------|
| `backend/src/modules/frontdesk/visits/visits.service.ts` | Extend `active_enc` LATERAL subquery's SELECT list (encounter triage columns), `listVisits()` raw SQL |

No new endpoint, no schema/querystring change — `listVisitsQuerySchema` is untouched.

## Acceptance (slice)

- [ ] `ed_nurse` sees an "ER — Pending Triage" tab; `ed_doctor` sees an "ER — Triaged" tab; a plain `nurse`/`doctor` (no ED role) sees neither
- [ ] Pending list sorted P1→P4 then oldest-arrival-first (before any triage exists, `triage_priority` is NULL — NULLs sort last, arrival-time-only ordering applies until ET-3 starts writing priorities)
- [ ] Triaged list sorted the same way, shows real priority once ET-3 lands (empty/no data is fine for this slice — the column exists and renders correctly, just nothing populates it yet)
- [ ] OPD encounters never appear in either ER tab regardless of role
- [ ] Existing `waiting`/`intake`/`withProvider`/`done` tabs are completely unaffected (regression check — this slice only adds columns to a SELECT and two new derived arrays, touches nothing existing)
- [ ] `GET /api/frontdesk/visits` response includes the 6 new fields for emergency-type visits with an active encounter, and omits/nulls them correctly for OPD visits

**Correction (found 2026-08-26, while starting ET-4 planning):** this slice's row `id` is the **visit** id, not the encounter id — `active_enc` never selected `e.id`. ET-3's `EmergencyTriageDialog` needs the actual `encounters.id`, so a 7th field, `activeEncounterId` (`active_enc.encounter_id AS encounter_id` in the LATERAL join), was added here retroactively. Every real UI click-through before this fix would have 404'd — only caught by tracing the data flow end-to-end, not by direct service-call verification. See status.yaml for the full fix record.
