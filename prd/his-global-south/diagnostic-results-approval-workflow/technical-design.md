# Technical Design: Diagnostic Results — Approval Workflow (Lab + Radiology)

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `diagnostic-results-approval-workflow` |
| **PRD** | [prd.md](./prd.md) |
| **Implementation spec** | [specs/features/his-global-south/diagnostic-results-approval-workflow.md](../../../specs/features/his-global-south/diagnostic-results-approval-workflow.md) |
| **Target repo** | `projects/his-global-south/` |
| **Status** | Draft — pending Gate G2 approval |
| **Date** | 2026-09-05 |
| **Blocks** | [Encounter Reports & Documents](../encounter-lab-radiology-reports/prd.md) (doctor UI reads `approval_status`) |
| **Depends on** | Existing orders module, `enterOrderResults`, `reportDocuments.service`, `radiologyReports.service`, orchestration SSE |

---

## 0. Architecture decisions (AD-N)

| ID | Decision | Rationale |
|----|----------|-----------|
| **AD-1** | **`diagnostic_order_items.approval_status`** is the clinician visibility source of truth | Single field for encounter tab, report-document GET gates, and queues |
| **AD-2** | **`resulted_at` and order auto-complete run on approve (`released`)**, not on ops save or submit | Today `resulted_at` means “live to doctor”; product requires approver release |
| **AD-3** | Ops **save** (lab enter / rad report / PDF link) stores data but stays **`draft_ops`** until explicit **Submit for approval** | Reject loop can send back to ops without doctor ever seeing partial saves |
| **AD-4** | **One shared approval service** for lab + radiology item actions (submit / approve / reject) | Symmetric APIs; modality-specific prep stays in existing services |
| **AD-5** | **Bedside POC:** set `approval_exempt = true` + `approval_status = released` + `resulted_at` in one transaction on `recordBedsidePocResult` path | Only bypass; detected via order `clinical_indication` or explicit flag on create |
| **AD-6** | **Grandfather existing rows:** migration backfills `approval_status = released` where `resulted_at IS NOT NULL` | Avoid breaking prod/demo data already “live” |
| **AD-7** | Doctor read of PDFs: **`listReportDocumentsHandler` returns 403** when item not `released` (unless caller has approve role reviewing queue) | Backend enforces PRD, not UI-only hiding |
| **AD-8** | Radiology **`dualWriteAndMaybeComplete` moves from `upsertRadiologyReport(verified)` to approve handler** | Aligns with AD-2; ops submit no longer verifies inline |

---

## 1. Design summary

Introduce item-level approval state on `diagnostic_order_items`, three new REST actions, two approval-queue UIs, platform roles (`pathologist`, wire `radiologist`), and optional SSE alert — **without** a new LIS/RIS module or team-assignment tables.

```text
Ops save (draft_ops) → Submit (pending_approval) → Approve (released) | Reject (rejected → ops fix → resubmit)
Bedside POC ────────────────────────────────────────→ released (approval_exempt)
```

---

## 2. Schema

### 2.1 Migration `029_pathologist_role.sql`

```sql
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'pathologist';
```

*( `radiologist` already in enum — migration `024_radiologist_role.sql`.)*

### 2.2 Migration `030_diagnostic_order_item_approval.sql`

Add to `public.diagnostic_order_items`:

```sql
ALTER TABLE public.diagnostic_order_items
  ADD COLUMN approval_status text,
  ADD COLUMN submitted_for_approval_at timestamptz,
  ADD COLUMN submitted_by uuid REFERENCES public.profiles(id),
  ADD COLUMN approved_at timestamptz,
  ADD COLUMN approved_by uuid REFERENCES public.profiles(id),
  ADD COLUMN rejected_at timestamptz,
  ADD COLUMN rejected_by uuid REFERENCES public.profiles(id),
  ADD COLUMN rejection_reason text,
  ADD COLUMN approval_exempt boolean NOT NULL DEFAULT false;

ALTER TABLE public.diagnostic_order_items
  ADD CONSTRAINT diagnostic_order_items_approval_status_check
  CHECK (approval_status IS NULL OR approval_status IN (
    'draft_ops', 'pending_approval', 'released', 'rejected'
  ));

CREATE INDEX idx_doi_approval_status
  ON public.diagnostic_order_items (approval_status)
  WHERE approval_status = 'pending_approval';

-- Grandfather: existing live results treated as released
UPDATE public.diagnostic_order_items
SET approval_status = 'released',
    approved_at = COALESCE(resulted_at, now())
WHERE resulted_at IS NOT NULL
  AND approval_status IS NULL;
```

**Column semantics:**

