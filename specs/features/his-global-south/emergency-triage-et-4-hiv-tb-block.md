# ET-4 — HIV/TB block (screening engine reuse at the triage phase)

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `emergency-triage` |
| **Slice** | ET-4 |
| **Branch** | `feat/emergency-triage` |
| **Goal** | HIV/TB questions render inside the Emergency Triage form (full-form mode only), sourced from the existing screening engine — zero new storage, `ed_nurse` can submit, `ed_doctor` can view |
| **Depends on** | ET-3 (implemented) |
| **PRD** | [prd.md](../../../prd/his-global-south/emergency-triage/prd.md) §9.4, AC-12, AC-15 |
| **Technical design** | [technical-design.md](../../../prd/his-global-south/emergency-triage/technical-design.md) §4 |
| **Slice spec** | [slice-4.md](../../../prd/his-global-south/emergency-triage/slices/slice-4.md) |
| **Status** | Planned — Approval empty |

---

## Approval

- [x] Product: matches PRD AC-12 (renders from existing published Questionnaire) and AC-15 (no new questionnaire/config table)
- [x] Tech: reuses `assessment_definitions`/`assessment_phase_assignments`/`assessment_responses` exactly as-is — no schema change
- [x] Scope: no changes to registration/intake phase behavior; this only adds a `triage` phase assignment

**Approved by:** Rahul Ranjan
**Date:** 2026-08-26

**Agent rule:** Do not implement until all boxes are checked and approver name is filled.

---

## What this slice actually is (smaller than it sounds)

Verified directly against the schema: `assessment_definitions` already has both `hiv_risk_screening` (v1) and `tb_symptom_screening` (v1) from migration `006_screening_assessments.sql`. **The same definition can be assigned to multiple phases** via separate `assessment_phase_assignments` rows — one phase per row, same `definition_id`. This slice does not create new questions or new definitions; it adds two new assignment rows pointing the existing definitions at `phase='triage'`, and extends two role sets so the new ED roles can use them. That's the entire scope.

---

## Previous slices / current code (verified facts)

