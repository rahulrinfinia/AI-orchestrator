# E1 — Method A insert at cursor (report)

**Approval:** Rahul — E1  
**Branch:** `feat/ehr-insert-e0` (not pushed)  
**Design:** `projects/mitra-ai-scribe/docs/ehr-insert-solution.md` (Method A, §3, §5, §6, §8, §9)

## STEP 0 — rate limit tests

- Reverted `NODE_ENV=test` sign-in rate limit bypass (`e181feb` superseded).
- Added `backend/test/integration/integration-auth.helpers.ts` — unique `x-forwarded-for` per suite (`127.0.0.1-integration-<key>`).
- Updated auth, sessions, draft-review, icd integration tests to use isolated IPs.
- Added `auth-sign-in-rate-limit.integration.test.ts` — proves **429** after `AUTH_SIGN_IN_RATE_LIMIT_MAX` for one IP.

## STEP 1 — E1 deliverables

### Extension
- **Insert** buttons per SOAP section (+ **Insert assessment diagnoses**) when session **approved**; Copy unchanged.
- Button gesture → optional origin permission; deny → message + manual copy.
- Insert-time **Method B** patient read + `@mitra/patient-match` decision table (match / name warning / block; no session context → page confirm).
- Focused editable in **all frames** (`allFrames` probe + `frameIds` fill); replace/append prompts; fill + read-back via `fill-engine.ts` / injected scripting.
- **Undo insert** (extension memory only; cleared on session change).
- No Save/Sign/navigation automation.

### Backend
- Audit via `POST /v1/sessions/:sessionId/ehr-insert` — events `ehr_insert_attempt`, `ehr_insert_verified`, `ehr_insert_failed`, `ehr_insert_blocked` (`resourceRef`: session + section only).

### Mock EHR
- `soap-chart-single.html` / `soap-chart.html`: patient banner, React-controlled subjective, contenteditable assessment, plan in same-origin iframe.
- `extension/docs/mock-ehr.md` — manual E1 script.

### Tests
- `extension/test/unit/focus-finder.test.ts`, `fill-engine.test.ts` (vitest + happy-dom).
- Manual script in mock-ehr doc.

## Commits (this slice)

| Commit | Summary |
|--------|---------|
| (this series) | STEP 0 rate limit isolation + 429 test |
| (this series) | Backend ehr-insert audit route |
| (this series) | Extension Method A + mock pages + unit tests |

## Verification

| Check | Result |
|-------|--------|
| `backend npm run build` | **Pass** |
| `backend npm test` | **Pass** — 23 tests |
| `backend MITRA_RUN_INTEGRATION=1 npm run test:integration` | **Pass** — 26 passed, 1 skipped |
| `extension npm run lint` | **Pass** |
| `extension npx tsc -p tsconfig.json --noEmit` | **Pass** |
| `extension npm test` | **Pass** — 7 tests |
| `extension npm run build` | **Pass** |
| Manual E1 on mock EHR (all field types + undo + mismatch) | **UNVERIFIED** |
| Cross-browser focus with side panel open | **UNVERIFIED** |
| E0a/E0b/E0c regression (record → approve → copy) | **UNVERIFIED** |

## Key files

**Backend:** `sessions.constants.ts`, `sessions-review.schema.ts`, `sessions.service.ts`, `sessions.routes.ts`, `integration-auth.helpers.ts`, `auth-sign-in-rate-limit.integration.test.ts`

**Extension:** `insert-at-cursor.ts`, `fill-engine.ts`, `focus-finder.ts`, `browser/scripting.ts`, `useEhrInsert.ts`, review panel/card/footer/diagnoses components, `drafts-api.ts`

**Mock:** `mock-ehr/soap-chart*.html`, `extension/docs/mock-ehr.md`

## API usage (extension)

```http
POST /v1/sessions/{sessionId}/ehr-insert
Authorization: Bearer …
{ "event": "attempt"|"verified"|"failed"|"blocked", "section": "subjective" }
```

Requires approved session (same gate as copy).
