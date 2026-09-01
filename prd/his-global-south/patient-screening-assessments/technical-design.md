# Technical Design: Patient Screening Assessments (plug-and-play) — v1.0

| **Ticket** | [ticket.md](./ticket.md) | **PHI note** | ADR 0004 — audit, no PHI in log body |

---

## 1. Problem framing

Two requirements, not one:
1. Render HIV + TB screening forms in patient registration now, with conditional show/hide and early-discontinue-on-answer logic.
2. Be able to attach the *same* (or a future) assessment to a different phase (intake, triage, later an ANC contact) without rebuilding form code — a data change, not a code change.

Requirement 2 rules out hardcoded per-form React components and fixed DB columns per question. The design below is a generic, versioned questionnaire engine; HIV and TB screening are its first two seeded definitions, not special-cased code paths.

---

## 2. Data model

Three tables, one new backend module (`screening`).

### `assessment_definitions`
The question schema itself, versioned so historical responses stay interpretable if a form is edited later.

```sql
CREATE TABLE IF NOT EXISTS public.assessment_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,                 -- 'hiv_risk_screening', 'tb_symptom_screening'
  version int NOT NULL DEFAULT 1,
  title text NOT NULL,
  questions jsonb NOT NULL,           -- see §3 shape
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code, version)
);
```

### `assessment_phase_assignments`
Decouples "which assessment" from "which page" — the actual plug-and-play mechanism (see ticket §"How assignment works" from conversation).

```sql
CREATE TABLE IF NOT EXISTS public.assessment_phase_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id uuid NOT NULL REFERENCES public.assessment_definitions(id) ON DELETE CASCADE,
  phase text NOT NULL
    CHECK (phase IN ('registration','intake','triage','encounter')),
  organization_id uuid NULL REFERENCES public.organizations(id) ON DELETE CASCADE,  -- NULL = platform default
  required boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_assessment_phase_assignments_phase
  ON public.assessment_phase_assignments (phase, organization_id, active);
```

`phase` enum starts with the four values needed now/soon; extend the CHECK constraint (new migration) when a genuinely new mount point (e.g. `anc_contact`) gets wired — see §6 boundary note.

**Resolution rule** (platform default vs. org override): for a given `(phase, organization_id)`, prefer rows with `organization_id = :org`; if none exist, fall back to rows with `organization_id IS NULL`. Implemented as two queries or one `UNION`/`DISTINCT ON` in the service layer — not a stored procedure.

### `assessment_responses`
```sql
CREATE TABLE IF NOT EXISTS public.assessment_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  visit_id uuid NULL REFERENCES public.visits(id) ON DELETE SET NULL,
  phase text NOT NULL,
  definition_id uuid NOT NULL REFERENCES public.assessment_definitions(id),
  definition_version int NOT NULL,       -- pinned at submit time
  answers jsonb NOT NULL,                -- { questionId: value, ... }
  discontinued_at timestamptz NULL,
  discontinue_reason text NULL,          -- e.g. 'hiv_status = POSITIVE'
  answered_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  answered_by_role text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_assessment_responses_patient
  ON public.assessment_responses (organization_id, patient_id, created_at DESC);
```

`COMMENT ON TABLE/COLUMN` for all three tables required in the migration per `schema-comments.mdc` — omitted here for brevity, not omitted in the actual migration file.

---

## 3. `questions` JSONB shape

```json
[
  {
    "id": "interested_in_hiv",
    "label": "Interested in HIV",
    "type": "boolean",
    "options": ["YES", "NO"]
  },
  {
    "id": "hiv_status",
    "label": "What is your HIV status?",
    "type": "single_choice",
    "options": ["POSITIVE", "NEGATIVE", "UNKNOWN"],
    "showIf": { "questionId": "interested_in_hiv", "equals": "YES" },
    "discontinueIf": { "equals": "POSITIVE" }
  }
]
```

- `showIf` — evaluated against `answers` collected so far; question hidden until satisfied.
- `discontinueIf` — evaluated against *this* question's own answer; when true, stop rendering remaining questions and set `discontinued_at` / `discontinue_reason` on submit.
- Both are single-condition only for v1 (no AND/OR trees) — sufficient for both seeded forms; extend only when a real form needs it.

