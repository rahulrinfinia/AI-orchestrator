# Slice ET-3 — Emergency Triage form + priority engine + save API + doctor gate

| Field | Value |
|-------|--------|
| **ID** | ET-3 |
| **Depends on** | ET-1 |
| **Technical design refs** | §5.2, §5.3, §7, §8, §8.1, §8.2, §9 |
| **Tracer** | `ed_nurse` opens a pending encounter from the ET-2 list → fills Emergency Signs (all NO) → full form appears → fills TEWS/investigations/disposition → Save → `triage_status` flips to `complete`, `current_step` to `doctor`, priority computed and shown |

## Purpose

The core write path and the biggest slice — this is where BR-1 through BR-4 actually get enforced. Everything else in the feature (HIV/TB, alerts, order links) mounts inside this form, so it has to land before ET-4/5/6 can start.

**Corrections found during planning, 2026-08-26 (see technical-design.md §9):**
1. `ConsultationWorkspace` is the doctor's SOAP workspace only — the triage form is a **controlled dialog** (`EmergencyTriageDialog.tsx`, mirroring the existing `NurseIntakeDialog.tsx` pattern), triggered from ET-2's `ErPendingList.tsx`, **not** a tab inside `ConsultationWorkspace`.
2. ET-1's `SERVICE_LINE_VISIT_TYPES` fix has a real side effect on `EncounterList.tsx`'s "Start Consultation" button — but the exact mechanism was corrected again during implementation (2026-08-26): the frontend turned out to have a **separate, un-synced copy** of `SERVICE_LINE_VISIT_TYPES` in `visits.service.ts`, so the live bug was actually "Start Intake" wrongly showing for emergency encounters (opening the wrong dialog), not "Start Consultation" directly. Fixed by syncing the frontend set *and* adding an emergency+triage-not-complete guard on "Start Consultation" — both were needed, since syncing alone would have activated the originally-predicted bypass.

## In scope

