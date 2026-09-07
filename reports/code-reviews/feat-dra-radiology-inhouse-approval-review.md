# Code Review — `feat/dra-radiology-inhouse-approval` (his-global-south) — Re-review

| Field | Value |
|-------|--------|
| **Branch** | `feat/dra-radiology-inhouse-approval` |
| **Committed** | `7af4689` — *feat(clinical): diagnostic approval workflow and in-house radiology report UX* |
| **Working tree** | **Uncommitted review fixes** (+267 / −54 across 8 files; 2 new test files) — **commit before opening PR** |
| **Base (intended)** | `develop` |
| **Specs** | [diagnostic-results-approval-workflow.md](../../specs/features/his-global-south/diagnostic-results-approval-workflow.md), slices 1–4; [encounter-lab-radiology-reports.md](../../specs/features/his-global-south/encounter-lab-radiology-reports.md) |
| **Reviewer** | AI code-review skill |
| **Date** | 2026-09-07 (re-review) |
| **Verdict** | **REQUEST CHANGES** |

---

## Summary

Re-review after first-pass fixes for response schemas, upload signed-URL org scope, 403 envelope, and integration tests. Those **first-pass blockers are resolved in the local working tree** (not yet on `origin`). Tests run clean on the fixed tree.

**New blocker:** `GET /api/clinical/orders/:id` and list still return **unreleased lab/radiology PHI** (`result_value`, `radiology_report_content`, `radiology_report_upload_id`) to any org-authenticated user. `canViewReportDocumentsForItem()` is enforced on `report-documents` only — not on order read. This PR embeds radiology content in order JSON, widening the leak for in-house radiology. Spec §4 requires doctors see results only after release.

**Tests run (local, including uncommitted fixes):**

| Suite | Result |
|-------|--------|
| `orders-approval-radiology.integration.test.ts` | **7/7 pass** |
| `org.uploadSignedUrl.service.test.ts` | **2/2 pass** |
| `approval.service.test.ts` | 10/10 pass |
| `RadiologyOrderTracker.test.tsx` | 17/17 pass |
| `DiagnosticApprovalQueue.test.tsx` | 1/1 pass |
| `npm run build` (backend) | Pass |

---

## First-pass findings — status

| ID | Finding | Status |
|----|---------|--------|
| **C1** | Missing `schema.response` on radiology report routes | **Fixed locally** — `orders.schema.ts` + wired in `orders.routes.ts` |
| **C2** | Upload signed-URL no org filter | **Fixed locally** — `getUploadSignedUrl(id, orgId)` filters `organization_id` |
| **W2** | Inconsistent 403 envelope on radiology handlers | **Fixed locally** — `sendForbiddenRole` / `sendOrderServiceError`; `requireAnyRole` nested envelope |
| **W3** | No integration tests for approval / radiology upload | **Partially fixed** — 7 route tests; reject flow still missing |
| **W1** | Monolithic PR scope | Open |
| **W4** | GET order detail without response schema | Open |
| **W5** | Whitespace-only reject reason | Open |

---

## New / remaining findings

### CRITICAL

#### N1 — Unreleased PHI on order read APIs

`orderItemsJsonAggSql()` always projects result fields and radiology report content/upload id. Order detail and list handlers return the full aggregate with no role-based redaction.

```42:86:projects/his-global-south/backend/src/modules/clinical/orders/orders.mapping.ts
      'result_value',    ${diagnostic_order_items.result_value},
      ...
      'radiology_report_content', (
        SELECT r.content FROM ${radiology_reports} r
        ...
      ),
      'radiology_report_upload_id', (
        SELECT r.upload_id FROM ${radiology_reports} r
        ...
      )
```

`canViewReportDocumentsForItem()` exists in `approval.service.ts` and gates `listReportDocuments` — but `getDiagnosticOrderHandler` / list do not use it.

**Impact:** Any org user with order read access (e.g. ordering doctor) can fetch pending/draft results via API, bypassing encounter-tab UI gating. Frontend `getRadiologyReport()` in `ordersWorkspace.service.ts` relies on the same order payload.

**Fix:** After loading order(s), redact per-item fields when `!canViewReportDocumentsForItem(callerRoles, item)` — null out `result_value`, `result_components`, `radiology_report_content`, `radiology_report_upload_id`, `rejection_reason`. Apply to detail **and** list. Add integration test: doctor role + `pending_approval` item → no result body fields.

