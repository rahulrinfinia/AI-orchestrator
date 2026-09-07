# Technical Design: Radiology Report Entry (In-House)

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `radiology-report-entry` |
| **PRD** | [prd.md](./prd.md) |
| **Target repo** | `projects/his-global-south/` @ `feat/emergency-triage` |
| **Status** | Draft — pending implementation approval |
| **Date** | 2026-09-03 |
| **Depends on** | Existing `enterOrderResultsHandler` (already role-gated for radiology), existing `uploads`/MinIO pipeline, existing `diagnostic_order_item_documents` pattern (labs' send-out report PDFs) |

---

## 0. Non-regression constraint

**Additive only — no existing table, endpoint, or component is modified in place.**

- `diagnostic_order_items` — no column changes. Only new **rows are updated** via the same `enterOrderResults`-style write, and only for radiology order items going through this new flow (dual-write, see §3).
- `diagnostic_order_item_documents`, `uploads`, MinIO storage client — reused as-is, zero changes.
- `LabResultEntryDrawer.tsx`, `enterOrderResultsHandler` (lab path), send-out radiology flow (`SendOutReportDialog.tsx`, `AssignSendOutFacilityDialog.tsx`) — untouched.
- The shared diagnostic-orders **list endpoint** is not modified (this is the "Option A vs Option B" decision below — Option A chosen specifically to avoid touching this shared code path).

**Segregation of duties (settled — self-verification allowed):** the `radiologist_id` (drafter) and `verified_by` (verifier) fields on `radiology_reports` can be the same person. Checked directly: labs' own `enterOrderResults` sets `result_value` and `verified_by` in one call by the same actor — there is no drafter≠verifier control anywhere else in this codebase (confirmed earlier for claims/pre-auth approvals too). Consistent with that, this feature does **not** add a creator≠verifier check. Recorded here as a conscious decision, not an oversight.

---

## 1. Design summary

New, radiology-only table (`radiology_reports`) plus a new write endpoint and a new frontend entry drawer, modeled directly on the existing lab result-entry pattern rather than inventing a new one.

| Concern | Decision |
|---|---|
| Report content storage | New `radiology_reports` table, not new columns on the shared `diagnostic_order_items` |
| Narrative fields (findings/impression/recommendation) | `jsonb` column — matches existing precedent (`emergency-triage-records.investigations`, `ai-clinical-context.*`) for shape-varies clinical content |
| Structured/queryable fields (timestamps, who verified, critical flag) | Real typed columns, not buried in jsonb — needed for filtering/sorting/badges |
| Report PDF | FK to existing `uploads` table (`upload_id`), reusing the existing MinIO-backed upload pipeline — no new storage mechanism |
| Amendments | New row with `amends_report_id` self-FK, never an overwrite — matches `clinical_observations.status` + provenance precedent already in this module |
| "Current report for this item" lookup | Composite index `(diagnostic_order_item_id, created_at DESC)`, same shape as `diagnostic_order_item_documents`'s `idx_doid_item` — no uniqueness constraint (would block amendments) |
| Critical-banner / report-available badge compatibility | **Dual-write** (Option A) — see §3 |

---

## 2. Schema — `radiology_reports`

New migration: `backend/src/db/migrations/024_radiology_reports.sql`

```sql
CREATE TABLE public.radiology_reports (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnostic_order_item_id    uuid NOT NULL
    REFERENCES public.diagnostic_order_items(id) ON DELETE CASCADE,
  organization_id             uuid NOT NULL
    REFERENCES public.organizations(id) ON DELETE CASCADE,
  status                      text NOT NULL DEFAULT 'draft',
  amends_report_id            uuid
    REFERENCES public.radiology_reports(id),
  is_critical                 boolean NOT NULL DEFAULT false,
  content                     jsonb NOT NULL DEFAULT '{}'::jsonb,
  upload_id                   uuid
    REFERENCES public.uploads(id) ON DELETE SET NULL,
  pacs_url                    text,
  radiologist_id              uuid REFERENCES public.profiles(id),
  reported_at                 timestamptz,
  verified_by                 uuid REFERENCES public.profiles(id),
  verified_at                 timestamptz,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT radiology_reports_status_check
    CHECK (status IN ('draft', 'verified', 'amended', 'cancelled'))
);

CREATE INDEX idx_radiology_reports_item
  ON public.radiology_reports (diagnostic_order_item_id, created_at DESC);

CREATE INDEX idx_radiology_reports_organization
  ON public.radiology_reports (organization_id);

ALTER TABLE public.radiology_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY radiology_reports_org_isolation ON public.radiology_reports
  USING (organization_id = get_user_organization());

CREATE TRIGGER update_radiology_reports_updated_at
  BEFORE UPDATE ON public.radiology_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

*(Trigger added on audit — this codebase has an established, reusable `public.update_updated_at_column()` function attached to every baseline table with `updated_at`; confirmed dozens of `CREATE TRIGGER update_<table>_updated_at ...` lines in `001_baseline_from_pgschema.sql`. Note `009_emergency_triage_records.sql`, the most recent same-module precedent, omitted this — likely an oversight there, not a pattern to repeat.)*

*(Corrected from an earlier join-based draft — verified against the most recent same-module precedent, `009_emergency_triage_records.sql`, which uses a direct `organization_id = get_user_organization()` check rather than joining through a parent table. Simpler and matches the more common pattern across this codebase; valid since `radiology_reports` stores its own `organization_id`.)*

**Amendment mechanics (previously underspecified):** when `upsertRadiologyReport` is called with `amends_report_id` set, the service must, in the same transaction:
1. Insert the new row (`status = 'draft'` or `'verified'`, `amends_report_id = <original id>`).
2. Update the **original** row's `status` to `'amended'`.

This makes a superseded report directly identifiable by its own `status` column, not only by checking whether a newer row references it.

`content` jsonb shape (validated at the API boundary via zod, not a DB constraint — matches `*.schema.ts` convention):

```ts
{
  findings?: string;
  impression?: string;
  recommendation?: string;
}
```

Drizzle mirror: `backend/src/modules/clinical/pgschema/radiology-reports.pgschema.ts` (follows the exact structure of `diagnostic-order-item-documents.pgschema.ts` — same imports, same `foreignKey()`/`pgPolicy()`/`check()` builder pattern, same file header comment convention).

---

## 3. Dual-write decision (Option A vs. Option B)

**Problem:** `RadiologyOrderTracker.tsx` derives two UI signals from the **lab-shaped** columns on `diagnostic_order_items`, not from any radiology-specific source:
- `isCritical` ← `abnormal_flag === 'critical'`
- `reportAvailable` ← `result_value` non-empty

If radiology report writes go **only** to the new `radiology_reports` table, these two signals never update — the critical banner and "Report Available" badge silently stop working for radiology.

**Option A (chosen): dual-write, gated on verification — not on every draft save.** A draft is not yet clinically signed off; showing "Report Available" or firing the critical banner off an unverified draft would be misleading to the ordering doctor. So the dual-write only fires when `upsertRadiologyReport` is called with `status = 'verified'` (i.e. on the verify action, not the draft-save action). At that point it sets, on the linked `diagnostic_order_items` row:
- `abnormal_flag = 'critical'` if `is_critical = true`, else `'normal'`
- `result_value` = a short derived summary (e.g. truncated impression) — sufficient to make `reportAvailable` true
- `resulted_at = now()`, `verified_by = <actor>` — reuses the exact same columns/semantics `enterOrderResults` already writes for labs

A draft save writes only to `radiology_reports` (`status = 'draft'`) — no dual-write, no badge change, nothing visible on the tracker yet. This also means order auto-completion (§4a) now naturally only fires once a report is verified, not on a bare draft — which is the clinically correct behavior anyway.

**Option B (rejected for this pass): update the shared list endpoint** (`listDiagnosticOrders` in `orders.service.ts`) to join `radiology_reports` directly instead of relying on the lab-shaped columns. More correct long-term (no duplicated data), but this endpoint is **shared with labs** — modifying it carries real regression risk to the lab list view for a fix that's radiology-only. Deferred as a separate, carefully-scoped follow-up.

---

## 4. Backend

### 4a. Write path

- `backend/src/modules/clinical/orders/radiologyReports.service.ts` (new, sibling to `reportDocuments.service.ts`):
  - `upsertRadiologyReport(orderItemId, orgId, { reportId, content, isCritical, radiologistId, status }, actorId)` — **draft-vs-amendment logic (added on audit, previously unspecified):**
    - `reportId` given, target row `status = 'draft'` → **UPDATE in place** (`content` is a full replace of the jsonb object, not a merge; bumps `updated_at` via the trigger above). This is the normal "save my draft, keep editing" path — it must not create a new row every save, or the amendment chain below gets polluted with autosave noise.
    - `reportId` given, target row already `verified`/`amended`/`cancelled` → **reject** (400) — caller must go through the explicit amendment path instead, never silently overwrite a finalized report.
    - No `reportId` → **INSERT** a new row (first draft for this item).
    - Amendment path (explicit `amends_report_id` passed, target must be `verified`): inserts a new row and updates the original row's `status` to `'amended'`, in the same `db.transaction()` — this is a new pattern for this module, not an existing one; verified Drizzle over the `pg` Pool client here supports `.transaction()` natively.
    - Performs the dual-write from §3 only when the resulting row's `status = 'verified'`.
    - **Minimum-content rule (settled):** verifying (`status → 'verified'`) requires non-empty `content.findings` **and** `content.impression`. `recommendation` stays optional. Draft saves have no such requirement — a radiographer can save a partial draft freely. Reject verify attempts on empty findings/impression with 400.
  - `linkRadiologyReportUpload(reportId, orgId, uploadId, actorId)` — `assertPdfUpload()` in `reportDocuments.service.ts` is currently **module-private (not exported)**; either export it as-is for reuse, or duplicate the (small) org/mime-type check. Prefer exporting — same validation, no duplication.
- **New role: `radiologist` (settled — was previously going to reuse the broad `RADIOLOGY_ROLES` gate for everything; narrowed after review).** `app_role` is a real Postgres ENUM (`CREATE TYPE public.app_role AS ENUM (...)`, baseline migration) — no `radiologist` value exists today, only `radiographer` (the imaging technician, not the reporting physician). Adding it requires:
  - New migration: `ALTER TYPE public.app_role ADD VALUE 'radiologist';`
  - Add the value in all 6 places `radiographer` is currently listed: `backend/src/db/schema/enums.ts`, `backend/src/middleware/require-roles.ts`, `backend/src/modules/platform/platform.constants.ts`, `src/constants/clinicalRoles.ts`, `src/platform/constants/hospitals.ts`, `src/config/staticRoleAccess.ts`.
  - New role-set in `require-roles.ts`: `RADIOLOGY_VERIFY_ROLES = new Set([...CLINICAL_ROLES /* super_admin, admin, provider_admin, doctor, etc. — matches how other role-sets always include the admin tier */, 'radiologist'])` — used **only** for the verify action.
- New route in `orders.routes.ts`, handler in `orders.controller.ts`:
  - **Draft save/update** — gated by the existing `RADIOLOGY_ROLES` (unchanged, includes `radiographer` — the technician can capture and save draft findings, matching real workflow).
  - **Verify action** — gated by the new `RADIOLOGY_VERIFY_ROLES` instead of the broad `RADIOLOGY_ROLES`. This intentionally removes `nurse`/`pharmacist`/`lab_tech`/`phlebotomist`/etc. from being able to sign off a radiology report — they were only ever able to because the broad lab-shaped gate was being reused, which was never actually correct for this action.
  ```ts
  const allowed = action === 'verify' ? RADIOLOGY_VERIFY_ROLES : RADIOLOGY_ROLES;
  if (!hasAnyRole(roles, allowed)) return reply.code(403).send({...});
  ```
- Order auto-completion: reuse the same "complete once every item is resulted" check `enterOrderResults` already has (`NOT EXISTS ... WHERE resulted_at IS NULL`), which the dual-write's `resulted_at` write satisfies for free.
- New `UPLOAD_CATEGORY.RADIOLOGY_REPORT` constant in `backend/src/modules/clinical/clinical.constants.ts` (**corrected** — not `platform.constants.ts` as an earlier draft of this doc said; the existing `LAB_RESULT` entry lives at `clinical.constants.ts:291`, mirrored on the frontend at `src/clinical/constants/orders.ts:112`).

### 4b. Read path — previously missing from this design, now made concrete

Traced `getRadiologyReport()` (`src/services/ordersWorkspace.service.ts:916`) end to end: it calls the **generic order-detail endpoint**, `GET /api/clinical/orders/:id`, and derives every displayed field purely from the `items` array already embedded in that response. That `items` array is built by a single shared function, `orderItemsJsonAggSql()` (`backend/src/modules/clinical/orders/orders.mapping.ts:8-43`), used by **both** the list and detail endpoints (`orders.service.ts:399` and `:443`).

**Concrete fix (found on audit, replaces the earlier vague plan):** that function already has the exact pattern needed — `has_report_pdf` and `latest_report_document_id` are computed via a `SELECT ... FROM diagnostic_order_item_documents ... ORDER BY created_at DESC LIMIT 1` subquery. Add equivalent fields the same way, against `radiology_reports`:
```sql
'radiology_report_id',          (SELECT id FROM radiology_reports WHERE diagnostic_order_item_id = diagnostic_order_items.id ORDER BY created_at DESC LIMIT 1),
'radiology_report_status',      (SELECT status FROM radiology_reports WHERE diagnostic_order_item_id = diagnostic_order_items.id ORDER BY created_at DESC LIMIT 1),
'radiology_report_content',     (SELECT content FROM radiology_reports WHERE diagnostic_order_item_id = diagnostic_order_items.id ORDER BY created_at DESC LIMIT 1),
'radiology_report_is_critical', (SELECT is_critical FROM radiology_reports WHERE diagnostic_order_item_id = diagnostic_order_items.id ORDER BY created_at DESC LIMIT 1),
'radiology_report_upload_id',   (SELECT upload_id FROM radiology_reports WHERE diagnostic_order_item_id = diagnostic_order_items.id ORDER BY created_at DESC LIMIT 1),
```
This automatically flows through to both the list and detail responses for free, since both already consume this one function.

**Draft-visibility split (new finding) — resolved at the frontend, not with two backend paths:** the read-only viewer and the write/edit drawer have opposite needs for the same data — one must never show an unverified draft as final, the other needs exactly that draft to resume editing. Since both now read the same embedded fields:
- `getRadiologyReport()` (feeds the read-only `RadiologyReportDrawer`) — only treats `radiology_report_status === 'verified'` as a real report, returns `null` otherwise. Mirrors its own existing guard in that function (`if (!findings && status !== 'completed') return null`).
- `RadiologyResultEntryDrawer` (the write path) — loads the row regardless of status, so the author can resume their own draft.

No second backend endpoint needed — one field set, two frontend interpretations.

---

## 5. Frontend

- New `src/components/orders/RadiologyResultEntryDrawer.tsx`, structurally mirroring `LabResultEntryDrawer.tsx`:
  - Takes only `orderId` as a prop (not an item id) — internally fetches the full order detail (same call shape as labs' `getOrderForResultEntry(orderId)`), then renders **one report-entry section per `diagnostic_order_item_id`** in that order. This is required, not optional polish: `RadiologyOrderListItem` (the table-row type) is order-level only — `procedure: string` plus `procedures?: string[]` (names only, no ids) — with no per-item breakdown for in-house studies (unlike send-out's `sendOutItems: SendOutLineItem[]`). A multi-study order has no other way to know which study's report to open. Mirroring `LabResultEntryDrawer.tsx:28-52`'s exact pattern (fetch full order + items on open, one card per item) resolves this without adding new fields to `RadiologyOrderListItem` — the per-item `radiology_report_*` fields already land on every item via the §4b change to `orderItemsJsonAggSql()`.
  - Findings / Impression / Recommendation fields (free text, map to `content`)
  - Critical-finding control — either a checkbox or reuse labs' `ABNORMAL_FLAG_OPTIONS` 4-way dropdown for visual consistency (open choice, default to a simple checkbox for v1)
  - PDF attach control, reusing `uploadPlatformFile(file, UPLOAD_CATEGORY.RADIOLOGY_REPORT)` (new category value) then `linkRadiologyReportUpload`
- `RadiologyOrderTracker.tsx`: row `onClick` currently opens the **read-only** `RadiologyReportDrawer` unconditionally for every non-send-out order (`if (order.referOut) return;` then opens it) — this stays unchanged, for viewing. A **new, separate "Enter/Edit Report" button is added to the Action column** for in-house orders (that column currently renders nothing for most in-house rows, per the earlier investigation) to open `RadiologyResultEntryDrawer`. Row-click = view; new button = write. No ambiguity between the two.
- `ordersWorkspace.service.ts`: `getRadiologyReport()` updated to read real `radiology_reports` fields instead of the current hardcoded `recommendation: ""`, `radiologist: "—"`, `pacsAvailable: false` stubs.
- New `UPLOAD_CATEGORY.RADIOLOGY_REPORT` constant alongside the existing `LAB_RESULT` one.

---

## 6. Known limitation (explicitly out of scope, per PRD §7)

The UI's 6-value status pipeline (Ordered/Arrived/Imaging Done/Report Drafted/Report Verified/Delivered) continues to collapse onto the DB's 5 generic states (`pending/collected/processing/completed/cancelled`) exactly as it does for labs today. This feature does not widen that enum. Arrived vs. Imaging Done vs. Report Drafted remain visually distinct only within a single session's derived label, not truly persisted as separate states.

---

## 7. Validation plan

Per repo CI-matching rules:
- `backend/**` changes → `npm run build` inside `backend/`
- `src/**` changes → `npm run lint` then `npx tsc -b` at repo root
- Migration + schema changes → integration tests covering: report create, dual-write correctness (critical banner fires), amendment creates new row without mutating original, RLS org-scoping, and a regression check that lab result entry and send-out radiology reporting are unaffected

---

<!-- Implementation not started — pending explicit go-ahead per project workflow. -->
