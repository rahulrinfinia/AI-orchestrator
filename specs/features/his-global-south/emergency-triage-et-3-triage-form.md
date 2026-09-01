# ET-3 — Emergency Triage form + priority engine + save API + doctor gate

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `emergency-triage` |
| **Slice** | ET-3 |
| **Branch** | `feat/emergency-triage` |
| **Goal** | `ed_nurse` opens a pending ER encounter, fills the triage form, saves — priority is computed server-side, `triage_status` flips to complete, and the encounter moves from "ER — Pending Triage" to "ER — Triaged." A plain user can no longer bypass triage into the doctor's workspace. |
| **Depends on** | ET-1 (implemented), ET-2 (implemented) |
| **PRD** | [prd.md](../../../prd/his-global-south/emergency-triage/prd.md) §9, §10 (BR-1–BR-5), §12 |
| **Technical design** | [technical-design.md](../../../prd/his-global-south/emergency-triage/technical-design.md) §5.2/§5.3/§7/§8/§8.1/§8.2/§9 (§9 corrected 2026-08-26) |
| **Slice spec** | [slice-3.md](../../../prd/his-global-south/emergency-triage/slices/slice-3.md) (corrected 2026-08-26) |
| **Status** | Planned — Approval empty |

---

## Approval

- [x] Product: matches PRD AC-4, AC-6, AC-7, AC-8, AC-9 and BR-1 through BR-5
- [x] Tech: matches the corrected technical-design.md §9 — dialog pattern (`EmergencyTriageDialog`, mirroring `NurseIntakeDialog`), not a `ConsultationWorkspace` tab; includes the `EncounterList.tsx` bypass-button fix
- [x] Scope: HIV/TB (ET-4), alert fan-out (ET-5), order links (ET-6) are stubbed/deferred, not built here

**Approved by:** Rahul Ranjan
**Date:** 2026-08-26

**Agent rule:** Do not implement until all boxes are checked and approver name is filled.

---

## Course correction (read this first)

Two real findings from investigating this slice, both already folded into the corrected technical-design.md and slice-3.md:

1. **`ConsultationWorkspace` is doctor-only.** Its `CONSULTATION_STAGES` (`intake`/`subjective`/`objective`/`assessment`/`plan`) are entirely the doctor's SOAP note flow — "Intake" there is a *read-only* summary tab, not a write step. The nurse's actual write-step pattern in this codebase is a controlled dialog launched from the queue list (`NurseIntakeDialog.tsx`, wired via a "Start Intake" button in `EncounterList.tsx`, distinct from the row-click-to-consultation navigation). Emergency Triage is nurse-authored, so it must follow that same dialog pattern — not extend `ConsultationWorkspace`.
2. **Real BR-4 bypass, found by tracing the code, not hypothesized.** ET-1 correctly added `emergency` to `SERVICE_LINE_VISIT_TYPES` (needed so `createEncounter()` can run without requiring `intake_complete` first). But `EncounterList.tsx`'s existing "Start Consultation" button already treats *any* `checked_in` service-line-type encounter as ready to jump straight to `/consultation/:id` (the doctor's SOAP workspace) — it has no concept of Emergency Triage. Today, on this branch, a user could click "Start Consultation" on an emergency encounter from the generic **Waiting** or **All** tab and land in the doctor's workspace with zero triage ever performed. This slice must close that gap as part of BR-4.

---

## Architecture constraints (from technical-design.md, immutable for this slice)