- New backend module `backend/src/modules/clinical/emergencyTriage/` (`.routes.ts`/`.controller.ts`/`.service.ts`/`.schema.ts`/`.constants.ts`), registered under the existing `clinical` domain in `build-app.ts` — per this repo's mandatory layered pattern, no SQL/business logic in route closures.
- `emergency_triage_records` and `emergency_triage_alerts` tables (migration, continuing from ET-1's number) — per technical-design.md §5.2/§5.3, **without** the `hiv_tb_answers` column (resolved decision, ET-4 uses the screening engine instead). `COMMENT ON` for every column.
- `computeTriagePriority()` pure function (technical-design.md §8) — unit-tested in isolation with table-driven cases covering all four BR-3 branches plus edge cases (all signs NO + no TEWS score yet, etc.)
- TEWS scoring (technical-design.md §8.1) and Urgent Signs list (§8.2) — the **provisional SATS-based standard**, in `emergencyTriage.constants.ts` so it's a single place to update when real clinical values arrive. Ship it now, per the resolved decision — do not block this slice waiting for clinical sign-off.
- `GET /api/clinical/encounters/:id/emergency-triage` — load form + prior snapshot (PRD §9.2 "Saved Triage" dropdown, if a record already exists for this encounter)
- `POST /api/clinical/encounters/:id/emergency-triage` — save. Server must (PRD §12, unchanged):
  1. Role `ed_nurse` + `encounter_type='emergency'` required, else 403/409
  2. All six Emergency Signs answered + `disposition` required (schema validation)
  3. Upsert `emergency_triage_records` (unique on `encounter_id`)
  4. Run `computeTriagePriority()` server-side — **never trust a client-computed value**
  5. Update `encounters.triage_status='complete'`, `current_step='doctor'`, `triaged_at=now()`, `triaged_by=profile.id` (not Better Auth `user.id` — same gotcha as ET-1)
  6. If P1: write the `emergency_triage_alerts` row and `resuscitation_required=true` on both tables (ET-5 wires the actual fan-out notification; this slice just writes the row)
- Frontend `EmergencyTriageDialog.tsx` (controlled dialog, mirrors `NurseIntakeDialog.tsx`'s `{ open, onOpenChange, visit/encounter, onSuccess }` shape) containing `EmergencyTriageForm.tsx`: Chief complaint, Emergency Signs (6 dropdowns + "no emergency sign" checkbox), Very Urgent Signs (23-item checklist + "no very urgent sign"), Urgent Signs (provisional placeholder list + "no urgent sign"), TEWS inputs, Additional investigations (free text), Disposition (radio, Appendix A codes) — BR-1/BR-2 conditional visibility (resuscitation mode hides Very Urgent/Urgent/TEWS/Investigations/HIV-TB, shows red banner "Proceed for Resuscitation!")
- Wire the dialog's trigger into `ErPendingList.tsx` (ET-2) — a row action opens it, replacing that list's current bare `/consultation/:id` navigation (which was a placeholder pending this slice)
- **Mandatory "Provisional — pending clinical review" badge** on the TEWS score display and the Urgent Signs section (technical-design.md §9, decision from OI-4/OI-5 resolution) — not optional, this is what makes shipping the placeholder formula safe
- Doctor gate (BR-4): Doctor step on `encounter_type='emergency'` encounters is locked/inaccessible until `triage_status='complete'`, and only accessible to `ed_doctor` — implemented as a route guard, not just UI hiding
- **BR-4 bypass fix (correction above):** `EncounterList.tsx`'s "Start Consultation" button — add an emergency-aware condition so it doesn't offer a direct path to `/consultation/:id` for an emergency encounter still in `triage_status='pending'`
- Priority/resuscitation write to **both** `encounters` and `emergency_triage_records` in the same transaction (technical-design.md §5.2 — dual-write is deliberate for list-query performance, not an oversight)

## Out of scope

- HIV/TB section — ET-4 mounts it here but doesn't build it in this slice
- Actual P1 alert delivery to `ed_doctor` users (row is written, fan-out is ET-5)
- Order deep links (ET-6)
- Edit-after-save — BR-5 says locked after save in v1.0; this slice enforces that (no PATCH endpoint), doesn't need to build an edit flow to then disable it

## Endpoints this slice

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/clinical/encounters/:id/emergency-triage` | `ed_nurse`, `ed_doctor` |
| POST | `/api/clinical/encounters/:id/emergency-triage` | `ed_nurse` only |

## Acceptance (slice)

- [ ] All six Emergency Signs = NO → full form renders (BR-2)
- [ ] Any Emergency Sign = YES → resuscitation mode: banner shown, Very Urgent/Urgent/TEWS/Investigations hidden, priority forced P1, `resuscitation_required=true` on save (BR-1, AC-6)
- [ ] Priority computed correctly for all four BR-3 branches — verified via `computeTriagePriority()` unit tests, not just manual click-through
- [ ] Save without disposition is rejected (AC-8)
- [ ] Save without all six Emergency Signs answered is rejected
- [ ] Priority/resuscitation is computed server-side even if a malicious/buggy client sends a different value in the request body (this is the literal PRD requirement: "enforced on backend, not UI only")
- [ ] After save: `triage_status='complete'`, `current_step='doctor'` (AC-9's precondition)
- [ ] Doctor step is inaccessible (403 or route redirect, not just hidden) on this encounter until triage is complete
- [ ] A `nurse`/`doctor` without `ed_nurse`/`ed_doctor` gets 403 on both endpoints
- [ ] TEWS score and Urgent Signs both show the "Provisional" badge in the UI
- [ ] No PATCH/edit endpoint exists for a saved triage record (BR-5)
- [ ] `EncounterList.tsx`'s "Start Consultation" button no longer offers a direct bypass to `/consultation/:id` for a pending-triage emergency encounter (from the Waiting/All tabs, not just the ER tabs)