---

### WARNING

#### N2 — `has_report_pdf` ignores in-house radiology uploads

Subquery only checks `diagnostic_order_item_documents`. In-house PDFs use `radiology_reports.upload_id`. Tracker `hasReportPdf` may be false for PDF-only pending radiology → “View Report” affordance may not appear.

**Fix:** Extend EXISTS subquery to include `radiology_reports.upload_id IS NOT NULL`.

#### N3 — Approval writes not transactional

Submit / approve / reject update `diagnostic_order_items` and `radiology_reports` in separate statements. Mid-flight failure can desync statuses.

**Fix:** Wrap each flow in `db.transaction()`.

#### N4 — Integration tests missing reject route

New suite covers submit, approve 403, radiology CRUD, signed-url 404 — not `POST …/reject` (happy path, 403, 422).

#### N5 — GET order detail still without response schema (W4)

PR adds embedded approval + radiology fields; handler still has no `schema.response`. OpenAPI sweep / serialization drift risk.

#### N6 — Pending-approval radiology row still editable in UI

`RadiologyResultEntryDrawer` only disables `verified`; save/upload on `pending_approval` can silently withdraw from queue via service. Consider explicit “Withdraw & edit” vs accidental edit.

#### N7 — Upload replace may orphan prior MinIO object

`linkRadiologyReportUpload` overwrites `upload_id` without deleting the previous upload row/object.

#### W1 — Monolithic PR (unchanged)

Single commit bundles DRA 1–4, ELR embed, radiology in-house, MinIO, lab panels. Hard to revert/bisect.

---

### SUGGESTION

- **S1:** Split orders workspace client into focused API modules as it grows.
- **S2:** Surface `uploads.filename` in order item JSON for PDF chip label on reload.
- **S3:** Add `useRealtimeSync` tests for DRA-4 approval SSE events.
- **S4:** Delete stale remote `origin/feat/diagnostic-approval-radiology-reports`.

---

## What went well

- Approval lifecycle (`draft_ops` → `pending_approval` → `released` / `rejected`) mirrored on `radiology_reports.status`.
- Ops vs approver role separation (`LAB_ROLES`/`RADIOLOGY_ROLES` vs `LAB_APPROVE_ROLES`/`RADIOLOGY_APPROVE_ROLES`).
- **Review fixes:** radiology routes now declare full response schemas; signed URLs org-scoped; nested 403 envelope consistent with approval routes.
- Encounter tab gating via `encounterReportAvailability` — correct UI behavior for clinicians.
- In-house radiology UX: PDF chip + remove, text persisted on attach, viewer shows text **and** PDF.
- Migrations 029–031 with `COMMENT ON COLUMN` and grandfather released results.
- MinIO presign fixes with unit tests.
- Targeted frontend tests for tracker and approval queue.

---

## Spec alignment

| Area | Spec intent | Status |
|------|-------------|--------|
| Ops submit, approver release | DRA workflow | Implemented |
| Encounter tab only released results | ELR + DRA §4 | **UI pass; API fail (N1)** |
| In-house radiology text + PDF | radiology-report-entry | Implemented |
| Pathologist role seed | DRA prerequisite | Migration 029 |
| SSE / realtime (DRA-4) | Slice 4 | Wired (`useRealtimeSync` + event bus); no automated SSE test |

---

## Security checklist

| Check | Status |
|-------|--------|
| Org auth on clinical routes | Pass |
| Role gates ops vs approver | Pass |
| Upload signed-URL org scope | **Pass (local fix)** |
| Unreleased PHI on order GET/list | **Fail (N1)** |
| Unreleased PDF via report-documents | Pass |
| Parameterized SQL (Drizzle) | Pass |
| PHI in logs | Not observed |

---

## Recommended actions before merge

1. **Commit** local review fixes (schemas, signed URL, 403 envelope, integration + unit tests).
2. **Must fix:** N1 — server-side redaction on order read/list using `canViewReportDocumentsForItem`.
3. **Should fix:** N2 (`has_report_pdf`), N4 (reject integration tests), N3 (transactions) — same PR or immediate fast-follow.
4. **Consider:** W1 split or document combined release rationale in PR body.

---

## Verdict

**REQUEST CHANGES** — first-pass C1/C2 are fixed locally; **commit those changes**, then address **N1 (unreleased PHI on order read)** before merge. N2–N4 strongly recommended in the same PR.