| ID | Constraint | This slice |
|----|------------|------------|
| TD-4 | `hiv_tb_answers` is **not** a column — HIV/TB reuses the screening engine (ET-4's job to wire the actual questions; this slice just needs to *not* build the column and leave a mount point) | Data model Phase A |
| TD-5.2 | `triaged_by` uses `profiles.id`, not Better Auth `user.id` (same gotcha ET-1 already documented and avoided) | Backend Phase C |
| TD-8 | Priority computed **server-side only**, never trusts a client value | Backend Phase D |
| TD-8.1/8.2 | Ship the provisional SATS-based TEWS table + placeholder Urgent Signs list now, with a mandatory "Provisional" UI badge — do not wait for clinical sign-off, do not silently present it as final | Backend Phase D, Frontend Phase F |
| TD-9 (corrected) | Dialog pattern (`EmergencyTriageDialog`), not a `ConsultationWorkspace` tab; `EncounterList.tsx` bypass-button fix required | Frontend Phase E/G |

---

## Previous slices / current code (verified facts)

- ET-1 (implemented): `encounters` has `triage_status`, `triage_priority`, `triage_disposition`, `resuscitation_required`, `current_step`, `triaged_at`, `triaged_by`, `arrived_at`. `ed_nurse`/`ed_doctor` exist on `app_role`. `createEncounter()` already initializes these correctly for emergency encounters at creation time.
- ET-2 (implemented): `ErPendingList.tsx`/`ErTriagedList.tsx` exist, role-gated tabs work, `listVisits()` surfaces all 6 triage fields. `ErPendingList.tsx`'s row click currently does a bare `navigate('/consultation/${id}')` — this slice replaces that with opening `EmergencyTriageDialog`.
- `NurseIntakeDialog.tsx` (`src/components/encounters/NurseIntakeDialog.tsx`) is the concrete pattern to mirror: `{ open, onOpenChange, visit: Visit, onSuccess, dryRun? }` props, `useForm` + `zodResolver`, an `isResuming`/`existingIntake` load-on-open pattern (maps to PRD §9.2's "Saved Triage" dropdown / prior-snapshot load), a `dryRun` escape hatch for tests/demos.
- `EncounterList.tsx`'s row-action block (~line 243-293): `checked_in` + not-service-line → "Start Intake"; `checked_in` + service-line-type (now includes `emergency`, per ET-1) OR `intake_complete` → "Start Consultation" (calls `startClinicalEncounter()` = `POST /api/clinical/encounters` = `createEncounter()`, then navigates to `/consultation/:id`). This is the exact button needing the emergency-aware guard.
- `startClinicalEncounter()` (`src/services/encounters.service.ts` line 286) hits `POST /api/clinical/encounters`, which is `createEncounter()` — the same function ET-1 modified. It's idempotent (returns the existing encounter if one already exists for the visit) — safe to leave as-is; the fix is purely about *when the frontend offers to call it*, not the function itself.
- Screening engine module pattern to mirror for the new `emergencyTriage` module (`backend/src/modules/screening/responses/`): layered `.routes.ts`/`.controller.ts`/`.service.ts`/`.schema.ts`, and critically the **role-gating idiom**: `{ preHandler: [...withOrgAuth, requireAnyRole(ROLES_SET)] }` from `middleware/require-roles.ts` — no custom preHandler needed for this slice (screening needed a custom `requirePhaseRole` because role depends on a *body field*; ET-3's gating is fixed per-route, so plain `requireAnyRole` suffices).
- Clinical module registration pattern (`backend/src/modules/clinical/index.ts`): a flat list of `await xRoutes(fastify)` calls inside one `fp()`-wrapped plugin — new module follows the same one-line addition.
- Clinical pgschema aggregator (`backend/src/modules/clinical/pgschema/index.ts`): flat named exports, kebab-case filenames (`encounters.pgschema.ts`, `diagnostic-orders.pgschema.ts`) — new tables follow the same convention (`emergency-triage-records.pgschema.ts`, `emergency-triage-alerts.pgschema.ts`).
- Priority badge (`TriagePriorityBadge`, ET-2) and its color scheme already exist and are exported via the `@/modules/clinical` barrel — reuse as-is, don't redefine.
- `Badge` base component (`@/components/ui/badge.tsx`) — reuse for the "Provisional" indicator too, not a new component.

---

## Relevant files

### Modify

```text
backend/src/build-app.ts                                    # register emergencyTriage module if not auto-picked-up via clinical/index.ts
backend/src/modules/clinical/index.ts                        # await emergencyTriageRoutes(fastify)
backend/src/modules/clinical/pgschema/index.ts                # export new 2 tables
backend/src/db/schema/enums.ts                                 # (only if a new closed-set enum is needed beyond ET-1's; check before adding)
src/pages/encounters/components/ErPendingList.tsx              # row action -> open EmergencyTriageDialog instead of navigate
src/components/encounters/EncounterList.tsx                    # "Start Consultation" emergency-aware guard (BR-4 bypass fix)
src/modules/clinical/index.ts                                  # export new dialog/components through the barrel
```

### New

```text
backend/src/db/migrations/009_emergency_triage_records.sql            # confirm next number at implementation time
backend/src/modules/clinical/pgschema/emergency-triage-records.pgschema.ts
backend/src/modules/clinical/pgschema/emergency-triage-alerts.pgschema.ts
backend/src/modules/clinical/emergencyTriage/emergencyTriage.constants.ts   # roles, disposition codes (Appendix A), TEWS table + threshold (§8.1), Urgent Signs placeholder list (§8.2), Very Urgent Signs list (PRD §9.3, verbatim)
backend/src/modules/clinical/emergencyTriage/emergencyTriage.types.ts
backend/src/modules/clinical/emergencyTriage/emergencyTriage.schema.ts      # request/response JSON-schema
backend/src/modules/clinical/emergencyTriage/emergencyTriage.service.ts     # computeTriagePriority(), saveTriage(), getTriage()
backend/src/modules/clinical/emergencyTriage/emergencyTriage.controller.ts
backend/src/modules/clinical/emergencyTriage/emergencyTriage.routes.ts
backend/src/modules/clinical/emergencyTriage/__tests__/priorityEngine.test.ts   # table-driven BR-3 cases — the one piece of this slice that must be unit-tested, not just live-verified
src/pages/patients/... or src/components/encounters/EmergencyTriageDialog.tsx   # exact location TBD at implementation — mirror NurseIntakeDialog.tsx's location (src/components/encounters/)
src/components/encounters/EmergencyTriageForm.tsx                            # the actual form, rendered inside the dialog
src/services/emergencyTriage.service.ts                                      # getTriage/saveTriage API calls
src/hooks/queries/useEmergencyTriage.ts                                       # if this codebase's query-hook convention applies here (check CLAUDE.md: "Data fetching goes through TanStack Query hooks under src/hooks/queries/")
```

### Reference only (do not rewrite)

```text
src/components/encounters/NurseIntakeDialog.tsx     # the pattern to mirror exactly — props shape, load-on-open, dryRun escape hatch
backend/src/modules/screening/responses/*.ts         # layered module + role-gating idiom to mirror
backend/src/modules/screening/screening.constants.ts # PHASE.TRIAGE already exists — do not redefine, ET-4 wires it, this slice just leaves the mount point
src/components/encounters/TriagePriorityBadge.tsx    # reuse as-is (ET-2)
```

---

## Phases

### Phase A — Data model: new tables

1. Edit `emergency-triage-records.pgschema.ts` per technical-design.md §5.2 (the corrected version — **no `hiv_tb_answers` column**). Key columns: `id`, `encounter_id` (UUID UNIQUE FK → `encounters(id)` ON DELETE CASCADE), `organization_id` (FK → `organizations(id)` — this codebase's org-scoping convention, not "tenant_id" per technical-design.md's own correction of the PRD's literal wording), `facility_id` nullable, `template_code` default `'emergency_triage_adult'`, `chief_complaint` text, six emergency-sign booleans, `no_emergency_sign` boolean, `very_urgent_signs`/`urgent_signs` jsonb arrays, `no_very_urgent_sign`/`no_urgent_sign` booleans, TEWS input fields, `tews_score` integer nullable, `investigations` jsonb, `disposition` text not null, `priority` (reuse the `triage_priority` enum from ET-1 — same type, not a new one), `resuscitation_required` boolean, `created_by` FK → `profiles(id)`, `created_at`/`updated_at`.
2. Edit `emergency-triage-alerts.pgschema.ts` per technical-design.md §5.3, as specified (no changes from that section).
3. Run `npm run db:generate`, hand-curate into `009_...sql` (confirm actual next number), full `COMMENT ON` for every column per `schema-comments.mdc`.
4. Add both tables to `pgschema/index.ts`.

### Phase B — Backend constants

5. `emergencyTriage.constants.ts`:
   - `EMERGENCY_SIGNS` — the 6 fixed sign keys from PRD §9.3, in order
   - `VERY_URGENT_SIGNS` — all 23 items from PRD §9.3, verbatim (do not paraphrase — these are clinical discriminators)
   - `URGENT_SIGNS_PROVISIONAL` — the 8-item placeholder list from technical-design.md §8.2, clearly named/commented as provisional
   - `TEWS_SCORING_TABLE` and `TEWS_THRESHOLD_PROVISIONAL = 3` — from technical-design.md §8.1, as data (not hardcoded inline in the scoring function) so it's the single place to update post-sign-off
   - `DISPOSITION_CODES` — Appendix A, 8 codes + labels
   - `ED_NURSE_ROLES` / `ED_STAFF_ROLES` (nurse+doctor) role-set constants for route gating, mirroring `SCREENING_VIEW_ROLES`'s style

### Phase C — Backend service: priority engine + save/load

6. `computeTriagePriority()` — pure function per technical-design.md §8, straight-line `if` chain, first-match-wins BR-3. Takes emergency signs, very-urgent signs, urgent signs, TEWS score, threshold; returns `'P1' | 'P2' | 'P3' | 'P4'`.
7. `computeTewsScore()` — sums the 5 scored bands from `TEWS_SCORING_TABLE` (technical-design.md §8.1) against submitted vitals; returns null if insufficient inputs rather than guessing.
8. `saveEmergencyTriage(organizationId, profileId, encounterId, body)`:
   - Load the encounter, verify `organization_id` match and `encounter_type === 'emergency'` — 404/409 otherwise
   - Validate: all 6 Emergency Signs present, `disposition` present (schema-level, but double-check in service too since this gates a real clinical workflow)
   - Compute `tewsScore` then `priority` via the two functions above — never read a priority/TEWS value from the request body
   - Transaction: upsert `emergency_triage_records` (unique on `encounter_id` — insert or reject-if-exists, per BR-5 "locked after save," see step 11), update `encounters` (`triage_status='complete'`, `triage_priority`, `triage_disposition`, `resuscitation_required`, `current_step='doctor'`, `triaged_at=now()`, `triaged_by=profileId`)
   - If `priority === 'P1'`: insert one `emergency_triage_alerts` row (`alert_type='RESUSCITATION'`, `target_role='ed_doctor'`) in the same transaction — **do not** wire actual notification delivery here, that's ET-5; this slice only persists the row
9. `getEmergencyTriage(organizationId, encounterId)` — load existing record if present (PRD §9.2 "Saved Triage" dropdown / prior-snapshot), null if none yet.

### Phase D — Backend routes + schema

10. `emergencyTriage.schema.ts` — request body schema requiring all 6 emergency-sign booleans + `disposition`; response schema.
11. `emergencyTriage.routes.ts`, mirroring the screening `responses.routes.ts` idiom exactly:
    ```ts
    fastify.get(`/api/clinical/encounters/:id/emergency-triage`,
      { preHandler: [...withOrgAuth, requireAnyRole(ED_STAFF_ROLES)] }, getHandler);
    fastify.post(`/api/clinical/encounters/:id/emergency-triage`,
      { preHandler: [...withOrgAuth, requireAnyRole(ED_NURSE_ROLES)], schema: { body: saveBodySchema } }, saveHandler);
    ```
    **BR-5 (locked after save):** deliberately no PATCH/PUT route — if `saveEmergencyTriage` finds an existing record for the encounter, it returns a 409 rather than overwriting (don't silently no-op or silently overwrite either).
12. Register in `clinical/index.ts` (one line, matching the existing pattern exactly).

### Phase E — Frontend: dialog + form

13. `EmergencyTriageDialog.tsx` (`src/components/encounters/`) — controlled dialog mirroring `NurseIntakeDialog.tsx`: `{ open, onOpenChange, encounter, onSuccess }`. On open, call `getEmergencyTriage()`; if a record already exists, render it read-only (BR-5) instead of the editable form.
14. `EmergencyTriageForm.tsx` — the actual fields per PRD §9.3: Chief complaint (free text), Emergency Signs (6 YES/NO + "no emergency sign" checkbox that forces all 6 to NO), Very Urgent Signs (23-item checklist + "no very urgent sign"), Urgent Signs (provisional list + "no urgent sign"), TEWS number inputs + LMP date + Pain/Mobility/Trauma dropdowns, Investigations (free text: RBS/Urine/ECG/POCT/Others), Disposition (radio, `DISPOSITION_CODES`).
15. BR-1/BR-2 mode switching: `useForm` watch on the 6 emergency-sign fields; when any is YES, hide Very Urgent/Urgent/TEWS/Investigations/HIV-TB sections, show the red "Proceed for Resuscitation!" banner, force disposition + Orders links to remain visible (per PRD §10 BR-1's explicit exception list).
16. Save button posts via a new `src/services/emergencyTriage.service.ts` + `useEmergencyTriage.ts` query hook (mutation), matching this codebase's established data-fetching convention (TanStack Query hooks, not inline `useQuery`/literal `queryFn` — per CLAUDE.md).

### Phase F — Provisional-standard UI indicator

17. "Provisional — pending clinical review" badge (reuse `Badge` from `ui/badge.tsx`, `variant="outline"` with a warning-tone className) rendered next to the TEWS score display and above the Urgent Signs checklist — not removable by any user action, just a visible, permanent-until-code-change indicator per technical-design.md §8.1/§8.2's resolved decision.

### Phase G — Close the ET-2/BR-4 gaps

18. `ErPendingList.tsx` (ET-2): replace the row's `onClick={() => navigate('/consultation/${enc.id}')}` with opening `EmergencyTriageDialog` (local `useState` for the selected encounter, same controlled-dialog wiring pattern `index.tsx` already uses for `intakeEncounter`/`NurseIntakeDialog`).
19. `ErTriagedList.tsx` (ET-2): leave its row-click navigation to `/consultation/:id` as-is — that's correct now, since by the time an encounter is in this list, triage is genuinely complete and the doctor's workspace is the right destination.
20. `EncounterList.tsx`: in the "Start Consultation" button's condition (~line 269-270), add a guard — when `encounter.encounterType === 'emergency' && encounter.triageStatus !== 'complete'`, do not render "Start Consultation." Decide during implementation whether to render nothing (relying on `ed_nurse` using the ER tab instead) or a disabled/explanatory state — check with the plan's Testing strategy before over-building this; the PRD doesn't specify UI for this exact case, only that the bypass must not exist.

### Phase H — Tests

21. `priorityEngine.test.ts` — table-driven, all four BR-3 branches plus edge cases (no TEWS score yet, boundary threshold values, all-NO-everything).
22. Backend integration-style test for `saveEmergencyTriage()` covering: happy path, missing disposition rejected, missing emergency-sign rejected, second save on same encounter rejected (BR-5), P1 triggers alert-row insert, non-`ed_nurse` role rejected.
23. No new frontend test file required beyond live verification unless an existing dialog test (check for a `NurseIntakeDialog.test.tsx`) provides a template worth mirroring — decide during implementation.

---

## Testing strategy

| Layer | What |
|-------|------|
| Unit | `computeTriagePriority()` — all branches, isolated from DB/HTTP |
| Backend integration | Save happy path + all rejection cases + BR-5 lock + P1 alert-row insert |
| Manual/live | Full round-trip: create emergency encounter (mirrors ET-1's verification) → open triage dialog → fill form → save → confirm `triage_status='complete'`, `current_step='doctor'`, priority correct, encounter moved from ET-2's pending bucket to triaged bucket |
| Regression | `EncounterList.tsx`'s OPD "Start Consultation"/"Start Intake" flows unaffected — only the emergency branch gets new logic |

---

## Validation commands

```powershell
cd projects/his-global-south/backend
npm run db:generate
npx tsc --noEmit
npm run test -- src/modules/clinical/emergencyTriage/

cd ../
npx tsc --noEmit -p tsconfig.json
```

Live verification via the running Docker stack, same bar as ET-1/ET-2: real writes through the actual service functions, not just type-checking. Confirm the P1 alert row actually gets inserted (query it directly), confirm BR-5's second-save rejection with a real duplicate POST attempt.

---

## Acceptance criteria

See slice-3.md's full list (10 items, including the two new ones from the course correction). Key ones to highlight for this plan specifically:

| # | Criterion |
|---|-----------|
| 1 | BR-1/BR-2 mode switching renders correctly both ways |
| 2 | Priority computed correctly for all four BR-3 branches, server-side, unit-tested |
| 3 | Save validation rejects missing disposition / missing signs |
| 4 | BR-5 — second save on the same encounter is rejected, not silently overwritten |
| 5 | `EncounterList.tsx` bypass closed — verified from the Waiting/All tabs specifically, not just the ER tabs |
| 6 | "Provisional" badge visible on TEWS score and Urgent Signs |
| 7 | Doctor-gate role check — `ed_nurse` without `ed_doctor` cannot GET the summary meant for doctors (full summary endpoint is ET-5, but the base GET here should still be role-correct) |

---

## Out of scope

- HIV/TB section content (ET-4 wires it; this slice just doesn't build a competing storage column)
- Actual P1 notification delivery — SSE/event-bus fan-out (ET-5); this slice only writes the alert row
- Order deep links (ET-6)
- TEWS formula / Urgent Signs list final clinical values — provisional standard ships now per the resolved decision, real values are a tracked pre-go-live follow-up
