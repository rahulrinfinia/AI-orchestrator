# Code Review — PR #55 (his-global-south) — Re-review

| Field | Value |
|-------|--------|
| **PR** | [#55](https://github.com/apeiro-care/his-global-south/pull/55) |
| **Branch** | `nutrition-dental-template-builder` → `develop-l2` |
| **HEAD** | `dc18aea` — *Completed the nutrition templates development* |
| **Reviewer** | AI code-review skill |
| **Date** | 2026-09-06 (re-review; prior review 2026-09-05) |
| **Verdict** | **REQUEST CHANGES** |

---

## Summary

Re-reviewed PR #55 at `dc18aea` (~155 files, +11k/−2.6k vs `develop-l2`). The author addressed **two of three CRITICAL** items from the first review in commit `f23a4b9` (response schemas + platform-admin route gating). The feature remains high quality overall: unified `clinicalForms` module, nutrition/dental platform templates, form-builder UI, and frontend migration off `/api/mch/*`.

**One blocking item remains:** unqualified removal of `/api/mch/*` with no alias or documented breaking-change plan.

**No matching spec** found in this orchestrator hub (`specs/features/his-global-south/`).

---

## Change log since first review (2026-09-05)

| ID | First review | Re-review status |
|----|--------------|------------------|
| **C1** | Missing `schema.response` on clinicalForms routes | **FIXED** (`f23a4b9`) — error + DELETE response schemas wired in categories, templates, responses, episodes |
| **C2** | Route auth vs `assertPlatformAdmin` mismatch | **FIXED** — admin routes use `CLINICAL_FORMS_ADMIN_ROLES` (`platform_admin`, `super_admin`) |
| **C3** | `/api/mch/*` removed with no alias | **OPEN** — only `/api/clinical-forms` registered in `build-app.ts`; no `/api/mch` in app code |
| **W1** | Migrations missing `COMMENT ON` | **FIXED** — `028_clinical_form_responses.sql`, `029_clinical_form_categories.sql` |
| **W2** | Category seed `ON CONFLICT` ineffective | **FIXED** — idempotent `INSERT … WHERE NOT EXISTS` |
| **W3** | Category schema ↔ service drift | **FIXED** — `scope`, `active`, `organization_id` in create schema; service persists them |
| **W4** | Manual snake_case in `careTemplates.api.ts` | **OPEN** — dual-case fallbacks on visit/patient response mappers |
| **W5** | Silent catch in `GeneralCareTemplate` episode load | **OPEN** — empty `catch` still opens “Start Episode” for any error |
| **W6** | Large form-builder components | **OPEN** (non-blocking) |
| **W7** | Duplicate route aliases | **PARTIAL** — ANC cleaned; labour still has `/active/:patientId` + `/patients/:patientId/active-episode` |
| **W8** | ANC/labour service tests not fully ported | **PARTIAL** — `clinicalForms.service.test.ts` (7 cases) replaces deleted `mch/` tests but not full episode lifecycle |
| **S1** | `categoryResponseSchema` incomplete | **FIXED** — includes `scope`, `active`, etc. |
| **S2** | Commit typo “nutirtion” | **OPEN** in history (`04919c2`) |

---

## What went well

- Clean module layout under `backend/src/modules/clinicalForms/` (categories, templates, responses, ANC + labour episodes).
- Response schemas now cover success and declared error paths on admin/write routes (convention compliance).
- Platform-admin gating at route boundary matches service-layer `assertPlatformAdmin`.
- AJV custom messages with dedicated schema tests (`clinicalForms.schema.test.ts` — 9 tests).
- Org-scoped ownership checks on response upserts; platform template delete guard.
- Migrations include thorough `COMMENT ON TABLE/COLUMN/INDEX` and idempotent category seeds.
- Frontend paths consistently use `/api/clinical-forms/*`; `GeneralCareTemplate` supports visit/patient/episode scopes.
- **`clinicalForms` backend tests: 16/16 passed** on `dc18aea` (local run).

---

## Findings

### CRITICAL

#### C3 — Breaking API removal: `/api/mch/*` with no redirect/alias *(unchanged — blocking)*

`backend/src/modules/mch/` is gone. `build-app.ts` registers only `clinicalFormsPlugin` at `/api/clinical-forms`. Grep shows **no** remaining `/api/mch` references in TS/TSX/JS.

Frontend and e2e in this PR are migrated, but any external client, stale browser tab, script, or integration still calling `/api/mch/anc/...` or `/api/mch/episodes/...` will **404** after deploy. Old migration comments still reference `/api/mch/*` paths (documentation drift only).

**Fix (pick one before merge):**

1. Register thin alias routes `/api/mch/*` → same handlers under `/api/clinical-forms/*` for one release, **or**
2. Document intentional breaking change in PR body + deployment runbook; confirm no other consumers (mobile, scripts, other services).

---

### WARNING

#### W4 — Manual snake_case mapping in `careTemplates.api.ts` *(unchanged)*

```70:84:projects/his-global-south/src/pages/careTemplates/careTemplates.api.ts
export const getVisitFormResponses = async (
  visitId: string,
): Promise<ClinicalFormResponse[]> => {
  const rows = await api.get<Record<string, any>[]>(`${CLINICAL_FORMS_RESPONSES_API}/visit/${visitId}`);
  return rows.map((r) => ({
    id: r.id,
    patientId: r.patientId ?? r.patient_id ?? '',
    // ...
```

The API client already applies `keysToCamel`. Typed `api.get<ClinicalFormResponse[]>` would remove dual-case fallbacks and `Record<string, any>`.

---

#### W5 — Episode-load error UX in `GeneralCareTemplate` *(unchanged)*

```100:105:projects/his-global-south/src/pages/careTemplates/templates/GeneralCareTemplate.tsx
      } catch {
        if (!cancelled) {
          setEpisodeId(null);
          setEpisode(null);
          setStartEpisodeOpen(true);
        }
      }
```

`getActiveAncEpisode` correctly returns **404** when no active episode (`ancEpisodes.controller.ts` L43–45). The catch block treats **404, 403, and network failures** identically — real errors look like “no episode; start one”. Template-load path already uses `showApiErrorToast`; episode load should distinguish 404 (open dialog) from other errors (toast).

---

#### W6 — Large frontend components *(non-blocking)*

`CreateAssignTemplateDialog.tsx`, `TemplatesPanel.tsx`, and `GeneralCareTemplate.tsx` remain large. Acceptable for merge if C3 resolved; extract in fast follow.

---

#### W7 — Duplicate labour route aliases *(partial)*

`labourCare.routes.ts` registers both `/active/:patientId` and `/patients/:patientId/active-episode` for the same handler. ANC routes no longer duplicate. Consider documenting alias removal timeline.

---

#### W8 — ANC / labour episode tests *(partial)*

Deleted with `mch/` module:

- `backend/src/modules/mch/anc/__tests__/anc.service.test.ts`
- `backend/src/modules/mch/episodes/__tests__/episodes.service.test.ts`

New `clinicalForms.service.test.ts` covers template resolution, category delete constraints, and labour smoke — not full ANC create → active lookup → form upsert → patch lifecycle. Recommend porting highest-value cases before or immediately after merge.

---

### NEW (re-review)

#### W9 — `createCategory` declares 409 but may return 500 on duplicate code

Route declares `409` for POST `/categories`, but `createCategory` inserts without pre-check or handling unique-violation on `(organization_id, code)`. Duplicate platform category code likely surfaces as unhandled DB error → **500** instead of `{ error: '...' }` with 409.

**Fix:** Pre-select existing row by `(organization_id, normalizedCode)` or catch unique violation and map to 409.

---

#### W10 — List routes declare 404 but handlers return empty arrays

Examples: `listTemplatesByCategoryHandler`, `getVisitResponsesHandler`, `listOrgAncTemplatesHandler` return `[]` when nothing found; routes declare `404` in `schema.response`. Not a runtime failure (`additionalProperties`/array 200), but OpenAPI docs and integration tests expecting 404 on “not found” lists will drift.

**Fix:** Either return 404 when category/visit invalid, or remove unused 404 from list-route response schemas.

---

### SUGGESTION

#### S2 — Commit message typo

History still contains “nutirtion” (`04919c2`). Cosmetic only.

#### S3 — Hub documentation

No PRD/technical-design/spec in orchestrator for this feature. Recommend a short retroactive spec for traceability.

---

## Security checklist

| Check | Status |
|-------|--------|
| Auth on routes | ✅ Admin writes gated at route (`CLINICAL_FORMS_ADMIN_ROLES`) |
| Org/patient scope on reads/writes | ✅ Visit/patient/episode ownership validated |
| Parameterized SQL | ✅ Drizzle ORM |
| PHI in logs | ✅ No obvious logging of answers |
| Platform template delete protection | ✅ |
| Breaking API surface | ⚠️ `/api/mch` removal (C3) |

---

## Testing

| Suite | Result |
|-------|--------|
| `backend/src/modules/clinicalForms/__tests__/*` | ✅ **16/16 passed** on `dc18aea` |
| Full backend / frontend CI | Not re-run in this re-review |

Recommend author confirm before merge:

```bash
cd backend && npm run build && npm test
cd .. && npm run lint && npx tsc -b && npm test
```

---

## Scope vs spec

No approved hub spec. PR scope: clinical form builder + nutrition/dental templates + MCH → `clinicalForms` migration. QA should cover ANC, labour care guide, nutrition/dental visit forms, and platform form-builder admin flows end-to-end.

---

## Recommended actions before merge

1. **Must:** Resolve `/api/mch` breaking-change strategy (**C3**).
2. **Should:** Fix episode-load error UX (**W5**); remove manual case mapping (**W4**).
3. **Should:** Handle duplicate category code → 409 (**W9**); align list-route 404 declarations (**W10**).
4. **Should:** Port ANC + labour episode service tests (**W8**).
5. **Nice:** Trim labour route aliases (**W7**); split large components (**W6**).

---

## Verdict rationale

**Request changes** — down from three CRITICAL items to **one**. Response schemas (C1) and platform-admin route gating (C2) are fixed. The unqualified `/api/mch` API removal (C3) is a deployment-risk breaking change that must be aliased or explicitly accepted before merge. Remaining warnings are quality/follow-up, not blockers except C3.