Full seeded `questions` arrays for `hiv_risk_screening` and `tb_symptom_screening` (transcribed from the source screenshots) go in the seed migration, not duplicated here.

---

## 4. API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/screening/assignments?phase=registration` | Resolved list (org override → platform default) of `{ definitionId, code, title, questions, required, sortOrder }` for the caller's org |
| GET | `/api/screening/responses?patientId=&phase=` | Existing responses (for re-entry/edit, and to skip already-completed required assessments) |
| POST | `/api/screening/responses` | `{ patientId, visitId?, phase, definitionId, definitionVersion, answers, discontinuedAt?, discontinueReason? }` |
| GET | `/api/screening/responses/completion?patientId=&phase=` | `{ complete: boolean, missing: string[] }` — for `required` assignments, whether all have a response yet |

**Required-blocking is enforced server-side, not just in the UI.** `PatientRegister`'s final "complete registration" call checks `completion.complete` before allowing submit; a client that bypasses the UI still can't complete registration without required responses, since the registration-completion endpoint itself checks the same completion state.

**Auth — resolved (2026-08-24):** role gate is *phase-derived*, not one fixed set for the whole module — whoever already has access to a phase's own workflow gets access to the screening submissions attached to that phase. Reuses this repo's existing role-set constants (`backend/src/middleware/require-roles.ts`) rather than inventing a new one:

| `phase` | Role gate | Rationale |
|---------|-----------|-----------|
| `registration` | `FRONTDESK_ROLES` (`CLINICAL_ROLES ∪ receptionist ∪ biller`) | Registration is a frontdesk workflow — same team that owns `POST /api/frontdesk/patients` |
| `intake` | `FRONTDESK_ROLES` | Same team as `frontdesk/intake` today |
| `triage` | `CLINICAL_ROLES` | Triage vitals are clinical-credentialed today (matches `CREDENTIALED_CLINICAL_ROLE_SET`) |
| `encounter` | `CLINICAL_ROLES` | Matches existing (unenforced today, but conceptually) `clinical/encounters` ownership |

Implementation: `responses.controller.ts` maps `req.body.phase` → the corresponding role Set and calls `requireAnyRole(rolesForPhase(phase))` before the service write — a small lookup, not a per-phase route duplication. `definitions`/`assignments` GET stays `withOrgAuth` only (read access, no PHI written).

Response bodies: snake_case per repo-wide API boundary contract; frontend consumes via existing `keysToCamel` transform, no per-component mapper.

---

## 5. Backend module layout

```text
backend/src/modules/screening/
├── index.ts                      # fp plugin
├── screening.constants.ts        # SCREENING_API_BASE = '/api/screening'; PHASE enum
├── screening.routes.ts           # aggregator
├── definitions/
│   ├── definitions.routes.ts     # GET /assignments (resolves definitions for phase+org)
│   └── definitions.service.ts
├── responses/
│   ├── responses.routes.ts / .controller.ts / .service.ts / .schema.ts
│   └── (emits into patient_audit_log on submit — see §6)
└── pgschema/
    ├── assessment-definitions.pgschema.ts
    ├── assessment-phase-assignments.pgschema.ts
    └── assessment-responses.pgschema.ts
```

Registered in `build-app.ts` alongside the other domain plugins, same as every other module (`await fastify.register(screeningPlugin)`).

---

## 6. PHI audit

On `POST /responses`, insert into existing `patient_audit_log` (`backend/src/modules/patient/pgschema/patient-audit-log.pgschema.ts`):
- `action` — new allowed value `'screening_submit'`, requires a migration altering the `patient_audit_log_action_check` constraint.
- `changes` — metadata only (`{ definitionCode, phase, discontinued }`), **never** the actual `answers` payload (ADR 0004: no PHI in log body).

---

## 7. Frontend

```text
src/components/screening/
├── DynamicAssessment.tsx      # renders one definition: loops questions, evaluates showIf/discontinueIf, submits
└── useScreeningAssignments.ts # TanStack Query hook — GET /api/screening/assignments?phase=

src/pages/patients/PatientRegister.tsx  (existing page)
  → mounts <ScreeningAssessments phase="registration" patientId={id} /> once, which
    fetches assignments for phase="registration" and renders one <DynamicAssessment /> per row
```

