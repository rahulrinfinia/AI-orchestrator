# PR #51 — GitHub inline review comments (paste-ready)

**PR:** https://github.com/apeiro-care/his-global-south/pull/51  
**Head:** `d1058b3`  
**Verdict:** Request changes

Use **Add single comment** on the listed line in the Files changed tab, or paste the overall summary as the review body.

---

## Overall review summary (paste as review body)

Thanks for the MCH / Labour Care Guide work and the platform/screening/IPD integration — the module layout, migrations with `COMMENT ON`, and MCH patient org-scoping in the episode service are solid.

**Blocking before merge:**

1. **Response schemas** — MCH episodes/templates, platform org, screening (definitions/assignments/responses), and IPD admissions routes wire body/query only. Every route needs `schema.response` for success **and** error statuses the handler returns (see `backend/src/modules/frontdesk/patients/patients.routes.ts`).
2. **Screening PHI guard** — `createResponse` inserts without `assertPatientInOrg`; IPD and MCH already validate patient belongs to caller org.
3. **Params UUID format** — MCH GET routes (`:id`, `:patientId`) and template `:id` routes need `params` schemas with `format: 'uuid'`.

**Strongly recommended:** merge/rebase `feat/platform-admin-hospitals` (`13d7bfd`, `e381f9d`) — response schemas, UUID format, and screening patient guard are already done there for platform/screening/IPD.

**Non-blocking:** error envelope consistency, MCH integration tests, OpenAPI MCH tag, frontend constant mirrors, PR size.

---

## CRITICAL — inline comments

### 1. MCH episodes — response schemas + params UUID

**File:** `backend/src/modules/mch/episodes/episodes.routes.ts`  
**Line:** 24 (also applies to routes at 29, 30, 35, 40, 45)

**Comment:**

Every route here needs `schema.response` for the status codes the handler actually returns (201/200/404/409/422 as applicable), not body-only validation. GET routes at L29 and L45 also need `schema.params` with `format: 'uuid'` on `:id` and `:patientId`.

Define `*ResponseSchema` in `episodes.schema.ts` and wire them like `patients.routes.ts` (e.g. `response: { 201: createEpisodeResponseSchema, 404: notFoundErrorSchema }`). Without response schemas, Fastify serialization checks fail in integration tests and OpenAPI is incomplete.

---

### 2. MCH templates — response schemas

**File:** `backend/src/modules/mch/templates/templates.routes.ts`  
**Line:** 22

**Comment:**

All template routes (including this inline `GET .../templates/active` handler and list/create/patch/put/delete below) need `schema.response` for success and error bodies. PATCH/PUT/DELETE/GET `:id` routes also need `params` with UUID format.

Please extract response schemas to `templates.schema.ts` and wire `schema.response` on each route — same pattern as `backend/src/modules/frontdesk/patients/patients.routes.ts`.

---

### 3. Platform org — response schemas

**File:** `backend/src/modules/platform/org/org.routes.ts`  
**Line:** 70

**Comment:**

None of the platform org routes declare `schema.response` — only body/query/params. Every handler return shape (200/201/404/422) should have a `*ResponseSchema` wired here.

This is the same gap flagged on PR #50; fixes already exist on `feat/platform-admin-hospitals` (`13d7bfd`). Please merge/rebase that branch or add response schemas following `patients.routes.ts`.

---

### 4. Screening definitions — response schemas

**File:** `backend/src/modules/screening/definitions/definitions.routes.ts`  
**Line:** 31

**Comment:**

Screening definition routes (GET assignments, GET/POST/PATCH/PUT definitions) have body/query validation but no `schema.response`. Add response schemas for each status the controllers return and wire them on every route in this file.

Reference: `backend/src/modules/frontdesk/patients/patients.routes.ts`. Fixes for screening may already be on `feat/platform-admin-hospitals` — please merge if possible.

---

### 5. Screening assignments — response schemas

**File:** `backend/src/modules/screening/assignments/assignments.routes.ts`  
**Line:** 16

**Comment:**

Phase-assignment admin routes need `schema.response` on all five routes (GET list, POST, PATCH, DELETE). Body-only schemas are not enough for CI serialization validation.

---

### 6. Screening responses — response schemas

**File:** `backend/src/modules/screening/responses/responses.routes.ts`  
**Line:** 34

**Comment:**

POST/GET responses routes need `schema.response` for 201/200/403/404 as handlers return them. The write config at L28 only validates body.

