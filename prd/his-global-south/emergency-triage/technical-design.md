# Technical Design: Emergency Triage Module — v1.0

| Field | Value |
|-------|-------|
| **PRD** | [prd.md](./prd.md) (v2.0, product-supplied) |
| **Base branch** | `feat/emergency-triage` (off `feat/platform-admin-hospitals`) |
| **Date** | 2026-08-26 |

Every claim below was checked directly against the code on `feat/emergency-triage`, not assumed from the PRD's own "(existing)" labels.

---

## 1. Problem framing

The PRD is a genuinely strong spec — sections, business rules, and acceptance criteria are already precise. This design exists to do three things before implementation starts:

1. Resolve places where the PRD's "(existing)" claims don't match the actual schema/role model (§3).
2. Point HIV/TB integration (§9.4/OI-2) at the concrete module that already implements it, instead of leaving it as a lookup task for whoever picks up the slice (§5).
3. Turn the "TBD by engineering" items (OI-1, OI-3) into real routes/columns, so slice planning isn't blocked on discovery work.

Nothing here changes PRD scope, business rules, or acceptance criteria — those are locked at G1 (product). This is purely "how it's built against what's actually there."

---

## 2. `encounter_type = 'emergency'` — already live, no new enum work

Checked `backend/src/db/schema/enums.ts`:

```ts
export const encounter_type = pgEnum("encounter_type", ['opd', 'daycare', 'maternity', 'emergency', 'laboratory', 'radiology', 'pharmacy'])
```

`encounters.encounter_type` (in `backend/src/modules/clinical/pgschema/encounters.pgschema.ts`) already defaults to `'opd'` and already accepts `'emergency'`. PRD §11.1 lists this as "extend existing table" — accurate. **OI-1** (front desk sets `encounter_type = emergency`) is a wiring task in the encounter-creation path (`emitVisitCreated`/visit→encounter provisioning in `backend/src/modules/clinical/shared/provisionServiceLineVisit.ts`), not a schema gap — flagged for slice 1, not a design blocker.

None of the triage-specific columns exist yet (`triage_status`, `triage_priority`, `triage_disposition`, `resuscitation_required`, `current_step`, `triaged_at`, `triaged_by`, `arrived_at`) — confirmed by reading the full `encounters.pgschema.ts` column list. PRD §11.1 correctly scopes these as new.

---

## 3. Role model (resolves PRD §5)

Checked `app_role` enum (`backend/src/db/schema/enums.ts`) and `ROLE` (`backend/src/modules/platform/platform.constants.ts`):

```
provider_admin, biller, clinician, super_admin, doctor, nurse, receptionist,
patient, admin, lab_tech, pharmacist, radiographer, phlebotomist,
physician_assistant, nurse_practitioner, platform_admin
```

**There is no OPD/ED department split today.** `registrar`, `opd_nurse`, `opd_doctor` — the three roles PRD §5 marks "(existing)" — don't exist under those names. Mapping:

