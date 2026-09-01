# Slice ET-1 — Encounter model + roles + emergency inflow

| Field | Value |
|-------|--------|
| **ID** | ET-1 |
| **Depends on** | — |
| **Technical design refs** | §3 (role model), §5.1 (encounters columns), §5.4 (migration mechanics) |
| **Tracer** | Front desk emergency inflow → encounter row has `encounter_type='emergency'`, `triage_status='pending'`, `current_step='triage'`, `arrived_at` set → confirmed in DB (no UI yet, ET-2 adds the list) |

## Purpose

The dependency root. Nothing else in this feature can be built until `encounter_type = emergency` reliably produces the right triage-tracking columns, and `ed_nurse`/`ed_doctor` exist as roles to gate against.

## In scope

- Migration `008_emergency_triage.sql` (or next available number at implement time — collisions resolved at merge per repo convention):
  - New `triage_status` pgEnum (`pending`, `complete`)
  - New `triage_priority` pgEnum (`P1`,`P2`,`P3`,`P4`)
  - New `encounter_step` pgEnum (`intake`, `triage`, `doctor`), default `intake`
  - `encounters` columns: `triage_status`, `triage_priority`, `triage_disposition` (text), `resuscitation_required` (boolean, default false), `current_step` (encounter_step, default `intake`), `triaged_at`, `triaged_by` (uuid FK `profiles(id)` — **not** Better Auth `user.id`, see technical-design.md §5.1), `arrived_at`
  - `COMMENT ON` for every new column (`schema-comments.mdc` — mandatory, same migration file)
  - `ALTER TYPE app_role ADD VALUE 'ed_nurse'`, `ADD VALUE 'ed_doctor'`
- `backend/src/modules/clinical/pgschema/encounters.pgschema.ts` updated to match (edit pgschema first, `npm run db:generate`, hand-curate into the migration — standard repo flow)
- Emergency inflow wiring: wherever front desk emergency registration/check-in currently provisions a visit/encounter (`provisionServiceLineVisit.ts` or equivalent in the check-in path), set `current_step='triage'`, `triage_status='pending'`, `arrived_at=now()` when `encounter_type='emergency'`. OPD encounters unaffected — `current_step` stays `intake`, `triage_status` stays NULL.
- Add `ED_NURSE`/`ED_DOCTOR` to `ROLE` (`platform.constants.ts`) and to whatever role-list constants this slice's own route guards will need (do **not** add them to existing `CLINICAL_ROLES`/`FRONTDESK_ROLES` yet — that's ET-2/ET-3's job, scoped to what those slices actually gate)
- **(found during implementation)** Add `VISIT_TYPE.EMERGENCY` to `SERVICE_LINE_VISIT_TYPES` (`frontdesk.constants.ts`) — the pre-existing visit-status guard otherwise blocks `checked_in → in_progress` for emergency visits until `intake_complete`, which contradicts Emergency Triage replacing Intake for the ED pathway (PRD §8). See technical-design.md §5.1.
- **Ripple effect of the above (found 2026-08-26, while reviewing ET-3 with the user):** `SERVICE_LINE_VISIT_TYPES` has 3 consumers, not 1 — the visit-status guard (intended), `EncounterList.tsx`'s "Start Consultation" button (the real BR-4 bypass ET-3 fixes), and `getVisitStats()`'s `service_line_count`, which feeds the Encounters page's **"Service Lines"** stat card. That card's count now silently includes emergency visits. User's call: keep emergency in the count, fix the label instead of excluding it — subtitle changed from "Lab, imaging, pharmacy" to "Lab, imaging, pharmacy, emergency" (`EncountersStatsCards.tsx`). Small, but a real pre-existing-functionality change worth recording here.

## Out of scope

- Any UI (list views are ET-2, form is ET-3)
- `emergency_triage_records` / `emergency_triage_alerts` tables (ET-3/ET-5)
- Actually assigning `ed_nurse`/`ed_doctor` to any real user — that's a seed/ops task for whoever tests ET-2, not schema work

## Data model

Per technical-design.md §5.1 — see there for the full column table and rationale (enums matching existing `encounter_type`/`status` convention on this table, `triaged_by` → `profiles.id` gotcha called out explicitly).

## Acceptance (slice)

- [ ] Migration applies cleanly on a fresh dev DB and via `db:migrate` on an existing one
- [ ] Every new column has a `COMMENT ON`
- [ ] `app_role` enum includes `ed_nurse`, `ed_doctor` — confirm via `\d+ app_role` or equivalent, not just migration success
- [ ] Creating an emergency-type encounter via the existing front-desk flow results in `triage_status='pending'`, `current_step='triage'`, `arrived_at` set (verify with a real write, not just reading the migration — this project's established bar per CLAUDE.md: verify against the real running stack, not just types/tests)
- [ ] Creating an OPD-type encounter is unaffected — `triage_status` NULL, `current_step='intake'`
- [ ] `npx tsc --noEmit` clean on both frontend and backend after the pgschema edit