Also wire response schema on the GET routes at L35–36.

---

### 7. IPD admissions — response schemas

**File:** `backend/src/modules/ipd/admissions/admissions.routes.ts`  
**Line:** 24

**Comment:**

All five admission request routes declare query/body/params but no `schema.response`. Please add `*ResponseSchema` in `admissions.schema.ts` and wire success + error responses on each route.

Same fix exists on `feat/platform-admin-hospitals` (`13d7bfd`) if you merge that branch first.

---

### 8. Screening — patient-in-org guard (security)

**File:** `backend/src/modules/screening/responses/responses.service.ts`  
**Line:** 29

**Comment:**

`createResponse` inserts assessment answers (PHI) without verifying the patient belongs to `organizationId`. IPD admissions and MCH episodes both call `assertPatientInOrg` before write — screening should too.

Add the guard before the transaction/insert; return `404 { error: 'Patient not found' }` when the patient is not in the caller's org. Fix is already implemented on `feat/platform-admin-hospitals` (`e381f9d`) if you merge that branch.

---

## WARNING — inline comments

### 9. MCH — non-standard error envelope (controller)

**File:** `backend/src/modules/mch/episodes/episodes.controller.ts`  
**Line:** 80

**Comment:**

404 responses use a plain string `{ error: 'No active labour care episode…' }`. Project convention is `{ error: { code, message, details? } }` (see frontdesk/patient routes). Please normalize when touching these handlers.

---

### 10. MCH templates — non-standard error envelope

**File:** `backend/src/modules/mch/templates/templates.routes.ts`  
**Line:** 26

**Comment:**

Same as episodes — `{ error: 'No active labour care template configured' }` should use the standard error envelope `{ error: { code, message } }` for consistency with the rest of the API.

---

### 11. MCH — 409 error shape

**File:** `backend/src/modules/mch/episodes/episodes.service.ts`  
**Line:** 128

**Comment:**

409 body mixes string `error` with `episode_id` at the root. Prefer `{ error: { code: 'ACTIVE_EPISODE_EXISTS', message: '…', details: { episode_id } } }` so clients can rely on one shape.

---

### 12. Screening — non-standard error envelope

**File:** `backend/src/modules/screening/definitions/definitions.routes.ts`  
**Line:** 23

**Comment:**

400 uses root-level `{ code, message }` instead of `{ error: { code, message } }`. Screening responses controller/routes have the same pattern. Align with project error envelope when refactoring.

---

### 13. Screening responses — 403 envelope

**File:** `backend/src/modules/screening/responses/responses.routes.ts`  
**Line:** 19

**Comment:**

403 preHandler returns `{ code: 'FORBIDDEN_ROLE', message: '…' }` at root. Should be nested under `error` per API conventions.

---

### 14. UUID format — MCH request schemas

**File:** `backend/src/modules/mch/episodes/episodes.schema.ts`  
**Line:** 14

**Comment:**

`patient_id`, `visit_id`, and `encounter_id` use `minLength: 1` instead of `format: 'uuid'`. Apply `format: 'uuid'` on all UUID fields in MCH request/response schemas (params included), consistent with IPD and patients modules.

---

### 15. UUID format — screening request schemas

**File:** `backend/src/modules/screening/responses/responses.schema.ts`  
**Line:** 7

**Comment:**

`patient_id` and `definition_id` should use `format: 'uuid'`, not `minLength: 1`. Apply the same pattern everywhere UUIDs appear in this PR's screening/MCH/platform schemas. Partial fix on `feat/platform-admin-hospitals` (`e381f9d`).

---

### 16. MCH — visit/encounter not org-validated

**File:** `backend/src/modules/mch/episodes/episodes.service.ts`  
**Line:** 149

**Comment:**

`createEpisode` validates `patient_id` via `assertPatientInOrg` but accepts arbitrary `visit_id` / `encounter_id` UUIDs. Consider validating visit/encounter belong to the same org (and patient) before insert, or reject when they don't resolve.

---

### 17. Screening — definition not validated against assignment

**File:** `backend/src/modules/screening/responses/responses.service.ts`  
**Line:** 29

**Comment:**

Beyond patient-in-org: no check that `definition_id` matches an active assignment for `(organizationId, phase)`. A caller could submit answers against a definition not assigned to their org/phase. Recommend validating via `resolveAssignmentsForPhase` before insert.

---

### 18. MCH template admin — route-layer auth