| PRD role | Reality | Design decision |
|----------|---------|------------------|
| `registrar` | → `receptionist` | Use existing `ROLE.RECEPTIONIST` as-is, no change |
| `superadmin` | → `super_admin` | Use existing `ROLE.SUPER_ADMIN` as-is (underscore, not PRD's literal spelling) |
| `ed_nurse` (new) | Genuinely new | Add to `app_role` enum |
| `ed_doctor` (new) | Genuinely new | Add to `app_role` enum |
| `opd_nurse` / `opd_doctor` | **Do not create** | See below |

**Decision:** don't add `opd_nurse`/`opd_doctor` as enum values. "OPD-only" access (AC-5, AC-11) is defined as *generic `nurse`/`doctor` without `ed_nurse`/`ed_doctor`* — i.e. a user needs `ed_nurse` specifically to see the ER queue/triage form, and `ed_doctor` specifically to see the triaged/doctor queue on emergency encounters. Plain `nurse`/`doctor` continue to work exactly as today for OPD (`Intake` → `Doctor`, via existing `FRONTDESK_ROLES`/`CLINICAL_ROLES` gates in `middleware/require-roles.ts`).

Rationale: adding `opd_nurse`/`opd_doctor` as parallel enum values would require a data migration reclassifying every existing `nurse`/`doctor` row, and touches every other module that already gates on `CLINICAL_ROLES`/`FRONTDESK_ROLES` (screening, intake, encounters, IPD admissions). Scoping the two new roles to *only the ED-specific views* is a strict superset — it adds access, doesn't take any away from existing OPD flows, and needs zero changes outside this feature's own route guards.

**Confirmed 2026-08-26 (Rahul Ranjan):** Option A. This reading of AC-5/AC-11 is approved — proceed on this basis in slice 1.

---

## 4. Screening engine reuse (resolves PRD §9.4 / OI-2)

PRD §9.4 requires HIV/TB questions to load from an "existing Super Admin → Questionnaire module," explicitly forbidding a new config table (§4 out-of-scope, §19).

**This is the screening assessment engine already built and shipped this session** — `backend/src/modules/screening/` (definitions/assignments/responses sub-modules), platform-admin UI at `src/platform/pages/screening/`. It already has everything PRD §9.4 asks for:

- `PHASE.TRIAGE = 'triage'` already exists in `screening.constants.ts`'s phase enum — no schema change needed, just a new phase assignment.
- `resolveAssignmentsForPhase()` already does org-override → platform-default fallback.
- `assessment_definitions` / `assessment_phase_assignments` / `assessment_responses` (migration `006_screening_assessments.sql`) is the "existing Questionnaire storage" — reusing it satisfies §19's "do not create `emergency_triage_questionnaire_config`" directly.
- The platform-admin question builder (`src/platform/pages/screening/QuestionBuilder.tsx`) already lets Super Admin add/edit/disable questions and publish new versions — satisfies "Admin may add/edit/disable HIV/TB questions... changes appear on triage form after publish" verbatim.
- `SCREENING_VIEW_ROLES`/`PHASE_ROLES[PHASE.TRIAGE] = CLINICAL_ROLES` already gates read access to doctor/nurse tiers — `ed_nurse`/`ed_doctor` need adding to `CLINICAL_ROLES` (or an equivalent superset) so they inherit this for free.

**Concretely for slice planning:**
1. Seed an HIV/TB `assessment_definition` (the 6 default questions from PRD §9.4) and an `assessment_phase_assignment` for `phase = 'triage'`, org-default (mirrors how the HIV/TB registration definitions were seeded in migration `006`).
2. Mount `<ScreeningAssessments phase={SCREENING_PHASE.TRIAGE} patientId=... visitId=... />` (same component already used in `NurseIntakeDialog.tsx`) inside the new Emergency Triage form, in BR-2 full-form mode only (BR-1 resuscitation mode explicitly hides HIV/TB per §10).
3. `emergency_triage_records.hiv_tb_answers` (PRD §11.2) — **not needed as a separate JSONB column.** Screening answers already write to `assessment_responses`, keyed by `patient_id`/`visit_id`/`definition_id`, independently queryable (already how doctor/nurse visibility works at intake/encounter today). Drop this column from §11.2's table — track it as "resolved by reuse" rather than building parallel storage that would drift from the canonical `assessment_responses` rows.

**OI-2 answer:** GET published questions → existing `GET /api/screening/definitions` (phase-filtered) + `GET /api/screening/phase-assignments`; answers via existing `POST /api/screening/responses`. No new HIV/TB-specific endpoint needed.

---

## 5. Data model (extends PRD §11)

### 5.1 `encounters` — new columns (migration, e.g. `008_emergency_triage.sql`)

Matches PRD §11.1 exactly, with types tightened to match this codebase's conventions (enums over free-text VARCHAR where a closed set exists, mirroring how `encounter_type`/`encounter_status` are already modeled):

| Column | Type | Notes |
|--------|------|-------|
| `triage_status` | new `triage_status` pgEnum: `pending`, `complete` | Nullable — NULL for OPD encounters |
| `triage_priority` | new `triage_priority` pgEnum: `P1`,`P2`,`P3`,`P4` | Nullable until triaged |
| `triage_disposition` | text | FK-like reference to Appendix A codes, validated in Zod schema (small closed set, not worth its own table) |
| `resuscitation_required` | boolean, default false, not null | |
| `current_step` | new `encounter_step` pgEnum: `intake`, `triage`, `doctor` | Default `'intake'`; OPD encounters use `intake`→`doctor` only, emergency use `triage`→`doctor` |
| `triaged_at` | timestamptz | |
| `triaged_by` | uuid, FK `profiles(id)` | **Use `profiles.id`, not Better Auth `user.id`** — this session already hit exactly this bug once (screening responses' `answered_by` column) and fixed it; don't repeat it here |
| `arrived_at` | timestamptz | Set at emergency inflow |

**Why enums, not VARCHAR:** every other status/type column on `encounters` (`encounter_type`, `status`) is already a pgEnum, and Postgres enums are what `idx_encounters_encounter_type`-style indexes are built against elsewhere in this table. Free-text VARCHAR for a 2–4 value closed set would be the only inconsistent column on the table.

**Naming clarification (found during ET-1 implementation, 2026-08-26):** there is a pre-existing, unrelated `intake.triage_level` column (`pgEnum`: `immediate`/`emergent`/`urgent`/`less_urgent`/`non_urgent`) set during the regular OPD Nurse Intake step. It is **not** the same concept as this feature's `encounters.triage_priority` (P1–P4) — different table, different scale, different pathway (OPD Intake stays completely unchanged per PRD §6.2/§14). No conflict, just noting it so nobody conflates the two when reading the schema later.

**Also found during ET-1 implementation:** the existing visit-status transition guard (`SERVICE_LINE_VISIT_TYPES` in `frontdesk.constants.ts`) required a visit to reach `intake_complete` before an encounter could go `in_progress`, unless the visit type was in a "skip intake" allowlist (lab/radiology/pharmacy/nursing/tele). `emergency` wasn't in that list — which would have silently blocked the entire emergency pathway, since Emergency Triage *replaces* Intake for ED encounters (PRD §8), it doesn't follow it. Added `VISIT_TYPE.EMERGENCY` to `SERVICE_LINE_VISIT_TYPES` as part of ET-1 (small, same pattern as the existing five entries) — this wasn't called out in the original design pass, found via live end-to-end testing.

### 5.2 `emergency_triage_records` (new) — per PRD §11.2, with `hiv_tb_answers` dropped (§4 above)

```
id                  uuid PK
encounter_id        uuid UNIQUE FK → encounters(id) ON DELETE CASCADE
organization_id     uuid FK → organizations(id)   -- match this codebase's org-scoping convention, not "tenant_id"
facility_id         uuid FK → facilities(id), nullable
template_code       text default 'emergency_triage_adult'
chief_complaint     text
not_breathing, seizure_current, burn_facial_inhalation,
  hypoglycemia, obstructed_airway, cardiac_arrest    boolean each, not null default false
no_emergency_sign   boolean not null default false
very_urgent_signs   jsonb default '[]'
no_very_urgent_sign boolean not null default false
urgent_signs        jsonb default '[]'
no_urgent_sign      boolean not null default false
respiration, heart_rate, bp_systolic, bp_diastolic,
  spo2, temperature       integer/numeric, nullable
lmp_date            date, nullable
pain_score, mobility, trauma   text, nullable (small closed dropdown sets — Zod-validated, not enum'd; likely to change before clinical sign-off per OI-4/OI-5)
tews_score          integer, nullable  -- calculated server-side, not client-trusted
investigations       jsonb default '{}'  -- {rbs, urine, ecg, poct, others}
disposition          text not null  -- Appendix A code
priority              triage_priority not null  -- same enum as 5.1, reused
resuscitation_required boolean not null default false
created_by            uuid FK → profiles(id)
created_at, updated_at timestamptz
```

Note: `priority`/`resuscitation_required` are duplicated onto both `encounters` (for list-query/sort performance — PRD §7.3 sorts the list by these) and `emergency_triage_records` (source of truth, written first in the same transaction). This mirrors how `patients` already duplicates coverage fields for list performance elsewhere in this codebase — not a new pattern.

### 5.3 `emergency_triage_alerts` (new) — per PRD §11.3, as specified, no changes.

### 5.4 Migration mechanics

Per this repo's Drizzle workflow: edit `*.pgschema.ts` first (encounters + two new tables), run `npm run db:generate`, hand-curate the resulting SQL into a numbered migration (next available: **`008_emergency_triage.sql`** on this branch — numbers collide across branches by design here, resolved at merge). **Every new/changed column needs `COMMENT ON`** per `schema-comments.mdc` — non-negotiable in this repo, not optional polish.

---

## 6. Order deep links (resolves PRD §9.3 / OI-3)

Checked actual routes rather than leaving these as "TBD by engineering":

| PRD link | Real route | Notes |
|----------|-----------|-------|
| Nursing and POC Orders | `POST /api/clinical/orders` (create), `GET /api/clinical/orders` (list) — `backend/src/modules/clinical/orders/orders.routes.ts` | Frontend page: `/orders` (`src/pages/Orders.tsx`) |
| POC Result Entry | Same `orders` module — result entry is part of the order detail flow, not a separate route | Confirm exact result-entry sub-route during slice planning; not yet grepped to file:line here |
| Medication Order | `POST /api/clinical/prescriptions` — `backend/src/modules/clinical/prescriptions/prescriptions.routes.ts` | Frontend page: `/prescriptions` (`src/pages/Prescriptions.tsx`) |

**Open for slice 1:** confirm the exact query-param convention for passing encounter context into `/orders` and `/prescriptions` (e.g. `?encounterId=`) — both pages exist and are routed, but this design pass didn't trace whether they currently accept a deep-link encounter filter or only work from an already-open encounter context. Quick check, not a structural risk.

---

## 7. API design (extends PRD §12 with real base paths)

This codebase's convention is domain-prefixed (`/api/frontdesk`, `/api/clinical`, `/api/v1/ipd`, `/api/screening`), not bare `/encounters`. Emergency triage belongs under **`/api/clinical`** — it's an encounter-domain feature, same module family as `orders`/`prescriptions`/`encounters` already are.

| Method | Endpoint | Role gate | Notes |
|--------|----------|-----------|-------|
| GET | `/api/clinical/encounters/:id/emergency-triage` | `ed_nurse`, `ed_doctor` | Load form + prior snapshot (§9.2 "Saved Triage" dropdown) |
| POST | `/api/clinical/encounters/:id/emergency-triage` | `ed_nurse` only | Save — see §5 body validation below |
| ~~GET .../emergency-triage/summary~~ | — | — | **Removed (ET-5 planning, 2026-08-26):** redundant — the GET above already returns the full record and is already `ed_doctor`-accessible via `ED_STAFF_ROLES`. Doctor UI reuses it instead of a second endpoint. |

**Correction (found during ET-2 planning, 2026-08-26):** the two "list" rows originally here (`GET /api/clinical/encounters?encounter_type=emergency&triage_status=pending` etc.) were wrong. The actual "Encounter sidebar → patient list" the PRD refers to (§7, §13) is the front-desk queue page (`src/pages/encounters/index.tsx`), which is backed by **`GET /api/frontdesk/visits`** (raw-SQL `listVisits()` in `visits.service.ts`), not `/api/clinical/encounters` — and it doesn't do server-side status/type query filtering at all today. It fetches the whole day's visits once (`date` + `include_open`) and buckets them **entirely client-side** into tabs (`waiting`/`intake`/`withProvider`/`done`). See slice-2.md (corrected) for the real integration plan: extend `listVisits()`'s existing `active_enc` LATERAL join to also surface the new triage columns, then add two more client-side buckets following the exact same pattern — no new list endpoint, no new server-side query params.

New Fastify module: `backend/src/modules/clinical/emergencyTriage/` (`.routes.ts` / `.controller.ts` / `.service.ts` / `.schema.ts` / `.constants.ts`), following this repo's mandatory layered pattern — registered in `build-app.ts` under the existing `clinical` domain, not a new top-level domain (matches PRD §13 "reuse existing Encounter sidebar," no new module surface expected by the user).

**POST save, server-side (per PRD §12, unchanged):**
1. `req.auth` role must include `ed_nurse`; encounter's `encounter_type` must be `emergency` — 403/409 otherwise
2. Zod/JSON-schema: all six Emergency Signs required; `disposition` required
3. Upsert `emergency_triage_records` (unique on `encounter_id`)
4. Priority engine (§8 below) run server-side — **never trust a client-computed priority/TEWS score**, per PRD's own "enforced on backend, not UI only"
5. Update `encounters.triage_status = 'complete'`, `current_step = 'doctor'`, `triaged_at = now()`, `triaged_by = profile.id`
6. If P1 → insert `emergency_triage_alerts` row, fan out via the existing event bus (`orchestration/event-bus.ts`) + SSE (`orchestration/sse.service.ts`) to `ed_doctor` — same async, non-blocking pattern this repo already uses for cross-module notifications. Do not block the HTTP response on alert delivery.

---

## 8. Priority engine (BR-3) — pure function, unit-testable in isolation

```ts
function computeTriagePriority(input: {
  emergencySigns: boolean[];      // exactly 6
  veryUrgentSigns: string[];      // checked codes
  urgentSigns: string[];
  tewsScore: number | null;
  tewsThreshold: number;          // configurable, OI-4 pending
}): 'P1' | 'P2' | 'P3' | 'P4'
```

First-match-wins per PRD BR-3, implemented as a straight-line `if` chain (not a rules engine — four conditions don't warrant one). Lives in `emergencyTriage.service.ts`, called from the POST handler, and is the single source of truth both `encounters.triage_priority` and `emergency_triage_records.priority` write from — no duplicated logic between the two columns.

### 8.1 TEWS formula — provisional standard, pending clinical confirmation (OI-4)

**Decision 2026-08-26 (Rahul Ranjan):** ship with a standard formula now rather than leaving TEWS uncomputed; mark it provisional in the UI so it's visibly pending clinical review, not silently treated as final.

The field list in PRD §9.3 (Respiration, Heart Rate, Systolic BP, Temperature, Mobility, Trauma) matches the **South African Triage Scale (SATS)** — the standard ED triage system this "TEWS" naming comes from, widely deployed across African EDs. Its point-per-vital-sign table is well-published and used as the provisional default:

| Parameter | 0 pts | 1 pt | 2 pts | 3 pts |
|-----------|-------|------|-------|-------|
| Respiration rate (/min) | 12–20 | 21–25 or 9–11 | 26–30 or 6–8 | >30 or <6 |
| Heart rate (/min) | 51–100 | 101–110 or 41–50 | 111–129 or ≤40 | ≥130 |
| Systolic BP (mmHg) | 101–199 | 81–100 | 71–80 or ≥200 | ≤70 |
| Temperature (°C) | 35.1–37.5 | — | 35.0 or 37.6–38.4 | ≤34.9 or ≥38.5 |
| Mobility | Walking | With assistance | — | Immobile/carried |

`tews_score` = sum of the five bands above (Trauma is captured but not currently scored in the standard table — carried as context only, per SATS convention where trauma mechanism escalates via the Very Urgent discriminator list, not the TEWS number itself).

**Threshold (BR-3, P3 boundary):** provisional default `tewsThreshold = 3` — i.e. `tews_score ≥ 3` contributes to P3 per PRD's "TEWS ≥ threshold" condition, matching a commonly-cited SATS Yellow-tier cut-off. **This exact number is the part that genuinely varies by site/revision in real SATS deployments — this is a placeholder, not a confirmed value.**

Confidence note: the point-per-vital-sign table above is standard and well-documented; the specific threshold number is the part most likely to need adjustment once clinical confirms your deployment's SATS revision.

### 8.2 Urgent Signs list — provisional placeholder, lower confidence than §8.1 (OI-5)

**Decision 2026-08-26:** same approach — ship a placeholder Yellow-tier list now, flagged provisional in UI.

Unlike the TEWS point table, I don't have the same confidence reconstructing SATS's exact canonical Yellow discriminator list from memory. Provisional placeholder (common ED "urgent, not immediately life-threatening" presentations, consistent in spirit with PRD's existing Very Urgent list):

- Moderate pain (not severe)
- Vomiting/diarrhea with mild-moderate dehydration signs
- Closed fracture / suspected fracture (not compound)
- Urinary retention
- Head injury, no loss of consciousness, alert
- Laceration requiring sutures (not uncontrolled bleeding)
- Fever without red/orange discriminators
- Persistent vomiting

**This list is a best-effort draft, explicitly weaker confidence than §8.1 — treat as "something to show a clinician for a 10-minute review," not a defensible clinical list.**

---

## 9. Frontend

- **Correction (found during ET-3 planning, 2026-08-26):** the previous line here was wrong. `ConsultationWorkspace` (`/consultation/:id`) is **exclusively the doctor's SOAP-note workspace** (`CONSULTATION_STAGES` = Intake/Subjective/Objective/Assessment/Plan — "Intake" there is a *read-only summary* of what the nurse already recorded, not a write step). The nurse's actual write-step UI pattern in this codebase is a **controlled dialog launched from the queue list** (`NurseIntakeDialog.tsx`, triggered by a "Start Intake" button in `EncounterList.tsx`, separate from the row-click-to-consultation navigation). Emergency Triage is nurse-authored, so it follows that same dialog pattern: a new `EmergencyTriageDialog.tsx` (mirrors `NurseIntakeDialog.tsx`'s `{ open, onOpenChange, visit, onSuccess }` shape), triggered from ET-2's `ErPendingList.tsx` — **not** a tab bolted onto `ConsultationWorkspace`.
- **Second correction, same investigation:** ET-1 added `emergency` to `SERVICE_LINE_VISIT_TYPES` (correctly, to unblock encounter creation) — but that has a side effect nobody had traced: `EncounterList.tsx`'s existing "Start Consultation" button already treats every service-line type as "skip straight to the doctor's SOAP workspace" once `checked_in`. For emergency encounters this means a user could click "Start Consultation" from the generic **Waiting**/**All** tabs and land directly in `ConsultationWorkspace` with **no triage ever performed** — a real BR-4 bypass, not a hypothetical. ET-3 must close this: `EncounterList.tsx`'s "Start Consultation" condition needs an emergency-aware guard (don't show it, or route to the triage dialog instead, until `triageStatus === 'complete'`).
- ER list views (§7.1/§7.2, PRD §7) are two new client-side buckets on the existing Encounters **queue** page (`src/pages/encounters/index.tsx`, `EncountersQueueTabs.tsx`) — same pattern as the existing `waiting`/`intake`/`withProvider`/`done` buckets, all derived client-side from one `date`+`include_open` fetch. **Not** new server-side query filters (corrected in §7 above) — not a new list page either, matching PRD §13 "existing Encounter sidebar."
- New component: `EmergencyTriageForm.tsx` — Emergency Signs / Very Urgent / Urgent / TEWS / Investigations / Disposition sections per §9.3, with BR-1/BR-2 conditional section visibility.
- HIV/TB block: `<ScreeningAssessments phase={SCREENING_PHASE.TRIAGE} .../>`, reused verbatim (§4).
- Priority badges (P1 red / P2 orange / P3 yellow / P4 green) and section border colors: new constants in a `emergencyTriage.constants.ts`, no existing color-token reuse found for this exact 4-tier scheme — confirm against design system before hardcoding hex values.
- **Provisional-standard indicator (per decision in §8.1/§8.2):** the TEWS score display and the Urgent Signs checklist must both render a visible "Provisional — pending clinical review" badge/tooltip in the triage form. Not optional polish — this is the mechanism that makes it safe to ship a placeholder formula/list into a real clinical workflow before sign-off. Remove the badge only when OI-4/OI-5 are answered and the constants are updated to the confirmed values.

---

## 10. Open questions for approval

1. ~~Role scoping (§3)~~ — **Resolved 2026-08-26: Option A.** "OPD-only" = generic `nurse`/`doctor` without `ed_nurse`/`ed_doctor` (AC-5/AC-11 satisfied by the new roles being strictly additive). No `opd_nurse`/`opd_doctor` enum values, no reclassification of existing staff.
2. ~~`hiv_tb_answers` column removal (§4)~~ — **Resolved 2026-08-26: confirmed, use `assessment_responses`.** No `hiv_tb_answers` JSONB column on `emergency_triage_records`. This is a deliberate, approved deviation from PRD §11.2's literal column list — the questionnaire engine already provides configurable, phase-assignable storage for exactly this data; a second column would just be a second source of truth for the same answers.
3. ~~OI-4 (TEWS formula)~~ / ~~OI-5 (Urgent Signs final list)~~ — **Resolved 2026-08-26: ship provisional standard now, not blocking.** Decision (Rahul Ranjan): build with the SATS-based provisional formula (§8.1) and placeholder Urgent Signs list (§8.2) rather than waiting, with a mandatory "Provisional — pending clinical review" UI badge (§9) so it's visibly not final. Actual clinical sign-off still needed from product/clinical team **before go-live** — tracked as a follow-up, not a build blocker. When it lands, update the constants in `emergencyTriage.constants.ts` and remove the badge; no schema change needed either way.
4. **Order deep-link query param (§6)** — low-risk, confirm during slice 1 rather than blocking this design doc.

---

## Approval
- [x] Product — acceptance criteria match PRD v2.0 as supplied
- [x] Tech — role model resolution (§3), screening-engine reuse (§4), data model (§5), and provisional TEWS/Urgent-Signs approach (§8.1/§8.2) approved
- [x] **Approved by:** Rahul Ranjan
- [x] **Date:** 2026-08-26

**Remaining before go-live (not before implementation):** clinical sign-off on the real TEWS threshold and Urgent Signs list (§8.1/§8.2), and the order deep-link query param check (§6, slice 1).
