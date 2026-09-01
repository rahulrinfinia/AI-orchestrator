# PR Review — his-global-south #51 (re-review #2)

| Field | Value |
|-------|-------|
| **URL** | https://github.com/apeiro-care/his-global-south/pull/51 |
| **Title** | Completed the MCH form functionality |
| **Base branch** | `develop` |
| **Head branch** | `mch-form` |
| **Head commit** | `94ef087` — *Fixed the incorrect routing* (2026-08-30) |
| **Prior head** | `d1058b3` (reviewed 2026-08-29) |
| **Review depth** | `targeted` (335 files) |
| **Files changed** | 335 (~78.8k insertions vs `develop`) |
| **Modules touched** | platform org, screening, patients/frontdesk, IPD, **MCH (new)**, migrations/seeds |
| **Hub spec** | n/a — no dedicated MCH PRD/slice with Approval in hub |
| **Re-review date** | 2026-08-30 |
| **Verdict** | **REQUEST CHANGES** |

## Summary

PR #51 remains a **very large integration branch** (platform admin hospitals, screening, patient registration, IPD admissions, plus new MCH / Labour Care Guide). The author **has addressed two prior review themes** since `d1058b3`:

1. **`70a1602`** — MCH episodes + templates routes now wire **success `schema.response`** (6 episode routes + 5 template routes).
2. **`94ef087`** — MCH route prefix registration fixed (`mch.routes.ts` registers sub-routers with `MCH_API_BASE` prefix instead of duplicating paths).

**Still open:** platform org, screening, and IPD admissions routes on this branch **lack response schemas**. MCH routes declare **200/201 only** — no params UUID schemas, no 404/409 error response schemas (handlers return those statuses). Screening **`createResponse` still has no `assertPatientInOrg`**. Fixes for platform/screening/IPD already exist on **`feat/platform-admin-hospitals`** in the local clone but are **not merged into `mch-form`**.

Local regression on `projects/his-global-south` (`feat/platform-admin-hospitals`, 2026-08-30): lint, `tsc -b`, backend build, **1,392 tests passed** — confirms the codebase CI gates are green on the branch that contains platform/screening fixes; PR head was not fully built locally (pr51 clone missing `node_modules`).

## Review coverage

| Area | Depth | Notes |
|------|-------|-------|
| Backend routes/schemas | partial | All 11 changed `*.routes.ts` on `origin/mch-form` |
| MCH module (new) | full | episodes, templates, migrations, service, controller, UI |
| Platform / screening / IPD | partial | Route-schema gaps unchanged vs prior review |
| Frontend MCH | partial | `/labour-care-guide/:episodeId`, platform MCH builder |
| Tests | partial | MCH unit tests present; no MCH route integration tests |
| CI | partial | Regression green on `feat/platform-admin-hospitals`; PR head build not run (deps) |

## Out of scope (not reviewed)

- Every platform hospital UI component line-by-line
- Full screening QuestionBuilder / platform screening admin
- IPD admission UI pages (spot-check only)
- Docker / deployment script churn

## Spec traceability

| Spec / AC | Met? | Evidence |
|-----------|------|----------|
| Hub slice with Approval | n/a | No approved MCH slice spec in hub |
| Labour Care Guide (MCH) | partial | Module, migrations, UI, API present |
| Platform admin hospitals | partial | org routes present; response schemas missing on PR branch |
| Screening | partial | Module present; response schemas + patient guard missing |
| IPD admissions | partial | Routes present; response schemas missing |

## CI evidence

| Command | Result | Notes |
|---------|--------|-------|
| `npm run lint` | pass | `feat/platform-admin-hospitals` clone, 2026-08-30 |
| `npx tsc -b` | pass | same |
| `backend npm run build` | pass | same |
| Frontend `npm test` | pass | 972 passed, 5 skipped |
| Backend `npm test` | pass | 337 passed |
| Backend `npm run test:integration` | pass | 84 passed after openapi sweep timeout fix |
| PR head (`origin/mch-form`) build | not run | pr51 clone missing `node_modules` |
| `gh pr checks 51` | not run | `gh` unavailable in review environment |