`ScreeningAssessments` is the reusable "mount point" — the same component, given a different `phase` prop, is what makes intake/triage adoption a page-level one-liner rather than new form code.

---

## 8. Open questions for approval

1. ~~Role gate on submit~~ — **Resolved 2026-08-24**, see §4 phase→role table.
2. ~~`required = true` blocking behavior~~ — **Resolved 2026-08-24: blocking.** An unanswered `required` assessment blocks registration completion (`PatientRegister` submit disabled / rejected server-side until all required-for-this-phase responses exist), not just a warning.
3. ~~Phase enum scope for v1~~ — **Resolved 2026-08-24: ship all four now** (`registration`, `intake`, `triage`, `encounter`). Zero extra cost to list all four in the CHECK constraint today; avoids a follow-up migration when intake/triage get their own mount points later. Only `registration` gets a wired frontend mount point in slice 2 — the other three are schema-ready, not UI-ready.

---

## Approval
- [x] Product — acceptance criteria match management's ask (HIV + TB at registration, reusable elsewhere)
- [x] Tech — schema, module boundary, and audit approach respected; no scope creep
- [x] **Approved by:** Rahul Ranjan
- [x] **Date:** 2026-08-24

**Agent rule:** Do not implement slice 1 until this box is checked and open questions in §8 are answered.

## Slice 1 — implemented (2026-08-24)

Built directly on `feat/platform-admin-hospitals` (not a fresh branch — see status.yaml note). Delivered:
- Migration `backend/src/db/migrations/006_screening_assessments.sql` — 3 tables, full `COMMENT ON` metadata, `patient_audit_log` action-check extended, both definitions + registration-phase assignments seeded.
- `backend/src/modules/screening/` — full layered module (definitions read side, responses write side with phase-derived role gate, JSON-schema request validation), registered in `build-app.ts`.
- `patient_audit_log` emission on every response submit (metadata only, per ADR 0004).
- `npx tsc --noEmit` and `npx eslint` both clean on all new/touched files.

## Slice 3 — implemented (2026-08-25)

12 new tests, all passing, on top of the real-DB verification from slice 1/2:

- `backend/.../definitions/__tests__/definitions.service.test.ts` (3 tests) — the org-override → platform-default resolution itself: org-specific assignment wins with only one query fired; falls back to the platform default when the org has none; empty when neither exists. This is the actual "plug and play" mechanism, so it's the one most worth locking down.
- `backend/.../responses/__tests__/responses.service.test.ts` (5 tests) — `createResponse` validation + insert; and critically, asserts the `patient_audit_log` row's `changes` column never contains the PHI answer values (only `{ phase, definition_id, discontinued }`), per ADR 0004. `getCompletion` covers: no-required-assignments short-circuit (no query fired), a required assessment reported missing with no response yet, and complete once answered.
- `src/components/screening/__tests__/DynamicAssessment.test.tsx` (4 tests) — the `showIf`/`discontinueIf` engine itself, using a synthetic 3-question definition (not the real seeded HIV/TB content, so the test targets the generic engine, not one form): gate-question-only initial render, an answer that doesn't satisfy any `showIf` submits immediately with just that answer, a `discontinueIf` match shows the discontinue notice and allows submit without the remaining question, and the submit button stays disabled until every currently-visible question is answered.

`npx tsc --noEmit` and `npx eslint` clean on both sides. All three slices in this feature are now implemented — remaining gap is still the manual browser click-through (noted in slice 2).

## Bugfix — 2026-08-25 (found during manual browser testing)