**File:** `backend/src/modules/mch/templates/templates.routes.ts`  
**Line:** 20

**Comment:**

Template CRUD uses `withOrgAuth` only; `assertPlatformAdmin` is enforced in the service layer. Prefer adding platform-admin preHandler at the route layer (like other platform-only endpoints) so unauthorized requests fail before hitting the service.

---

### 19. No MCH integration tests

**File:** `backend/src/modules/mch/__tests__/mch.schema.test.ts`  
**Line:** 1

**Comment:**

Only AJV schema smoke tests exist for MCH. Please add integration tests for: org-scoped episode CRUD, 409 one-active-episode per patient, patient-not-in-org 404, and audit log metadata on mutations.

---

### 20. Duplicate migration numeric prefixes

**File:** `backend/src/db/migrations/002_ipd_admissions_request.sql`  
**Line:** 1

**Comment:**

Duplicate numeric prefixes (`002_*`, `003_*`, `004_*`, `005_*` pairs) are confusing for operators even though `migrate.ts` sorts by full filename. Consider renumbering in a follow-up or documenting order in `migrations/README.md`.

---

### 21. Frontend MCH constants incomplete

**File:** `src/modules/mch/mch.constants.ts`  
**Line:** 1

**Comment:**

Frontend constants mirror audit actions and routes but not `EPISODE_STATUS` / `INDUCTION_*` from `backend/src/modules/mch/mch.constants.ts`. `mch.types.ts` uses loose `episodeStatus: string`. Please mirror backend literals so UI doesn't compare raw strings.

---

### 22. Frontend — loose episode status type

**File:** `src/modules/mch/mch.types.ts`  
**Line:** 15

**Comment:**

`episodeStatus: string` should be narrowed from mirrored constants `(typeof EPISODE_STATUS)[keyof typeof EPISODE_STATUS]` once frontend constants are added.

---

### 23. ESLint — react-refresh export

**File:** `src/components/screening/mch/LabourCareGuideLaunchButton.tsx`  
**Line:** 1

**Comment:**

ESLint `react-refresh/only-export-components` warning — move non-component exports to a separate file or add an eslint-disable with justification if intentional.

---

### 24. ESLint — useMemo deps

**File:** `src/pages/labourCareGuide/index.tsx`  
**Line:** 57

**Comment:**

`react-hooks/exhaustive-deps` warning on `useMemo` — please fix dependency array or document why stable refs are intentional.

---

### 25. Test timeout flake risk

**File:** `backend/src/modules/mch/__tests__/mch.schema.test.ts`  
**Line:** 27

**Comment:**

`beforeAll` uses 60s timeout for full `buildApp()`. Under full suite this may flake — consider 120s (same as barrel import tests) or a lighter AJV-only setup without full app boot.

---

### 26. Demo seed hardcoded passwords

**File:** `backend/src/db/seeds/create-admin.ts`  
**Line:** 27

**Comment:**

Non–platform-admin demo accounts use hardcoded passwords in source. Platform admin correctly uses env vars. Consider env-driven passwords or a clear "local dev only" guard so these never ship to shared environments.

---

## SUGGESTION — inline comments

### 27. Merge platform-admin branch

**File:** `backend/src/modules/platform/org/org.routes.ts`  
**Line:** 1

**Comment:**

Suggest merging/rebasing `feat/platform-admin-hospitals` (`13d7bfd` response schemas + `e381f9d` UUID format + screening `assertPatientInOrg`) before final review — avoids re-implementing the same fixes and reduces diff noise.

---

### 28. MCH template in-place edit — clinical sign-off

**File:** `backend/src/db/migrations/010_mch_templates_drop_version_uniqueness.sql`  
**Line:** 1

**Comment:**

Migration drops version uniqueness so templates can be edited in place. Please confirm product/clinical sign-off that in-flight episodes referencing `template_version` remain safe when schema content changes mid-episode.

---

### 29. OpenAPI — MCH tag missing

**File:** `backend/src/build-app.ts`  
**Line:** 164

**Comment:**

`/api/mch/*` routes fall through to `tags = ['Other']` because there is no branch for MCH. Add `{ name: 'MCH', description: '…' }` to the tags list (~L130) and `else if (url.startsWith('/api/mch')) tags = ['MCH'];` before the `Other` fallback. Verify with `GET /docs/json` after response schemas are wired.

---

*Generated from re-review at `d1058b3`. Line numbers match PR head.*