## What went well

- **MCH response schemas (new)** — `labourCareEpisodeResponseSchema`, `mchSheetTemplateResponseSchema`, list/delete schemas wired for success paths (`70a1602`).
- **MCH routing fix** — `mch.routes.ts` uses Fastify `register` with prefix; sub-routes use relative paths (`94ef087`).
- **MCH module layout** — `mch.constants.ts`, episodes + templates services, pgschema, default WHO template seed.
- **Migrations** — `008_mch_labour_care.sql` through `010` include rich `COMMENT ON` metadata.
- **Org/patient scope (MCH episodes)** — `assertPatientInOrg`, episode queries filtered by `organization_id`.
- **Audit** — MCH mutations log metadata-only `patient_audit_log` rows (no PHI in `changes`).
- **AJV messages (MCH)** — Title Case labels in episode/template body schemas.
- **MCH unit tests (expanded)** — `mch.schema.test.ts`, `episodes.service.test.ts`, `templates.service.test.ts`, frontend `openLabourCareEpisode.test.ts`, `schemaValidation.test.ts`.
- **Patient registration** — `complete-registration` guarded (`COMPLETION_NOT_PROVISIONAL`); `patients.routes.ts` has `schema.response`.
- **`platform_admin`** — not assignable via org role PUT; platform admin seed uses env.
- **Frontend MCH** — `/labour-care-guide/:episodeId`, platform `/platform/mch` template builder.

## Findings

### CRITICAL

1. **`backend/src/modules/platform/org/org.routes.ts`** — Platform org CRUD, health, support, hospital-setup, users/roles: **no `schema.response`** on any route. Already fixed on `feat/platform-admin-hospitals` — merge/rebase required.

2. **`backend/src/modules/screening/definitions/definitions.routes.ts`**, **`assignments.routes.ts`**, **`responses.routes.ts`** — **No response schemas** (body/query only). Fixed on `feat/platform-admin-hospitals` — not on PR head.

3. **`backend/src/modules/ipd/admissions/admissions.routes.ts`** — Five admission request routes: **no `schema.response`**. Fixed on `feat/platform-admin-hospitals` — not on PR head.

4. **`backend/src/modules/screening/responses/responses.service.ts` — `createResponse`** — **No `assertPatientInOrg`** before insert. Cross-org PHI write risk. Fixed on `feat/platform-admin-hospitals` (`e381f9d`) — not on PR head.