`createResponseHandler` passed `req.auth.user.id` (Better Auth's own session-user id — a non-uuid string) into the param written to `assessment_responses.answered_by` and `patient_audit_log.user_id`, both `uuid` FKs to `profiles.id`. Real-DB submit failed with `invalid input syntax for type uuid`. Fixed to `req.auth.profile.id`, matching the convention already used everywhere else in this codebase (`patients.controller.ts`). Commit `eee1d35`.

**Not caught by the unit tests from slice 3** — they mock `db` at the service layer, so any string id passes type-wise; only a real Postgres write (or an integration test against the live route) surfaces this class of bug. Worth remembering for any future PHI-adjacent write path in this module: unit tests here verify logic, not wire-level correctness of IDs crossing the controller → service boundary.

## Slice 4 — Platform-admin management UI (2026-08-25)

New requirement from the user: platform_admin should be able to create assessments and assign them to hospitals/phases through the UI, not just via migration. Scoped and built as an extension of this same feature rather than a separate PRD.

**Scope decision — no in-place editing of an existing definition.** `assessment_responses.definition_version` is pinned at submit time specifically so historical answers stay interpretable if a definition's questions change later. Bumping `version` in place without also re-pointing every `assessment_phase_assignments` row that references the old id would silently drop the assessment from phase resolution (`resolveAssignmentsForPhase` filters on `assessment_definitions.active`). Building that re-pointing flow wasn't asked for, so v1 only supports: **create** a new definition (unique `code`, always version 1) and **toggle active/inactive**. Changing an existing definition's questions stays a migration, same as it is today.

**Auth pattern** — matches this codebase's existing convention for platform-wide (non-org-scoped) admin actions (`platform/org/org.service.ts`'s `createOrganization`): role check happens in the **service layer** via `assertPlatformAdmin(userId)`, called with `req.auth.user.id` (Better Auth id — `user_roles.user_id` is text, not the `profiles.id` uuid used elsewhere in this module). Routes stay on plain `withOrgAuth`, no route-level role Set.

