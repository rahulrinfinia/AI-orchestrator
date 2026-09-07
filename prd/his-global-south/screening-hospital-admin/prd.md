# PRD: Screening administration — move from Platform Admin to Hospital Super Admin

| Field | Value |
|-------|-------|
| **Project** | `his-global-south` |
| **Feature key** | `screening-hospital-admin` |
| **Product** | flowMD |
| **Module** | Screening (assessment definitions + phase assignments) |
| **Version** | 1.0 |
| **Status** | **Implemented** (2026-09-02) — see [technical-design.md](./technical-design.md) |
| **Author** | Product Engineering (drafted with Claude Code, from live codebase investigation) |
| **Depends on** | None (standalone access-model + schema change to an already-shipped module) |
| **Related** | [emergency-triage PRD](../emergency-triage/prd.md) §9.4 (HIV/TB block consumes this module's read path — unaffected by this change, see §12) |

---

## 1. Background & Problem

The Screening module (`assessment_definitions` + `assessment_phase_assignments`) lets an admin author question sets (e.g. HIV/TB screening, TB symptom checks) and assign them to a workflow phase (registration, intake, triage, emergency triage, encounter). Patient-facing consumption (`GET /api/screening/assignments`) already resolves per-hospital: a hospital's own assignment rows win, falling back to a platform-wide default (`organization_id IS NULL`) when the hospital hasn't configured its own.

**Today, only `platform_admin` can manage any of it** — both authoring question definitions and assigning them to a hospital's phase, via `/platform/screening` in the sidebar (gated `requiresPlatformAdmin`). Every service function (`definitions.service.ts`, `assignments.service.ts`) hard-checks `assertPlatformAdmin(userId)` with no path for a hospital to self-serve.

This is inconsistent with the module's own data model, which already has per-hospital override support built into `assessment_phase_assignments.organization_id`, and with the original **emergency-triage PRD** (§5), whose technical-design note explicitly resolved "Super Admin configures HIV/TB questions in existing Questionnaire" to the real `super_admin` role — i.e. hospital-level self-service was the original intent for this exact content. There is also an already-written but unused file, `backend/src/modules/screening/screeningAdminAuth.service.ts`, defining a hospital-scope actor that was never wired into the services — evidence this gap was already recognized mid-build.

**Problem statement:** a hospital cannot define or manage its own screening questions today. Every hospital either gets the shared platform-wide defaults or must go through a `platform_admin` (flowMD internal operator) to get anything hospital-specific configured — this does not scale as more hospitals onboard, and centralizes clinical-content decisions that should belong to each hospital.

---

## 2. Goals & Success Metrics

| Goal | Metric | Target |
|------|--------|--------|
| Hospital self-service | A hospital `super_admin` can create, edit, and assign their own screening questions without platform involvement | 100% of new screening-config requests handled hospital-side |
| Remove platform_admin from this workflow | No route, page, or backend authority remains for `platform_admin` over screening | 0 reachable paths |
| Tenant isolation | A hospital cannot see, edit, or assign another hospital's private question definitions | 0 cross-tenant reads/writes in tests |
| No regression for hospitals with no custom config | Platform-default (`organization_id IS NULL`) question sets keep resolving as fallback exactly as today | Existing patient-facing screening flows unaffected |
| No regression for in-flight consumers | `emergency-triage` ET-4 (HIV/TB block) read path continues to resolve correctly | CI green, no ET-4 behavior change |

---

## 3. Personas

| Persona | Role today | Change |
|---------|-----------|--------|
| **Hospital Super Admin** (`super_admin`) | No access to Screening | **New:** full CRUD over their own hospital's question definitions and phase assignments |
| **Platform Admin** (`platform_admin`) | Sole owner of all Screening admin (definitions + assignments, any hospital) | **Removed:** no Screening page, route, or backend authority remains |
| **Clinical staff** (nurse/doctor filling a screening form) | Reads resolved assignments for their phase via `GET /api/screening/assignments` | Unaffected — this read path and its resolution logic are unchanged |

---

## 4. User Workflows

### Workflow 1: Hospital admin authors a new question set

**Trigger:** Hospital wants a screening questionnaire not covered by the platform default.
**Persona:** Hospital Super Admin

1. Navigate to **Screening** (new sidebar entry, hospital-admin section — same place as Clinical Staff / Personnel / Payer Catalog).
2. Create a new definition: code, title, questions (reusing the existing `QuestionBuilder` UI).
3. Save — definition is created scoped to their own hospital (`organization_id` = their org, set server-side, never client-supplied).

### Workflow 2: Hospital admin assigns a question set to a phase

**Trigger:** A definition exists; hospital wants it to appear during e.g. Triage.
**Persona:** Hospital Super Admin

1. From the Screening admin list, pick a definition (their own, or a platform-default one) and a phase.
2. Set required/sort order, save.
3. Assignment is created scoped to their own hospital automatically — no hospital picker (there is only one, theirs).

### Workflow 3: Hospital with no custom configuration

**Trigger:** A hospital has never configured Screening.
**Persona:** Nurse (consumer, unaffected by this change)

1. Nurse opens a phase's screening form.
2. Backend resolves: no org-scoped assignment rows found for this hospital → falls back to `organization_id IS NULL` platform-default rows (unchanged logic, `resolveAssignmentsForPhase`).

### Workflow 4: Cross-tenant isolation (negative path)

**Trigger:** Hospital A's super_admin attempts to view/edit Hospital B's private definition or assignment (e.g. by guessing an id).
**Persona:** Hospital Super Admin (hospital A)

1. Request rejected — 403/404, no data leaked, no mutation applied.

---

## 5. User Stories

### US-1 — Hospital-scoped definition authoring (Must)

**As** a hospital Super Admin **I want** to create and edit my own screening question definitions **so that** my hospital isn't limited to platform-wide defaults.

**Acceptance:**
- [ ] `POST /api/screening/definitions` creates a definition with `organization_id` = caller's org, derived server-side (never trusts a client-supplied value)
- [ ] Duplicate-code check is scoped to `(code, organization_id)` — two hospitals may reuse the same code independently
- [ ] Editing (`PUT .../definitions/:id`) creates a new version and re-points assignments, exactly as today, but only when the existing row belongs to the caller's org
- [ ] Attempting to edit/deactivate a `NULL`-org (platform default) or another hospital's row → 403

### US-2 — Hospital-scoped phase assignment (Must)

**As** a hospital Super Admin **I want** to assign question sets to my hospital's workflow phases **so that** the right questions appear at the right step for my patients only.

**Acceptance:**
- [ ] `POST /api/screening/phase-assignments` always writes `organization_id` = caller's org; the request body carries no `organization_id` field for the caller to set
- [ ] The referenced `definition_id` must belong to the caller's org or be a `NULL`-org platform default — otherwise 403/404
- [ ] Patch/delete only succeed on the caller's own org's rows

### US-3 — Platform-default fallback preserved (Must)

**As** any hospital that hasn't configured Screening **I want** sensible default questions to still appear **so that** onboarding a new hospital doesn't leave screening phases empty.

**Acceptance:**
- [ ] Existing `assessment_definitions`/`assessment_phase_assignments` rows (pre-migration) resolve as `organization_id IS NULL` automatically — no data migration/backfill needed
- [ ] `resolveAssignmentsForPhase` (patient-facing read path) is unchanged and continues to fall back correctly
- [ ] These `NULL`-org rows are visible to hospital admins as read-only reference, not editable by them (no owner left to edit them via UI post-migration)

### US-4 — Platform Admin access fully removed (Must)

**As** the product owner **I want** no Screening authority left for `platform_admin` **so that** this becomes genuinely hospital-owned, not a dual-maintained surface.

**Acceptance:**
- [ ] `/platform/screening*` no longer resolves to the Screening admin UI (legacy redirect or 404, matching how other retired platform routes are handled)
- [ ] Sidebar "Screening" entry removed from the `requiresPlatformAdmin` section
- [ ] Backend `assertPlatformAdmin` path removed from `screeningAdminAuth.service.ts`, `definitions.service.ts`, `assignments.service.ts` — a `platform_admin`-only user gets 403 on every Screening admin endpoint

### US-5 — Tenant isolation (Must)

**As** a hospital **I want** assurance no other hospital can see or modify my screening content **so that** clinical configuration stays private per tenant.

**Acceptance:**
- [ ] Integration test: hospital A super_admin cannot list, read, edit, or delete hospital B's definitions or assignments
- [ ] Integration test: hospital A super_admin cannot create an assignment pointing at hospital B's private definition

### US-6 — Route-level guard added (Should)

**As** the product owner **I want** the relocated `/screening` route protected at the router level, not just by sidebar visibility **so that** it matches the existing pattern (`RequireRole` on `/payerCatalog`) rather than the current unguarded `/platform/screening`.

**Acceptance:**
- [ ] `/screening` wrapped in `<RequireRole role={SUPER_ADMIN}>`, consistent with `PayerCatalogPage`

---

## 6. Scope

### In scope (v1)
- Backend: actor-resolution rewrite (`screeningAdminAuth.service.ts`), org-scoping of `definitions.service.ts` and `assignments.service.ts`, schema migration adding `organization_id` to `assessment_definitions`
- Frontend: relocate Screening admin UI from `src/platform/pages/screening/` to a hospital-admin top-level route (`/screening`), sidebar entry move, remove the hospital-picker dropdown from the assignment-creation UI
- Response schema updates + backend/integration test updates for the new ownership model
- Legacy redirect from `/platform/screening*`

### Out of scope (v1)
- Any change to the patient-facing screening/assessment-taking UI or `resolveAssignmentsForPhase` resolution logic
- A UI for editing the platform-wide default (`NULL`-org) library — it becomes seed/migration-managed content, not admin-UI-managed, once Platform Admin access is removed
- Any change to `emergency-triage` ET-4 slice's own scope or timeline (it consumes this module's read path only; see §12)
- Bulk import/export of question definitions
- Definition sharing/cloning between hospitals

