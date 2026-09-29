# E0b — Diagnoses persist + UI (report)

**Approval:** Rahul — E0b implementation  
**Branch:** `feat/ehr-insert-e0` (not pushed)  
**Plan:** `specs/features/mitra-ai-scribe/ehr-insert/ehr-insert-e0.md` § E0b  

## Commits (E0b-focused)

| Commit | Summary |
|--------|---------|
| `996d985` | Initial stack: migration 0007, PATCH route, pipeline parse, extension table, integration tests (landed with E0a bundle) |
| `4cb0864` | E0b-only persist: no ICD catalog on pipeline/PATCH/GET (E0c deferred) |
| `b3fdc74` | Tests: pipeline jsonb, cross-org PATCH, unit validate/parse |
| `fcd1b8b` | Extension UI: E0b fields only (no E0c enrichment badges) |

## Migrate

```bash
cd projects/mitra-ai-scribe/backend && npm run db:migrate
```

Applies `0007_session_diagnoses.sql` (`scribe_sessions.diagnoses jsonb DEFAULT '[]'`) if not already applied.

## Files changed (E0b surface)

### Backend
- `backend/src/db/migrations/0007_session_diagnoses.sql`
- `backend/src/db/schema/scribeSessions.ts`
- `backend/src/modules/pipeline/pipeline.types.ts`, `scribe.service.ts`, `pipeline.service.ts`, `prompts/soap.v1.ts`
- `backend/src/modules/sessions/session-diagnoses.util.ts`, `sessions-diagnoses.service.ts`, `sessions-diagnoses.constants.ts`, `session-review-revert.service.ts`
- `backend/src/modules/sessions/sessions.schema.ts`, `sessions.routes.ts`, `sessions.controller.ts`, `sessions.service.ts`, `sessions.constants.ts`
- `backend/test/integration/draft-review.integration.test.ts`, `pipeline.integration.test.ts`
- `backend/test/unit/scribe.service.test.ts`, `session-diagnoses.util.test.ts`

### Extension
- `extension/src/features/drafts/components/review/DraftAssessmentDiagnoses.tsx`
- `extension/src/features/drafts/hooks/useDebouncedDiagnosisSave.ts`
- `extension/src/features/drafts/api/diagnoses-api.ts`
- `extension/src/features/drafts/components/review/DraftReviewPanel.tsx` (Assessment block)
- `extension/src/features/recording/api/sessions-api.ts` (types)

### Not in E0b scope (present for E0c, unused on hot path after `4cb0864`)
- `backend/src/modules/icd/*`, migrations 0008–0009, `icd-diagnoses.integration.test.ts`

## Verification

| Check | Result |
|-------|--------|
| `backend npm run build` | **Pass** |
| `backend npm test` (unit) | **Pass** — 22 tests |
| `backend npm run test:integration` | **Skipped** unless `MITRA_RUN_INTEGRATION=1` + Postgres — **UNVERIFIED** in this run |
| `extension npm run typecheck` | **Pass** |
| `extension npm run build` | **Pass** |
| `extension npm run lint` | **Fail** — 12 pre-existing errors (orb/visualizer inline styles; not E0b) |
| Manual B1–B3 (pipeline UI, edit PATCH, re-approve copy) | **UNVERIFIED** |

## Behavior summary

- Pipeline parses `extractedEntities.diagnoses` → saves to `scribe_sessions.diagnoses`.
- `GET /v1/sessions/:id` includes `diagnoses` (default `[]`).
- `PATCH /v1/sessions/:id/diagnoses` org-scoped; audit `diagnoses_edited` (no condition text in audit ref).
- PATCH on **approved** session → status `ready`, clears approval; footer copy disabled until re-approve (`useDraftReviewPanel` + `DraftReviewFooter`).
- Extension: editable table under Assessment, debounced PATCH, Saving/Saved via `saveStateLabel`.

## Out of scope (per request)

- ICD catalog validation / billable chips (E0c) — `icd.service` enrich/normalize not used on E0b read/write path after `4cb0864`.
- EHR insert (E1).
