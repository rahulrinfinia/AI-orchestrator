# E0c — ICD-10-CM catalog validation + enrichment (report)

**Approval:** Rahul — E0c  
**Branch:** `feat/ehr-insert-e0` (not pushed)  
**Plan:** `specs/features/mitra-ai-scribe/ehr-insert/ehr-insert-e0.md` § E0c  
**Solution doc:** `projects/mitra-ai-scribe/docs/ehr-insert-solution.md`

## Commits (this slice)

| Commit | Summary |
|--------|---------|
| `34e6e32` | STEP 0: extension eslint clean |
| `373560a` | E0c backend: normalize, GET enrich, import script, tests |
| `e181feb` | Integration: skip sign-in rate limit in `NODE_ENV=test` |
| `25a8060` | E0c extension: dotted code, description, category/invalid UX |

Earlier on branch (E0c scaffolding): `996d985` — migrations 0008–0009, `icd` module, `@mitra/icd-format`, pipeline prompt `icdVersion`.

## Migrate

```bash
cd projects/mitra-ai-scribe/backend && npm run db:migrate
```

Applies (if not already):

- `0008_icd10cm.sql` — `icd_codes(version, code, description, is_billable)`, PK `(version, code)`
- `0009_org_icd_settings.sql` — `organizations.icd_system`, `organizations.icd_version` (default from migration; new orgs use env via seed)

## Import ICD catalog

Set `ICD_DEFAULT_VERSION` in `projects/mitra-ai-scribe/.env` (see `.env.example`, e.g. `FY2024`).

**Dev / CI subset:**

```bash
cd projects/mitra-ai-scribe/backend
node --env-file=../.env ./node_modules/tsx/dist/cli.mjs scripts/import-icd10cm.ts \
  --version "$ICD_DEFAULT_VERSION" \
  --fixture scripts/fixtures/icd10cm-dev-subset.tsv
```

**CMS order file:** see `backend/scripts/README.md` (download link + `--order` usage). Upserts only; old versions are never deleted.

## Files changed (E0c delta)

### Backend
- `backend/scripts/import-icd10cm.ts`, `backend/scripts/README.md`, `backend/scripts/fixtures/icd10cm-dev-subset.tsv`
- `backend/src/modules/icd/icd.service.ts` (`invalidIcd10Display` uses raw trimmed code)
- `backend/src/modules/pipeline/pipeline.service.ts` (normalize after SOAP)
- `backend/src/modules/sessions/sessions-diagnoses.service.ts`, `sessions.service.ts`, `sessions.schema.ts`
- `backend/src/plugins/auth.ts` (test env sign-in rate limit)
- `backend/test/unit/icd-import.test.ts`, `backend/test/integration/icd-diagnoses.integration.test.ts`

### Extension
- `extension/eslint.config.js`, `AuthShell.tsx`, `PipelineProgressPanel.tsx`, `RecordingActivePanel.tsx` (STEP 0 lint)
- `extension/src/features/drafts/components/review/DraftAssessmentDiagnoses.tsx`
- `extension/src/features/drafts/hooks/useDebouncedDiagnosisSave.ts`
- `extension/src/features/recording/api/sessions-api.ts`

### Shared (already on branch)
- `shared/icd-format/` — `stripIcdDot`, `formatIcdForDisplay` + unit tests

## Verification

| Check | Result |
|-------|--------|
| `backend npm run build` | **Pass** |
| `backend npm test` (unit) | **Pass** — 23 tests (includes `icd-import.test.ts`) |
| `shared/icd-format npm test` | **Pass** — 4 tests |
| `backend MITRA_RUN_INTEGRATION=1 npm run test:integration` | **Pass** — 25 passed, 1 skipped (local Docker Postgres/Redis/MinIO) |
| `extension npm run lint` | **Pass** |
| `extension npx tsc -b --noEmit` | **Pass** |
| `extension npm run build` | **Pass** |
| Manual: login, record, pipeline, review, edit, approve, copy | **UNVERIFIED** |
| Manual: E0a patient read, E0b diagnoses edit/re-approve | **UNVERIFIED** |
| Manual: E0c UI (category chip, invalid dropped message) in side panel | **UNVERIFIED** |
| Full CMS order import on production-sized file | **UNVERIFIED** |

## Behavior summary

- Pipeline and `PATCH .../diagnoses` strip dots, validate against org `icd_version` (fallback `ICD_DEFAULT_VERSION`). Invalid codes dropped; condition text kept; `invalidIcd10Display` on GET when a stale/unknown code was stored.
- Valid codes stored without dot; GET adds `icd10Display`, `description`, `isBillable`, `categoryWarning` when not billable.
- SOAP prompt includes org ICD version string.
- Import upserts by version; prior `icd_codes.version` rows remain.

## Out of scope

- E1 EHR insert (not implemented).