- `PHASE.TRIAGE` (backend `screening.constants.ts`) and `SCREENING_PHASE.TRIAGE` (frontend `constants/screening.ts`) already exist — no enum change needed either side.
- `PHASE_ROLES[PHASE.TRIAGE]` currently = `CLINICAL_ROLES` (doctor/nurse/etc., no `ed_nurse`/`ed_doctor`). **Do not add `ed_nurse`/`ed_doctor` directly to `CLINICAL_ROLES`** — that Set is spread into `LAB_ROLES`/`RADIOLOGY_ROLES`/`PHARMACY_ROLES` too (`require-roles.ts`), so touching it would silently grant the new roles lab/radiology/pharmacy access as a side effect (exactly the kind of shared-constant ripple this session has hit twice already). Instead, mirror the existing `LAB_ROLES = new Set([...CLINICAL_ROLES, 'lab_tech'])` pattern: a new combined set scoped to just this phase.
- `SCREENING_VIEW_ROLES` (gates `GET /api/screening/responses`) is a flat `Set` of role strings, separate from `CLINICAL_ROLES` — needs `ed_doctor` added directly (it's not spread anywhere else, confirmed by grep, so a direct addition here is safe unlike `CLINICAL_ROLES`).
- `ScreeningAssessments` component (`src/components/screening/ScreeningAssessments.tsx`) — confirmed props: `{ phase: string, patientId: string, visitId?: string, onCompletionChange?: (complete: boolean) => void }`. Exact mount pattern already established in `NurseIntakeDialog.tsx` (line ~1001): `<ScreeningAssessments phase={SCREENING_PHASE.INTAKE} patientId={visit.patientId} visitId={visit.id} />` — mirror this exactly for triage.
- **`EmergencyTriageForm.tsx` (ET-3) does not currently receive `patientId`/`visitId` at all** — only `encounterId`. This slice needs to thread them through: `EmergencyTriageDialog` → `EmergencyTriageForm`, sourced from the `Encounter` object already available in `ErPendingList.tsx` (`selected.patientId`, and `selected.id` — the **visit** id, which is what `ScreeningAssessments`'s `visitId` prop expects, per the `NurseIntakeDialog` precedent of passing `visit.id`, not the encounter id. Do not confuse this with the `activeEncounterId` fix from the ET-2 correction — that one was specifically for the triage save API, this one is the visit id, which `enc.id` already correctly is).
- Screening submission is independent of the Emergency Triage save — `ScreeningAssessments` manages its own submit internally (per its existing design), it is not bundled into `EmergencyTriageForm`'s own save button. PRD §9.4 doesn't require triage save to block on HIV/TB completion, and slice-4.md doesn't ask for that either — don't invent a gate that isn't specified.

---

## Relevant files

### Modify

```text
backend/src/db/migrations/010_emergency_triage_hiv_tb_phase_assignment.sql   # new, 2 INSERT rows only — confirm next number
backend/src/modules/screening/screening.constants.ts                          # new combined role set for PHASE_ROLES[PHASE.TRIAGE]; add ed_doctor to SCREENING_VIEW_ROLES
src/components/encounters/EmergencyTriageDialog.tsx                           # thread patientId/visitId through
src/components/encounters/EmergencyTriageForm.tsx                             # accept patientId/visitId props, mount ScreeningAssessments
src/pages/encounters/components/ErPendingList.tsx                             # pass patientId/visitId to the dialog
```

### Reference only (do not rewrite)

```text
src/components/encounters/NurseIntakeDialog.tsx   # exact ScreeningAssessments mount pattern to mirror
backend/src/modules/screening/responses/responses.routes.ts   # role-gating idiom, unchanged by this slice
backend/src/db/migrations/006_screening_assessments.sql       # existing definitions this slice assigns to a new phase, not modifies
```

---

## Phases

### Phase A — Backend: phase assignment + role sets

1. List `backend/src/db/migrations/`, confirm next number (010 as of this plan's writing — this branch has had several contributors' worth of migrations, don't assume).
2. Migration — two `INSERT INTO assessment_phase_assignments` rows, platform-default (`organization_id = NULL`), mirroring the exact pattern migration `006` used for `registration`:
   ```sql
   INSERT INTO public.assessment_phase_assignments (definition_id, phase, organization_id, required, sort_order, active)
   SELECT id, 'triage', NULL, true, 1, true
   FROM public.assessment_definitions
   WHERE code = 'hiv_risk_screening' AND version = 1
   ON CONFLICT DO NOTHING;

   INSERT INTO public.assessment_phase_assignments (definition_id, phase, organization_id, required, sort_order, active)
   SELECT id, 'triage', NULL, true, 2, true
   FROM public.assessment_definitions
   WHERE code = 'tb_symptom_screening' AND version = 1
   ON CONFLICT DO NOTHING;
   ```
   No `COMMENT ON` needed — no schema/column change, this is data-only, and `assessment_phase_assignments`'s columns are already commented from migration 006.
3. `screening.constants.ts`:
   ```ts
   export const TRIAGE_PHASE_ROLES = new Set([...CLINICAL_ROLES, 'ed_nurse', 'ed_doctor']);
   ```
   Update `PHASE_ROLES[PHASE.TRIAGE]` to use `TRIAGE_PHASE_ROLES` instead of `CLINICAL_ROLES` directly.
   Add `'ed_doctor'` to `SCREENING_VIEW_ROLES`. Decide during implementation whether `ed_nurse` also needs read access to `SCREENING_VIEW_ROLES` (submission already works via `PHASE_ROLES`; read access is a separate, narrower gate per that Set's own doc comment) — PRD/slice-4.md only asked for `ed_doctor` view access, so default to doctor-only unless testing reveals `ed_nurse` needs to see what they just submitted (in which case `getEmergencyTriage`'s own response already round-trips it without needing the screening read endpoint).

### Phase B — Frontend: thread identifiers + mount

4. `EmergencyTriageDialog.tsx` — add `patientId: string` and `visitId: string` props, pass through to `EmergencyTriageForm`.
5. `EmergencyTriageForm.tsx` — accept `patientId`/`visitId` props. Mount `<ScreeningAssessments phase={SCREENING_PHASE.TRIAGE} patientId={patientId} visitId={visitId} />` in the full-form-mode section (alongside TEWS/Investigations, inside the `!resuscitationMode` block — BR-1 hides it in resuscitation mode per PRD §10).
6. `ErPendingList.tsx` — pass `patientId={selected.patientId}` and `visitId={selected.id}` to `EmergencyTriageDialog` (note: `selected.id` is the **visit** id here, correctly — do not swap this for `activeEncounterId`, that field is only for the triage save API).

### Phase C — Verify platform-admin UI needs no changes

7. Confirm (not build) that the platform-admin question builder (`src/platform/pages/screening/`) can already target `phase: 'triage'` when creating a new assignment — the phase enum/dropdown there should already be phase-agnostic since `PHASE_VALUES` already includes `'triage'`. If for some reason the UI hardcodes a phase allowlist narrower than `PHASE_VALUES`, that's a real gap to fix; check before assuming it's fine.

### Phase D — Tests

8. No new unit test file required — this slice doesn't add new business logic (the seed rows and role-set change are declarative). Verify via live checks (below) instead, consistent with how migration-only changes are validated elsewhere in this project.

---

## Testing strategy

| Layer | What |
|-------|------|
| Migration | Applies cleanly; `assessment_phase_assignments` has 2 new rows for `phase='triage'`, `organization_id IS NULL` |
| Manual/live | `ed_nurse` opens the triage dialog in full-form mode → HIV/TB questions render → answers submit → land in `assessment_responses` with `phase='triage'` |
| Manual/live | Resuscitation mode (any Emergency Sign YES) → HIV/TB block does not render |
| Manual/live | `ed_doctor` can read triage-phase responses; a plain `nurse`/`doctor` without `ed_doctor` cannot |
| Regression | Registration and intake phase HIV/TB behavior completely unaffected — this only adds rows, doesn't touch existing ones |

---

## Validation commands

```powershell
cd projects/his-global-south/backend
npx tsc --noEmit
npm run test -- src/modules/screening/

cd ../
npx tsc --noEmit -p tsconfig.json
```

Live verification via the running Docker stack: confirm the seeded assignment rows exist, submit a real triage-phase response through the actual service function, confirm it lands in `assessment_responses` correctly, clean up test data after.

---

## Acceptance criteria

| # | Criterion | How to verify |
|---|-----------|----------------|
| 1 | HIV/TB questions render in full-form mode | Live check |
| 2 | HIV/TB block hidden in resuscitation mode (BR-1) | Live check |
| 3 | `ed_nurse` can submit triage-phase responses | Live check against real `POST /api/screening/responses` with `phase=triage` |
| 4 | `ed_doctor` can view triage-phase responses; non-ED clinical roles unaffected either way | Live check |
| 5 | Zero new tables/columns (AC-15) | Migration diff review — data-only |
| 6 | Registration/intake phase behavior unchanged | Regression — no existing rows touched |

---

## Out of scope

- Any change to the HIV/TB question content itself — reuses the existing v1 definitions verbatim
- Platform-admin UI changes (Phase C is verification, not new work, unless a real gap is found)
- Gating Emergency Triage save on HIV/TB completion — not specified, don't add it