| Column | Meaning |
|--------|---------|
| `approval_status` | `null` → ordered, no ops result yet · `draft_ops` → saved, not submitted · `pending_approval` → in approver queue · `released` → doctor may view · `rejected` → back to ops |
| `submitted_*` | Ops submission timestamp + profile |
| `approved_*` | Pathologist/radiologist (or admin break-glass) release |
| `rejected_*` + `rejection_reason` | Approver send-back |
| `approval_exempt` | Bedside POC — skip queue permanently for this line |

**Reuse:** existing `verified_by` on item — set to **approver** on release (pathologist/radiologist profile id), not ops enterer.

**Drizzle:** extend `diagnostic-order-items.pgschema.ts`; add `APPROVAL_STATUS` constants in `clinical.constants.ts`.

### 2.3 `radiology_reports.status`

Add `pending_approval` to check constraint (migration `031_radiology_report_pending_approval.sql` or combined):

```sql
ALTER TABLE public.radiology_reports
  DROP CONSTRAINT IF EXISTS radiology_reports_status_check;
ALTER TABLE public.radiology_reports
  ADD CONSTRAINT radiology_reports_status_check
  CHECK (status IN ('draft', 'pending_approval', 'verified', 'amended', 'cancelled'));
```

- Ops save → `draft`
- Submit → `pending_approval` (no dual-write)
- Approve → `verified` + item dual-write + `released`

### 2.4 `diagnostic_orders` (optional flag)

No new order-level column required v1. Bedside detection:

- `clinical_indication = 'Emergency triage bedside POC'` on order create (already set in `recordBedsidePocResult`), **or**
- set `approval_exempt = true` on item at result entry.

Prefer **item `approval_exempt`** set in bedside submission path (explicit, survives indication edits).

---

## 3. Backend — role sets

**File:** `backend/src/middleware/require-roles.ts`

```typescript
export const LAB_APPROVE_ROLES = new Set([
  'super_admin', 'admin', 'provider_admin', 'pathologist',
]);
export const RADIOLOGY_APPROVE_ROLES = new Set([
  'super_admin', 'admin', 'provider_admin', 'radiologist',
]);
// Deprecate inline verify-only use of RADIOLOGY_VERIFY_ROLES — same set as RADIOLOGY_APPROVE_ROLES
```

**Platform:** add `pathologist` to `INVITE_ROLES`, `CREDENTIALED_CLINICAL_ROLES`, frontend `clinicalRoles.ts`, seed `pathologist@flowmd.dev`.

**Nav:** `staticRoleAccess.ts` — `pathologistOnly` / `radiologistOnly` approval landing; combined roles get both ops + approve tabs.

---

## 4. Backend — services

### 4.1 New file: `approval.service.ts`

| Function | Behavior |
|----------|----------|
| `submitItemForApproval(itemId, orgId, actorId)` | Validates item has ops content (typed values, PDF doc, or radiology report draft); sets `pending_approval`, `submitted_*`; radiology report → `pending_approval`; emits SSE if STAT/critical; **does not** set `resulted_at` |
| `approveItem(itemId, orgId, actorId, roles)` | Role gate by order type (lab vs radiology); sets `released`, `approved_*`, `resulted_at`, `verified_by`; radiology dual-write + order complete; clears reject fields |
| `rejectItem(itemId, orgId, actorId, roles, reason)` | Sets `rejected`, `rejected_*`, reason; **does not** clear ops clinical data |

** Preconditions (422):**

- Submit: status ∈ `{ draft_ops, rejected }` and has result payload
- Approve/Reject: status = `pending_approval`
- Approve: correct approve role for modality

**Idempotency:** second approve on `released` → 409 or no-op 200 (pick 409 in handler tests).

### 4.2 Changes to existing services

| Service | Change |
|---------|--------|
| `orders.service.enterOrderResults` | Write result fields; set `approval_status = draft_ops`; **remove** immediate `resulted_at` / order complete unless `approval_exempt` |
| `reportDocuments.service.linkReportDocument` | Link PDF only; **do not** set `resulted_at` or complete order; leave `draft_ops` or keep prior status |
| `radiologyReports.service.upsertRadiologyReport` | Save content only (`draft`); **remove** verify path dual-write from this handler — verify moves to `approveItem` |
| `bedsideResultSubmission` / caller | After enter results: set `approval_exempt = true`, `approval_status = released`, `resulted_at`, `approved_at` in same flow |

### 4.3 List / read projection

**`orders.mapping.ts` — extend `orderItemsJsonAggSql`:**

