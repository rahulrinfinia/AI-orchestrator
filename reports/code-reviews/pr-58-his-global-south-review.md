# Code Review — PR #58 (his-global-south)

| Field | Value |
|-------|--------|
| **PR** | [#58](https://github.com/apeiro-care/his-global-south/pull/58) |
| **Branch** | `feat/dra-radiology-inhouse-approval` → `develop-l2` |
| **HEAD (local)** | `e981f4f` — *fix(orders,screening,consult): tracker pipelines, visit-scoped intake, hide load template* |
| **Specs** | [diagnostic-results-approval-workflow.md](../../specs/features/his-global-south/diagnostic-results-approval-workflow.md), slices 1–4; bundled #55 clinicalForms, #56 form-print |
| **Reviewer** | AI code-review (hub) |
| **Date** | 2026-09-09 |
| **Verdict** | **APPROVE** (code) — process warnings remain (§5) |

---

## 1. GitHub review comments — source

**Live GitHub thread not fetched** (`gh` unauthenticated). This review reconciles against **hub PR fix plans** in `specs/pr-reviews/pr-58-*.md`, which were written from @hemantinfinia's review on PR #58.

To cross-check unresolved GitHub threads after merge prep:

```bash
gh auth login
gh api repos/apeiro-care/his-global-south/pulls/58/comments --paginate
gh api repos/apeiro-care/his-global-south/issues/58/comments --paginate
```

---

## 2. PR scope

| Metric | vs `develop-l2` |
|--------|-----------------|
| Files changed | **359** (+25,851 / −5,367) |
| Commits since prior review (`3743785`) | 8 — review fixes + pipeline/intake follow-ups |

### Primary deliverable — DRA + in-house radiology

Diagnostic results approval workflow (lab + radiology): ops submit → pathologist/radiologist approve/reject → clinician visibility only after release; in-house radiology text + PDF entry; approval queues; SSE for stat/critical pending.

### Post-review commits (since 2026-09-07 report)

| Commit | Summary |
|--------|---------|
| `b97e67f` | Backend DRA arrow functions; redaction keys → constants |
| `b48afd3` | Trim reject reason **before** AJV minLength |
| `3bd2649` | MCH-style orders route registration (sub-plugins) |
| `037b4b7` | Arrow legacy order handlers; schema-only result body fields |
| `7ac28f4` | Send-out upload UX; tracker sync after approval actions |
| `e981f4f` | Tracker pipeline from item release; visit-scoped intake; Load Template hidden |

### Bundled (review risk)

| Merge | Content |
|-------|---------|
| **#55** | clinicalForms module, nutrition/dental templates, form builder |
| **#56** | Clinical form print |
| Ops commits | preview-l2 deploy, auth baseURL fix, seed scripts |

---

## 3. Validation run (local, HEAD `e981f4f`)

| Check | Result |
|-------|--------|
| `backend npm test` | **465 passed** (62 files) |
| `backend npm run test:integration -- orders-approval-radiology` | **20/20 passed** |
| `backend responses.service.test.ts` | **16/16 passed** (includes visit_id filter tests) |
| Frontend order/mapping/tracker tests | **77 passed** |
| `npm run lint` | **0 errors** (18 pre-existing warnings) |
| `npx tsc -b` | **Pass** |

Integration tests remain excluded from default `npm test` — CI must run `test:integration` separately.

---

## 4. Reviewer comment reconciliation (`specs/pr-reviews/`)

| Plan | Reviewer theme | Status at `e981f4f` | Commit(s) |
|------|----------------|---------------------|-----------|
| [pr-58-tracker-arrow-functions](../../specs/pr-reviews/pr-58-tracker-arrow-functions.md) | Arrow functions in lab/radiology trackers | **Fixed** — 14 helpers `const … =>` | `b97e67f`, extended in `e981f4f` |
| [pr-58-arrow-functions](../../specs/pr-reviews/pr-58-arrow-functions.md) | Backend DRA services → arrow exports | **Fixed** — `approval.service.ts`, `orderResultRedaction.ts`, radiology/completion/cleanup | `b97e67f`, `037b4b7` |
| [pr-58-orders-route-registration](../../specs/pr-reviews/pr-58-orders-route-registration.md) | Route register MCH/clinicalForms pattern | **Fixed** — `approval.routes.ts`, `radiologyReports.routes.ts`, `ordersCore.routes.ts`, aggregator | `3bd2649` |
| [pr-58-order-results-approval-move](../../specs/pr-reviews/pr-58-order-results-approval-move.md) | Move approval helpers out of `orderResults.ts`; `APPROVAL_STATUS` | **Fixed** — `approvalWorkflow.ts` owns types/helpers; `orderResults.ts` PDF-only | `b97e67f` area |
| [pr-58-approval-workflow-types-split](../../specs/pr-reviews/pr-58-approval-workflow-types-split.md) | Types vs constants split | **Resolved** — consolidated single `approvalWorkflow.ts` (matches `labFulfillment.ts` pattern) | — |
| [pr-58-order-priority-constants](../../specs/pr-reviews/pr-58-order-priority-constants.md) | `ORDER_PRIORITY` in approval path | **Fixed** — `DiagnosticApprovalQueue`, `approvalWorkflow.ts` | prior |
| [pr-58-order-priority-forms-badge](../../specs/pr-reviews/pr-58-order-priority-forms-badge.md) | Priority in forms + `OrderStatusBadge` | **Fixed** | prior |
| [pr-58-lab-order-status-api-constants](../../specs/pr-reviews/pr-58-lab-order-status-api-constants.md) | `ORDER_STATUS` in lab mapping | **Fixed** | prior |
| [pr-58-encounter-report-availability-const-types](../../specs/pr-reviews/pr-58-encounter-report-availability-const-types.md) | Encounter report availability const/types | **Fixed** | prior |
| [pr-58-facility-availability-constants](../../specs/pr-reviews/pr-58-facility-availability-constants.md) | Facility availability from catalog | **Fixed** | prior |
| [pr-58-schema-error-messages](../../specs/pr-reviews/pr-58-schema-error-messages.md) | Title Case AJV messages on DRA schemas | **Fixed** — includes `approvalStatus` list filter | prior |

### Prior security/DRA findings (2026-09-07 report)

| ID | Finding | Status |
|----|---------|--------|
| **C1** | Missing response schemas on radiology/approval routes | **Fixed** |
| **C2** | Upload signed-URL not org-scoped | **Fixed** |
| **N1** | Unreleased PHI on GET/list | **Fixed** |
| **N2** | `has_report_pdf` ignored in-house radiology | **Fixed** |
| **N3** | Approval writes not transactional | **Fixed** |
| **N4** | Integration tests missing reject route | **Fixed** (now 20 integration tests) |
| **N5 / W4** | GET order detail response schema | **Fixed** |
| **W4** | Whitespace-only reject reason | **Fixed** — `trimRejectReasonPreValidation` pre-AJV (`b48afd3`) |
| **N6** | Pending radiology editable without withdraw | **Fixed** |
| **N7** | Upload replace orphans MinIO object | **Fixed** |
| **W2 (403)** | Inconsistent 403 envelope | **Fixed** |
| **S3** | SSE approval event tests | **Fixed** |

---

## 5. New / remaining findings

### WARNING

#### W1 — Monolithic PR (unchanged)

359 files: DRA, #55, #56, ops, plus post-review fixes. Document merge rationale in PR body; bisect/revert cost remains high.

#### W2 — Legacy order routes still lack response schemas

Approval + radiology sub-plugins comply. Pre-existing create/PATCH/send-out routes in `ordersCore.routes.ts` / `orderItems.routes.ts` remain body/params-only. Fast-follow acceptable.

#### W3 — Bundled #55 breaking change (`/api/mch/*`)

No `/api/mch` references remain in TS. Confirm external consumers / deployment runbook before merge.

#### W4 — Integration tests not in default `npm test`

DRA + screening unit tests pass; integration suite must run in CI explicitly.

---

### SUGGESTION (latest commit `e981f4f`)

- **S1:** `listResponsesQuerySchema.visit_id` could use Title Case `errorMessage` (`Visit must be a valid UUID`) for consistency with create schema.
- **S2:** Radiology `DELIVERED` marker appended to `diagnostic_orders.notes` on completion mirrors lab fulfillment markers — acceptable but document in ops/training (tracker reads marker + item release).
- **S3:** Reply on each GitHub review thread with the draft text from the corresponding `specs/pr-reviews/pr-58-*.md` plan (even though code is fixed).

---

## 6. Latest commit review (`e981f4f`)

### Lab & radiology tracker pipelines — **Pass**

- `inHousePipelineStatusForTab` / `labRowPipelineKey` derive step from **per-item release state**, not stale order-level status — fixes in-house and send-out stuck before Resulted.
- `mapApiOrderToLabStatus` / new `radiologyOrderStatus.mapping.ts` honor `allItemsReleased`.
- `orderCompletion.service.ts` appends `radiology:delivered` marker when all radiology items released.
- Unit tests added/updated in mapping + tracker test files.

### Visit-scoped intake screening — **Pass**

- Backend `listResponses` / `getCompletion` filter by `visit_id` when phase is visit-scoped; returns `[]` / incomplete if visit missing (safe default).
- Frontend `useScreeningResponses` / `IntakeTab` pass `visitId`; query keys include visit scope.
- 4 new service tests for visit filter behavior.

### Load Template toolbar — **Pass (product decision)**

- Commented out in `ConsultationStageNav.tsx` and `consultationWorkspace/index.tsx` with standup rationale; Care Templates tab remains.

---

## 7. What went well

- All captured @hemantinfinia convention comments addressed (constants, arrow functions, route registration, schema messages).
- Approval lifecycle + PHI redaction + org-scoped uploads remain solid after hardening commits.
- Post-review commits are focused, tested, and match reported production bugs (tracker pipeline, return-patient intake).
- Route refactor preserves URLs; integration tests are the contract (20/20 green).

---

## 8. Spec alignment (DRA)

| Requirement | Status |
|-------------|--------|
| Ops submit; clinician sees only after approve | **Pass** |
| Per line item submit/approve/reject | **Pass** |
| Radiology in-house report + PDF | **Pass** |
| Approval queue UI | **Pass** |
| SSE on stat/critical pending (DRA-4) | **Pass** |
| Pathologist role prerequisite | **Pass** |

---

## 9. Verdict

| Gate | Status |
|------|--------|
| Hub PR review plans (`specs/pr-reviews/pr-58-*`) | **All implemented** |
| DRA security (PHI, auth, transactions) | **Fixed** |
| Reviewer convention fixes (arrow, routes, constants) | **Fixed** |
| Latest functional fixes (`e981f4f`) | **Pass** — tested |
| Bundled scope / #55 `/api/mch` | **Open** — product/process, not code blocker |
| Live GitHub thread export | **Not verified** — run `gh auth login` before merge sign-off |

**APPROVE** on code quality and reviewer feedback resolution.

Before merge: confirm CI runs integration tests; document bundled release + `/api/mch` stance in PR body; reply/resolve GitHub threads using plan draft replies.

---

## 10. Recommended next steps

1. Author: post threaded replies on PR #58 referencing each fix (use draft replies in `specs/pr-reviews/`).
2. Author: PR body section — DRA slices, #55/#56 merges, ops commits, breaking `/api/mch` note.
3. CI: `npm run test:integration` + full frontend `npm test`.
4. QA: manual pass on lab in-house/send-out + radiology pipeline; return patient Intake shows current visit only.