---

## 7. Data model changes

### `assessment_definitions` (extend existing table)

| Column | Type | Notes |
|--------|------|-------|
| `organization_id` | UUID, nullable, FK → `organizations(id) ON DELETE CASCADE` | **New.** `NULL` = platform-seeded shared default (read-only via UI going forward); non-null = that hospital's own content |

Unique constraint changes from `(code, version)` to `(organization_id, code, version)` so two hospitals can independently use the same question code.

All pre-existing rows get `organization_id = NULL` automatically (new nullable column default) — they become the platform-default fallback library with no data backfill required.

### `assessment_phase_assignments` (no schema change)

Already has `organization_id` (nullable). Behavior change is at the API/service layer only: the client can no longer supply this value — it is always derived server-side from the authenticated caller's own org.

---

## 8. API requirements

| Method | Endpoint | Role (was) | Role (new) | Change |
|--------|----------|-----------|-----------|--------|
| GET | `/api/screening/definitions` | `platform_admin` | `super_admin` | Scoped to caller's org + `NULL`-org rows |
| POST | `/api/screening/definitions` | `platform_admin` | `super_admin` | `organization_id` derived server-side |
| PATCH | `/api/screening/definitions/:id` | `platform_admin` | `super_admin` | Ownership check added |
| PUT | `/api/screening/definitions/:id` | `platform_admin` | `super_admin` | Ownership check added |
| GET | `/api/screening/phase-assignments` | `platform_admin` | `super_admin` | Scoped to caller's org + `NULL`-org rows |
| POST | `/api/screening/phase-assignments` | `platform_admin` | `super_admin` | `organization_id` removed from body, derived server-side; `definition_id` ownership validated |
| PATCH | `/api/screening/phase-assignments/:id` | `platform_admin` | `super_admin` | Ownership check added |
| DELETE | `/api/screening/phase-assignments/:id` | `platform_admin` | `super_admin` | Ownership check added |
| GET | `/api/screening/assignments` (patient-facing resolve) | any org member | any org member | **Unchanged** |