```typescript
'approval_status', ${diagnostic_order_items.approval_status},
'submitted_for_approval_at', ${diagnostic_order_items.submitted_for_approval_at},
'approved_at', ${diagnostic_order_items.approved_at},
'rejection_reason', ${diagnostic_order_items.rejection_reason},
'approval_exempt', ${diagnostic_order_items.approval_exempt},
```

**`listDiagnosticOrdersHandler` query params:**

- `approvalStatus=pending_approval` — approval queues
- Existing `orderType`, `sendOut`, `encounterId` unchanged

**`listReportDocumentsHandler`:**

- If caller is ordering clinician (doctor, no approve role) and item `approval_status !== 'released'` → **403** `RESULT_NOT_RELEASED`
- Approve roles may read pending for review

**Frontend `reportAvailable` / encounter classifier:**

```typescript
const clinicianCanView = item.approval_status === 'released' || item.approval_exempt;
```

Update `isPdfOnlyLabResult` / radiology helpers to respect `clinicianCanView`.

---

## 5. API endpoints

Base: existing `ORDERS_API_BASE` = `/api/clinical/orders` (from `clinical.constants.ts`).

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| `POST` | `/api/clinical/orders/items/:itemId/submit-for-approval` | `LAB_ROLES` or `RADIOLOGY_ROLES` (by item modality) | `{}` | `{ success: true, approval_status: 'pending_approval' }` |
| `POST` | `/api/clinical/orders/items/:itemId/approve` | `LAB_APPROVE` or `RADIOLOGY_APPROVE` by modality | `{}` | `{ success: true, approval_status: 'released', approved_at }` |
| `POST` | `/api/clinical/orders/items/:itemId/reject` | same | `{ reason: string }` (required, min 3 chars) | `{ success: true, approval_status: 'rejected' }` |
| `GET` | `/api/clinical/orders?approvalStatus=pending_approval&orderType=laboratory\|radiology` | Approve roles (+ admin) | — | Existing list shape + new item fields |

**Schemas:** add to `orders.schema.ts` — body/response + error codes:

| Code | HTTP | When |
|------|------|------|
| `RESULT_NOT_RELEASED` | 403 | Doctor GET documents before release |
| `APPROVAL_INVALID_STATE` | 422 | Wrong status transition |
| `APPROVAL_NOTHING_TO_SUBMIT` | 422 | Submit with empty result |
| `FORBIDDEN_ROLE` | 403 | Wrong approve role for modality |

Wire routes in `orders.routes.ts` — delegate to `approval.controller.ts` (thin handlers).

---

## 6. Orchestration / SSE (v1b — same PR, can ship slice E)

**Constant:** `ORCHESTRATION_EVENT.DIAGNOSTIC_RESULT_APPROVAL_PENDING = 'diagnostic_result.approval_pending'`

Emit from `submitItemForApproval` when order `priority === 'stat'` OR item `abnormal_flag === 'critical'` OR radiology `is_critical`:

```typescript
serverEventBus.emit({
  type: ORCHESTRATION_EVENT.DIAGNOSTIC_RESULT_APPROVAL_PENDING,
  organizationId,
  orderId,
  itemId,
  orderType: 'laboratory' | 'radiology',
  priority,
  isCritical,
  accessionNumber,
  testName,
});
```

Add to `SSE_BRIDGE_EVENT_TYPES`.

**Frontend:** `useRealtimeSync.ts` — toast for `pathologist` + lab, `radiologist` + radiology; invalidate `['approval-queue', orderType]`.

---

## 7. Frontend

### 7.1 Routes

Extend `Orders.tsx` sub-tabs:

| URL | Component |
|-----|-----------|
| `/orders?type=lab&tab=track` | Existing `LabOrderTracker` |
| `/orders?type=lab&tab=approve` | **New** `LabApprovalQueue.tsx` |
| `/orders?type=radiology&tab=track` | Existing `RadiologyOrderTracker` |
| `/orders?type=radiology&tab=approve` | **New** `RadiologyApprovalQueue.tsx` |

`deskTrackOnly` roles unchanged; pathologist/radiologist land on `tab=approve`.

### 7.2 Ops tracker changes

| Component | Change |
|-----------|--------|
| `LabOrderTracker` | Status chips: Awaiting approval / Rejected + reason; **Submit for approval** button when `draft_ops` or `rejected`; remove implicit “live” on enter |
| `LabResultEntryDrawer` | Save → `draft_ops`; optional “Save & submit” |
| `RadiologyOrderTracker` | Same pattern |
| `RadiologyResultEntryDrawer` | Remove **Verify** button; **Submit for approval** |
| `SendOutReportDialog` | After upload, prompt submit (no auto-release) |

### 7.3 Approval queue components

**New:** `LabApprovalQueue.tsx`, `RadiologyApprovalQueue.tsx`