**Backend — new endpoints** (all platform_admin-gated except the existing `/assignments` read):
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/screening/definitions` | List all assessment definitions (admin) |
| POST | `/api/screening/definitions` | Create a new definition |
| PATCH | `/api/screening/definitions/:id` | Toggle active |
| GET | `/api/screening/phase-assignments` | List all assignments, joined with definition + hospital name |
| POST | `/api/screening/phase-assignments` | Assign a definition to a phase — `organization_id: null` = platform-wide, set = one hospital's override |
| PATCH \| DELETE | `/api/screening/phase-assignments/:id` | Toggle active / remove |

New module: `backend/src/modules/screening/assignments/` (mirrors `definitions/`'s layered pattern).

**Frontend** — `src/platform/pages/screening/` (mirrors the existing `src/platform/pages/hospitals/` admin area exactly — same file layout, same `useToast`/`showApiErrorToast` conventions, reuses `useHospitalsList` for the hospital picker):
- `index.tsx` — definitions table (active toggle) + an "assign to workflow" form (assessment / phase / hospital-or-all / required) + assignments table (active toggle, delete)
- `new.tsx` + `QuestionBuilder.tsx` — the guided question-authoring UI (user's explicit choice over a raw-JSON textarea): add/reorder/delete question rows, type dropdown drives available fields (options list for choice types), `showIf` only offers *earlier* rows as targets (prevents forward references), `discontinueIf` only offered on choice-type questions. Produces the exact same `questions` JSON shape `DynamicAssessment` already renders — no new backend shape.
- Nav: new "Screening" sidebar entry next to "Hospitals", same `requiresPlatformAdmin` gate.

**Verified live**: rebuilt nothing new needed (no schema change — `db:migrate` not re-run), confirmed via the running api container's hot-reload + live OpenAPI spec that all 4 new route paths registered, confirmed 401 on unauthenticated call. `npx tsc --noEmit` and `npx eslint` clean on every new/touched file, both sides.

**Test credentials for this feature specifically**: `platform@flowmd.ai` / `FlowMD2026!` is the only seeded account with the `platform_admin` role (`admin@flowmd.ai` is `super_admin`, which is a different, org-scoped role and will get 403 on these endpoints).

**Known gaps, not yet done**: no unit/integration tests for the new admin endpoints or the QuestionBuilder component (this slice hasn't gone through a test pass like slices 1-3 did); no audit trail of who created/changed a definition or assignment.

## Slice 5 — Doctor/nurse visibility at encounter/intake (2026-08-25)

User's follow-up: the registration-time answers were readable via API by anyone in the org, and had no UI anywhere. Asked for: doctor sees it at encounter, nurse sees it at intake, restricted to those roles.

**Real finding surfaced before building this**: there is a *separate, pre-existing* "TB Symptom Screening" panel (`src/components/consultation/TBScreening.tsx`, hardcoded `TB_SCREENING_ITEMS` in `src/data/clinicalConstants.ts` — Cough >2wks / night sweats / weight loss / haemoptysis / TB contact, with a Low/Medium/High risk score) already shown in both `NurseIntakeDialog` and the consultation workspace's Intake tab. It is functionally and structurally unrelated to the new generic-engine `tb_symptom_screening` definition (different questions, no scoring, different storage — `assessment_responses` vs whatever the intake/encounter record uses). User's call: **keep both, label the new one clearly** ("Registration Screening") rather than merge or replace.

**Backend — read access narrowed, not just gated:**
- New `SCREENING_VIEW_ROLES` (`screening.constants.ts`): `super_admin, admin, provider_admin, doctor, nurse, nurse_practitioner, physician_assistant, clinician` — deliberately narrower than who can *submit* (`PHASE_ROLES`, which includes `receptionist` for registration).
- `GET /api/screening/responses` now requires `requireAnyRole(SCREENING_VIEW_ROLES)`. **`GET /api/screening/responses/completion` stays unrestricted** (`withOrgAuth` only) — it only returns booleans + assessment codes, no PHI, and frontdesk staff need it during their own registration flow to see the Finish button unblock.
- `listResponses` now joins `assessment_definitions` (for question labels/title) and `profiles` (for who recorded it) — a raw `{questionId: value}` map is meaningless without the question text, and the frontend shouldn't need a second round-trip to render it.

**Frontend — `ScreeningResponsesSummary.tsx`** (`src/components/screening/`): read-only, fails quiet (renders nothing) on a 403 or empty result rather than showing an alarming error box — a role outside `SCREENING_VIEW_ROLES` simply doesn't see the section, no broken-looking UI. Mounted in two places:
- **Doctor** — `pages/consultationWorkspace/components/tabs/IntakeTab.tsx`, right below the existing `IntakeVitalsSummary` (same tab the nurse's vitals already show up in for the doctor). `patientId` threaded from `encounter.patientId` in `consultationWorkspace/index.tsx`.
- **Nurse** — `components/encounters/NurseIntakeDialog.tsx`, immediately after the existing (unrelated) TB Symptom Screening block, clearly separated and re-labeled "Registration Screening" so the two don't read as the same thing.

**Verified live**: signed in as `admin@flowmd.ai` (super_admin, in `SCREENING_VIEW_ROLES`) and called `GET /api/screening/responses` directly — confirmed the joined response returns full question labels and answers correctly. Both containers' hot-reload logs show no errors. `tsc --noEmit` and `eslint` clean on every touched file across both backend and frontend.

**Not done**: no automated tests for the role restriction or the new join; no verification yet that a role *outside* `SCREENING_VIEW_ROLES` (e.g. receptionist) actually gets a clean 403/empty-section experience rather than an error state — only the positive (allowed) path was checked live.

**Also fixed in this pass** (dev-DB gap, not a code bug): no `nurse`-role account existed in the seed data at all — nurse-side testing was never actually possible before this. Added `nurse` as an additional role on the existing `debug@flowmd.ai` test account (alongside its existing `receptionist` role) via direct SQL, matching the existing `user_roles` shape. Verified both `dr.rishisen@gmail.com` (doctor) and `debug@flowmd.ai` (nurse) can now fetch `GET /api/screening/responses` end-to-end via real sign-in + real session cookie, not just the earlier super_admin check.

**Also fixed**: `ScreeningAssessments.tsx`'s "Finish" gating and `AppSidebar.tsx`'s active-link highlighting — see commits `17ca3c9` and `d49b37d`; both were real bugs surfaced by the user's own testing, not backend issues (backend was independently verified correct for both before either fix).

## Slice 6 — Edit an existing definition (2026-08-25)

User's follow-up: v1 deliberately shipped without editing (see the rationale at the top of `definitions.service.ts`'s admin-management section) because bumping `version` in place without re-pointing `assessment_phase_assignments` would silently drop the assessment from phase resolution. That gap is now closed properly rather than left as a permanent limitation.

**`editDefinition(userId, id, body)`** — in one transaction:
1. Insert a new `assessment_definitions` row: same `code`, `version = old.version + 1`, new `title`/`questions`, `active = true`.
2. `UPDATE assessment_phase_assignments SET definition_id = <new id> WHERE definition_id = <old id>` — every assignment (any phase, any hospital override, any required/sort_order setting) automatically follows the edit. This is the re-pointing step that was missing before.
3. Mark the old definition row `active = false` — it stays in the table (not deleted), so `assessment_responses` rows already pinned to its `definition_id`/`definition_version` keep resolving to the exact question text a patient was actually asked, forever.

New endpoint: `PUT /api/screening/definitions/:id` (deliberately PUT, not PATCH — this replaces content via a new version, a materially different operation from the existing PATCH active-toggle). Same `assertPlatformAdmin` gate as the rest of this admin surface.

**Frontend**: `src/platform/pages/screening/edit.tsx` — loads the existing definition (found client-side from the already-fetched list, no new GET-by-id endpoint needed), reuses `QuestionBuilder` pre-seeded with current title/questions, submits via `PUT`. An inline alert makes the versioning behavior explicit to the admin before they save ("existing patient responses keep showing exactly what they were asked; every assignment follows automatically"). "Edit" link added to the definitions table in `index.tsx`.

**Verified live end-to-end**, not just typechecked: created a throwaway test definition + a `triage`-phase assignment pointing at it via the real API, edited it via `PUT`, confirmed the assignment's `definition_id` and joined `definition_title` updated to the new version automatically, confirmed the old version row survived in the table with `active = false` (not deleted). Cleaned up the test data afterward — no changes to the real HIV/TB demo content. `tsc --noEmit` and `eslint` clean on every file, both sides.

**Not done**: no automated test for `editDefinition`'s transaction (the re-pointing + old-row-deactivation behavior specifically) — same gap as the rest of slices 4-6, still owed from the "ok do the testing" ask that got interrupted by bug-fixing.

## Slice 2 — implemented (2026-08-25)

- `src/components/screening/DynamicAssessment.tsx` — renders one definition generically (showIf/discontinueIf evaluated against answers-so-far, submits via `useSubmitScreeningResponse`).
- `src/components/screening/ScreeningAssessments.tsx` — the phase mount point: fetches resolved assignments + completion state, renders one `DynamicAssessment` per unanswered required assignment, shows "recorded" for already-answered ones.
- `src/services/screening.service.ts`, `src/hooks/queries/useScreening.ts`, `src/lib/queryKeys.ts` (`screening` section), `src/constants/screening.ts` (`SCREENING_PHASE`, mirrors backend `PHASE`).
- `PatientRegister.tsx` gained a **4th step**: the wizard's original "Complete Registration" (step 3) button is now "Continue to Screening" — patient is still created/completed on that submit, but instead of navigating away immediately, the flow advances to a new step 4 rendering `<ScreeningAssessments phase="registration" patientId={...} />`. A "Finish" button (disabled until `useScreeningCompletion` reports `complete: true`) does the actual navigation to the patient detail page — this is where required-blocks-completion (open question #2) is enforced on the frontend, backed by the server-side completion check.
- Verified against the real dev stack (not just typecheck): rebuilt + started the `api` container, ran `db:migrate` (only `006_screening_assessments.sql` applied, everything else already current), confirmed both seeded definitions + registration-phase assignments in Postgres directly, confirmed all 3 `/api/screening/*` routes live via the running OpenAPI spec (401 unauthenticated, as expected — auth middleware runs before phase validation). `npx tsc --noEmit` and `npx eslint` clean on both slices. Frontend container picked up `PatientRegister.tsx` via HMR with no errors in logs.
- **Not verified**: an actual browser click-through of the 4-step registration flow — no browser automation tool was available in this session. Recommend a manual pass through Steps 1-4 (including the discontinue-on-HIV-positive path) before considering this feature done.