All routes already use `withOrgAuth`; no middleware change needed, only the service-layer actor check and query scoping.

---

## 9. Business rules

### BR-1 Actor resolution
Only a caller for whom `assertSuperAdmin(userId)` is true is a valid Screening admin actor. `platform_admin` is no longer a valid actor for any Screening admin endpoint.

### BR-2 Server-derived org scope
`organization_id` on every write is always `req.auth.organizationId` (from `withOrgAuth`), never a client-supplied value. Any `organization_id` present in a request body is ignored (or rejected with 400 — confirm at technical-design stage).

### BR-3 Ownership check on mutation
Any PATCH/PUT/DELETE must load the target row and verify `row.organization_id === caller.organizationId` before mutating. A `NULL`-org row or another org's row → 403.

### BR-4 Definition visibility
`GET` (list) returns the caller's own org rows plus `NULL`-org (platform default) rows, flagged so the UI can render the latter as read-only reference.

### BR-5 Cross-org assignment block
Creating an assignment against a `definition_id` that belongs to a different org (not `NULL`, not caller's own) is rejected.

### BR-6 Fallback resolution unchanged
`resolveAssignmentsForPhase` (patient-facing read) keeps its existing "org rows win, else `NULL`-org rows" behavior untouched by this PRD.

---

## 10. Edge cases

| Scenario | Expected |
|----------|----------|
| Hospital has zero custom definitions/assignments | Patient-facing phase resolution falls back to platform defaults, unchanged |
| Hospital admin tries to edit a platform-default (`NULL`-org) definition | 403 |
| Hospital admin tries to assign another hospital's private definition | 403/404 |
| Two hospitals create a definition with the same `code` | Both succeed independently (unique constraint now includes `organization_id`) |
| `platform_admin` calls any Screening admin endpoint | 403 |
| Old bookmarked `/platform/screening` link | Redirects (or 404s, matching existing retired-route precedent) to a valid destination |
| Definition created before this migration ships | Resolves as `organization_id = NULL`, i.e. platform default — no visible behavior change until a hospital overrides it |

---

## 11. Acceptance criteria

| ID | Criteria |
|----|----------|
| AC-1 | `super_admin` can create/edit/deactivate screening definitions scoped to their own hospital |
| AC-2 | `super_admin` can create/patch/delete phase assignments scoped to their own hospital, with no hospital picker in the UI |
| AC-3 | `platform_admin` receives 403 on every Screening admin endpoint; no Screening route/page reachable for them |
| AC-4 | Pre-existing definitions/assignments resolve as platform defaults (`organization_id IS NULL`) with zero data migration |
| AC-5 | A hospital cannot read, edit, or assign another hospital's private definitions (integration-tested) |
| AC-6 | `/screening` route is guarded server-side (`RequireRole`) in addition to sidebar visibility |
| AC-7 | `emergency-triage` ET-4's read path (`resolveAssignmentsForPhase`) is unaffected — verified by existing/extended tests |
| AC-8 | Legacy `/platform/screening*` links redirect or 404 per existing retired-route convention, not silently broken |

---

## 12. Integration points

| System | Integration |
|--------|-------------|
| `emergency-triage` ET-4 (HIV/TB block, hub-gated separately) | Consumes `GET /api/screening/assignments` only — read path unchanged by this PRD. Flag to confirm at technical-design stage that ET-4 doesn't also assume platform-admin-authored content ownership anywhere. |
| Platform Admin sidebar / `platformRoutes.tsx` | Screening entry and sub-route removed |
| Hospital Super Admin sidebar | New "Screening" entry added, same section as Clinical Staff / Personnel / Payer Catalog |
| `organizations` table | New FK reference from `assessment_definitions` |

---

## 13. Resolved decisions

| Decision | Answer |
|----------|--------|
| Platform Admin retains any Screening capability? | **No — full removal** (confirmed with product) |
| Definitions private per hospital or shared globally? | **Private per hospital**, via new `organization_id` column (confirmed with product) |
| How is `organization_id` set on writes? | **Always server-derived** from authenticated caller's org — never accepted from the client body |
| What happens to today's global definitions? | **Become the `organization_id = NULL` platform-default fallback library automatically** — no backfill |

---

## 14. Open items (before G1 sign-off)

| ID | Item | Owner | Default if unresolved |
|----|------|-------|------------------------|
| OI-1 | Reject vs silently ignore a client-supplied `organization_id` in the request body | Engineering | Reject with 400 (defensive, explicit) |
| OI-2 | Exact frontend file location — `src/pages/screening/` vs a new `src/modules/screening/` | Engineering | `src/pages/screening/` (matches `Personnel`/`PayerCatalog` precedent) |
| OI-3 | `/platform/screening*` — redirect target vs 404 | Product | Redirect to `/screening` if caller is `super_admin`, else `NotFoundPage` |
| OI-4 | Does any other module read `assessment_definitions` directly (bypassing `resolveAssignmentsForPhase`) and assume no `organization_id` column? | Engineering | Grep confirms before migration lands (technical-design stage) |

---

## 15. AI agent instruction

Build exactly per this PRD once approved. Do not:
- Leave any `platform_admin` path reachable for Screening (route, sidebar, or backend)
- Accept a client-supplied `organization_id` on write endpoints
- Backfill or mutate existing `assessment_definitions` rows during migration — the nullable-column default handles it
- Change `resolveAssignmentsForPhase` or any patient-facing screening consumption behavior
- Touch `emergency-triage` slice scope or files beyond confirming its read path still resolves correctly

> **Process note (hub):** this project runs a PRD-gate workflow. Do not implement until this PRD is approved (G1) and a `technical-design.md` (G2) is written and approved, per [AGENTS.md](../../../projects/his-global-south/AGENTS.md) and `.cursor/rules/his-implement-before-code.mdc` in the app repo.

---

## Approval

Plans and PRDs must include this block before implement phase.

- [x] Product — acceptance criteria match intent
- [x] Tech — architecture decisions (schema change, actor-resolution rewrite) respected; no scope creep
- [x] **Approved by:** Rahul Ranjan
- [x] **Date:** 2026-09-02

**Gate G1: APPROVED.** Proceeding to `technical-design.md` (G2).