- Fetch `GET orders?approvalStatus=pending_approval&orderType=...`
- Sort: STAT → critical → submitted_at
- Row actions: Review (drawer), Approve, Reject (modal + reason)
- Nav badge: count pending (react-query)

### 7.4 Shared types / mappers

- Extend `ordersWorkspace.service.ts` row mappers with `approvalStatus`, `rejectionReason`
- `resultAvailable` → `approvalStatus === 'released' || approvalExempt`

---

## 8. Migration & rollout

1. Deploy migration 029 + 030 (+ 031 radiology status) **before** app code that writes new statuses.
2. Backfill (030) ensures existing demos keep working.
3. Feature flag **not required** — behavior change is intentional; QA on staging with seed accounts.

**Rollback:** revert app; columns nullable — old code ignores new fields. Do not drop columns in hotfix without migration down.

---

## 9. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Lab tracker tests assume save = live | Update fixtures + integration tests for approval states |
| Radiology verify removed from drawer | Approve queue + admin break-glass documented in release notes |
| Doctor 403 on old cached UI | Encounter tab ships after approval API (slice order) |
| No pathologist assigned | Admin in `LAB_APPROVE_ROLES`; ops sees “Awaiting approval” until admin approves |
| PDF uploaded but never submitted | Ops tracker shows draft_ops + nudge to submit |
| Mixed order partial release | Per-item status; order completes when all items `released` (existing `resulted_at` check updated to `approval_status = released`) |

---

## 10. Testing

| Layer | Focus |
|-------|--------|
| **Unit** | `approval.service` state transitions; invalid transitions 422 |
| **Schema** | AJV messages Title Case for `reason` field |
| **Integration** | Submit → pending; doctor GET documents 403; approve → 200; reject → ops resubmit → approve → doctor 200 |
| **Integration** | Bedside POC → immediate released; not in pending queue |
| **Integration** | Role gates: lab_tech cannot approve; pathologist cannot approve radiology line |
| **Frontend** | Approval queue sort; reject reason displayed on ops tracker |
| **Manual** | STAT submit → SSE toast to pathologist (v1b) |

Mock org rows: `active: true` per PR review lessons.

---

## 11. Implementation slices (detailed)

| Slice | Scope | Done when |
|-------|--------|-----------|
| **A** | Migrations 029–031; platform roles + invite + seed; `APPROVAL_STATUS` constants | Invite pathologist; enum valid |
| **B** | `approval.service` + 3 routes + schema + list filter + mapping fields + enterOrderResults/reportDocuments/radiology changes + bedside exempt | Integration tests green |
| **C** | Approval queue UI + ops tracker submit/reject states + nav | Pathologist approves from queue E2E manual |
| **D** | SSE event + `useRealtimeSync` toast (STAT/critical) | Logged-in pathologist gets toast on submit |
| **E** | Encounter Reports tab (separate feature plan) | Doctor sees released only |

**Tracer bullet for this feature:** Slice A + B + one line lab approve in C (manual).

---

## 12. Files to touch (checklist)

| Area | Path |
|------|------|
| Migrations | `backend/src/db/migrations/029_*.sql`, `030_*.sql`, `031_*.sql` |
| pgschema | `diagnostic-order-items.pgschema.ts` |
| Constants | `clinical.constants.ts`, `platform.constants.ts`, `require-roles.ts` |
| Service | `approval.service.ts`, `approval.controller.ts` |
| Orders | `orders.service.ts`, `orders.controller.ts`, `orders.routes.ts`, `orders.schema.ts`, `orders.mapping.ts` |
| Radiology | `radiologyReports.service.ts`, `RadiologyResultEntryDrawer.tsx` |
| Lab | `LabOrderTracker.tsx`, `LabResultEntryDrawer.tsx` |
| New UI | `LabApprovalQueue.tsx`, `RadiologyApprovalQueue.tsx` |
| Nav | `staticRoleAccess.ts`, `Orders.tsx` |
| SSE | `orchestration.constants.ts`, `event-bus.ts`, `useRealtimeSync.ts` |
| Bedside | `bedsideResultSubmission.ts` + backend enter path |
| Frontend types | `ordersWorkspace.service.ts`, `orderResults.ts` |

---

## Approval

Plans and PRDs must include this block before implement phase.

- [ ] Product — acceptance criteria match PRD (two-tier, reject loop, bedside bypass, combined roles)
- [ ] Tech — architecture decisions (AD-1–AD-8) respected; no scope creep into encounter tab UI (slice E / separate plan)
- [ ] **Approved by:** ___
- [ ] **Date:** YYYY-MM-DD

**Agent rule:** Do not implement until all boxes are checked and approver name is filled.
