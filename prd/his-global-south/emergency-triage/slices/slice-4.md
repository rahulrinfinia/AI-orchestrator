# Slice ET-4 — HIV/TB block (screening engine reuse)

| Field | Value |
|-------|--------|
| **ID** | ET-4 |
| **Depends on** | ET-3 |
| **Technical design refs** | §4 |
| **Tracer** | Full-form mode (all Emergency Signs NO) → HIV/TB questions render inside the triage form, sourced from the existing screening/questionnaire engine → `ed_nurse` answers → stored in `assessment_responses`, same table intake/registration already use |

## Purpose

Satisfies PRD §9.4 and AC-12/AC-15 by **reuse, not rebuild** — this is the payoff of the technical-design.md §4 finding that the screening assessment engine already has everything this section needs, including a `triage` phase already in its enum.

## In scope

- Seed one `assessment_definition` for HIV/TB (the 6 default questions from PRD §9.4) if the platform-admin questionnaire doesn't already have a `triage`-phase HIV/TB definition — mirrors how the registration-phase HIV/TB definitions were seeded in migration `006_screening_assessments.sql`
- One `assessment_phase_assignment` row, `phase='triage'`, org-default (same override-then-fallback resolution `resolveAssignmentsForPhase()` already implements — no new resolution logic)
- Mount `<ScreeningAssessments phase={SCREENING_PHASE.TRIAGE} patientId={...} visitId={...} />` inside `EmergencyTriageForm.tsx` (ET-3), in full-form mode only — hidden entirely in resuscitation mode per BR-1
- Confirm/extend `PHASE_ROLES[PHASE.TRIAGE]` and `SCREENING_VIEW_ROLES` (both in `screening.constants.ts`) so `ed_nurse` can submit and `ed_doctor` can view triage-phase responses — same pattern as the existing doctor/nurse visibility work for intake-phase responses, just extended to the two new roles
- Verify the platform-admin question builder (`src/platform/pages/screening/`) can already target `phase='triage'` when assigning to a hospital — should be zero new admin-UI work since the phase enum and assignment UI are phase-agnostic already; this slice is verification, not new admin-UI

## Out of scope

- Any new questionnaire storage, config table, or admin UI — explicitly forbidden by PRD §4/§19, and per technical-design.md §4 nothing new is needed
- Changing how HIV/TB questions work at registration or intake phases — this slice only adds a `triage` assignment, doesn't touch existing phase behavior

## Endpoints this slice

None new — reuses existing `GET /api/screening/definitions`, `GET /api/screening/phase-assignments`, `POST /api/screening/responses`, `GET /api/screening/responses` with `phase=triage`.

## Acceptance (slice)

- [ ] HIV/TB questions render inside the triage form in full-form mode, sourced from the existing questionnaire engine (not a new component/store)
- [ ] Resuscitation mode hides the HIV/TB block entirely (BR-1)
- [ ] `ed_nurse` can submit answers; they land in `assessment_responses`, joinable by `patient_id`/`visit_id` the same way intake-phase answers already are
- [ ] `ed_doctor` can view submitted triage-phase HIV/TB answers (read), matching the existing doctor/nurse visibility pattern
- [ ] Zero new tables created (AC-15) — confirm via migration diff, not just code review
- [ ] Super Admin can edit/add/disable triage-phase HIV/TB questions via the existing platform-admin Questionnaire UI, and changes appear on the triage form after publish — same versioning behavior already built (new version + auto re-point), no special-casing for triage phase
