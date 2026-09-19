# Code Review — PR #61 (his-global-south)

| Field | Value |
|-------|--------|
| **PR** | [#61](https://github.com/apeiro-care/his-global-south/pull/61) |
| **Base** | `develop-l2` |
| **HEAD** | `95a59bc` — *fix(screening,orders): intake empty states and radiology delivered mapping* |
| **Scope** | 27 files (+712 / −71), **2 commits** |
| **Spec** | [orders-tracker-intake-fixes.md](../../specs/features/his-global-south/orders-tracker-intake-fixes.md) |
| **Reviewer** | AI code-review (hub) |
| **Date** | 2026-09-10 |
| **Verdict** | **APPROVE** |

---

## 1. PR summary

Focused follow-up extracted from the larger DRA branch — fixes three production issues without the 359-file scope of PR #58.

| Commit | Summary |
|--------|---------|
| `e981f4f` | Lab/radiology tracker pipelines from item release; visit-scoped intake screening; hide Load Template |
| `95a59bc` | Intake empty-state UX; radiology Delivered via mapping (legacy notes read); regression tests |

### Problems solved

1. **Orders stuck before Resulted/Delivered** — trackers now use per-item release state.
2. **Return patient old intake screening** — `visit_id` filter on list/completion + frontend passes consult visit.
3. **Load Template redundant** — commented out; Care Templates tab remains.

---

## 2. Validation (local, HEAD `95a59bc`)

| Check | Result |
|-------|--------|
| Frontend screening + order + mapping tests | **86 passed** |
| Backend screening + orderCompletion unit | **23 passed** |
| `orders-approval-radiology` integration | **21/21 passed** |
| `npx tsc -b` | Pass |
| `npm run lint` | 0 errors (18 pre-existing warnings) |

**Note:** GitHub API comments not fetched (`gh` unauthenticated). Review is code + spec based.

---

## 3. Findings

### Correctness — Pass

#### Lab & radiology trackers

- `inHousePipelineStatusForTab` / `labRowPipelineKey` derive step from `isReleasedToClinicians` — fixes stale `order.status`.
- `mapApiOrderToLabStatus` / new `radiologyOrderStatus.mapping.ts` honor `allItemsReleased`.
- Send-out pipeline uses per-row send-out status + release — consistent with in-house.
- Tracker tests updated (46 tests pass in full tracker suite).

#### Visit-scoped intake screening

- Backend: `listResponses` / `getCompletion` filter by `visit_id` when phase is visit-scoped; safe empty when missing.
- Frontend: `useScreeningResponses` disabled without `visitId`; query keys include visit.
- `ScreeningResponsesSummary`: friendly empty messages + consistent section header while loading.
- 16 service tests + 5 component tests cover visit-scoping and empty states.

#### Radiology Delivered

- Frontend mapping: `COMPLETED + allItemsReleased` → `DELIVERED`; legacy `radiology:delivered` in notes still read.
- `orderCompletion.service.test.ts` + integration approve test guard against notes-marker regression (2 order updates, not 3).

---

### WARNING (non-blocking)

#### W1 — Stale backend constant comment

`clinical.constants.ts` adds `RADIOLOGY_FULFILLMENT_MARKER` with comment *"Appended to diagnostic_orders.notes"*, but this PR does **not** append to notes (and `orderCompletion.service.ts` is unchanged vs base). Comment should say *"Legacy read / frontend mapping"* or similar — avoid implying a write path that no longer exists.

#### W2 — `listResponsesQuerySchema.visit_id` lacks Title Case `errorMessage`

Create schema has `Visit must be a valid UUID`; list/completion query schemas do not. Low risk — optional polish per hub AJV convention.

#### W3 — Manual QA still recommended

Automated tests are strong; confirm in UI: return patient Intake, lab/radiology approve → final tracker step, Load Template hidden.

---

### SUGGESTION

- **S1:** PR body could link to `orders-tracker-intake-fixes.md` QA checklist for reviewers.
- **S2:** Integration test title *"without a second diagnostic_orders notes update"* could be renamed *"without a third notes-marker update"* for clarity.

---

## 4. Security & conventions

| Check | Status |
|-------|--------|
| Org-scoped screening reads | Pass — unchanged auth (`SCREENING_VIEW_ROLES`) |
| Visit scoping prevents cross-visit PHI on Intake | Pass |
| SQL parameterized (Drizzle) | Pass |
| Response schema on screening list | Pass — existing `responseListResponseSchema` |
| Module layout | Pass — changes in existing modules only |
| No scope creep | Pass — 27 files, single feature |

---

## 5. Spec alignment

| Requirement | Status |
|-------------|--------|
| Tracker reaches Resulted/Delivered when items released | **Pass** |
| Intake screening visit-scoped only | **Pass** |
| Load Template hidden | **Pass** |
| Empty-state UX (Phase 3) | **Pass** |
| Tests | **Pass** |

---

## 6. What went well

- **Right-sized PR** — easy to review vs monolithic #58.
- End-to-end fix: backend filter + frontend query keys + UX messages.
- Strong test coverage: unit, component, integration, mapping.
- Backward compatible radiology Delivered (legacy notes marker).

---

## 7. Verdict

**APPROVE** — ready to merge after optional W1 comment fix and quick manual QA.

No blockers. This is the preferred vehicle to ship tracker + intake fixes independently of PR #58.

---

## 8. Recommended merge checklist

- [ ] Manual QA (5–10 min) on preview/local
- [ ] Optional: fix `RADIOLOGY_FULFILLMENT_MARKER` comment in `clinical.constants.ts`
- [ ] CI green including `test:integration`