5. **MCH routes — incomplete response schemas (PR #47 bar)** — `episodes.routes.ts` and `templates.routes.ts` declare **success only** (200/201). Handlers also return **404, 409, 400, 500** with bodies that are **not** in `schema.response`. Example: `getActiveEpisodeHandler` → `{ error: 'No active labour care episode…' }`; `templates.routes.ts` inline GET `/active` → 404 string error. Fastify serialization validation will fail or silently mismatch on error paths.

6. **MCH routes — missing params schemas** — GET `/episodes/:id`, `/patients/:patientId/active-episode`, template `/:id` routes have **no `params` schema** with `format: uuid`.

### WARNING

7. **Non-standard error envelope (MCH)** — Controllers/services return `{ error: 'string' }` or `{ error: '…', updated_at }` instead of `{ error: { code, message, details? } }`.

8. **Non-standard error envelope (screening / org)** — Screening routes return `{ code, message }` at root on 403 paths.

9. **UUID `format: 'uuid'` gaps (request bodies)** — MCH `visit_id`/`encounter_id` and screening `patient_id`/`definition_id` use `minLength: 1` or plain `string` in request schemas (response schema has uuid format on some MCH fields; request bodies do not).

10. **MCH `visit_id` / `encounter_id` not org-validated** — `createEpisode` / `patchEpisode` accept arbitrary UUIDs; only `patient_id` is org-checked.

11. **Screening `createResponse` — definition not validated** — No check that `definition_id` matches an active assignment for `(organizationId, phase)`.

12. **MCH template admin routes — auth at route layer** — `templates.routes.ts` uses `withOrgAuth` only; `assertPlatformAdmin` is service-layer. Prefer platform-admin preHandler at route.

13. **No MCH HTTP integration tests** — Unit tests exist; no Fastify `inject()` tests for org-scope, 409 one-active-episode, or response-schema serialization.

14. **Duplicate migration numeric prefixes** — `002_*`, `003_*`, `004_*`, `005_*` pairs; runner uses full filename + sort order so applies correctly, but confusing for operators.

15. **Frontend MCH constants incomplete** — `src/modules/mch/mch.constants.ts` missing full mirror of backend `EPISODE_STATUS` / `INDUCTION_*`; types use loose `episodeStatus: string`.

16. **PR size / reviewability** — 335 files, multiple epics + MCH in one PR.

17. **Hub spec / PR description** — No approved slice spec; PR description likely incomplete per [his-pr-description.md](../../docs/templates/his-pr-description.md).

### SUGGESTION

18. **Merge/rebase `feat/platform-admin-hospitals`** into `mch-form` to pick up platform/screening/IPD response schemas, UUID format, and screening `assertPatientInOrg` without re-implementing.

19. **MCH error responses** — Add shared `mchErrorResponseSchema` and wire 404/409/422 on every MCH route that returns them.

20. **MCH template in-place edit** — Migration `010` documents intentional in-place schema edits; confirm product/clinical sign-off for in-flight episodes.

## Progress since prior review (2026-08-29)

| Item | Prior | Now (`94ef087`) |
|------|-------|-----------------|
| MCH success response schemas | missing | **fixed** |
| MCH route prefix duplication | broken paths | **fixed** |
| Platform org response schemas | missing | still missing |
| Screening response schemas | missing | still missing |
| IPD admissions response schemas | missing | still missing |
| Screening `assertPatientInOrg` | missing | still missing |
| MCH params / error response schemas | missing | still missing |

## Checklist snapshot

- [ ] Response schemas on **all** new/changed routes — **partial** (MCH success only; org/screening/IPD fail)
- [ ] Error status codes in `schema.response` where handlers return them — **fail** (MCH)
- [x] `patients.routes.ts` response schemas
- [x] `complete-registration` provisional guard
- [ ] Screening `createResponse` patient-in-org guard — **fail**
- [ ] UUID format on params + request schemas — **fail**
- [ ] Standard error envelope — **fail**
- [x] MCH org/patient scope in episode service
- [x] Migrations include COMMENT ON (MCH)
- [x] MCH unit tests (expanded since prior review)
- [ ] Backend CI verified on PR head — verify on GitHub Actions

## Recommended author actions

1. **Merge or rebase `feat/platform-admin-hospitals`** (platform/screening/IPD response schemas + screening patient guard) into `mch-form`.
2. **Complete MCH response schemas** — add `params` (UUID) and error responses (404/409/422) for every route that returns them.
3. Add **`assertPatientInOrg`** in screening `createResponse` if not merged from (1).
4. Normalize error envelopes to `{ error: { code, message } }` when touching routes.
5. Re-run **`npm run lint`**, **`npx tsc -b`**, **`backend npm run build`**, **`npm test`**, **`backend npm run test:integration`** on PR head and confirm GitHub Actions green.
6. Update PR description per [his-pr-description.md](../../docs/templates/his-pr-description.md).

---

*Re-reviewed per hub `his-pr-review` skill and [his-pr-review-checklist.md](../../docs/templates/his-pr-review-checklist.md). Regression context from 2026-08-30 session on `feat/platform-admin-hospitals`.*
