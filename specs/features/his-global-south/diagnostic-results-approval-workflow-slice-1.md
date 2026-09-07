# DRA-1 — Roles + schema foundation

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `diagnostic-results-approval-workflow` |
| **Slice** | 1 (DRA-1) |
| **Branch** | `feat/dra-1-approval-schema` (suggested) |
| **PRD slice** | [prd/.../slices/slice-1.md](../../../prd/his-global-south/diagnostic-results-approval-workflow/slices/slice-1.md) |
| **Technical design** | [technical-design.md](../../../prd/his-global-south/diagnostic-results-approval-workflow/technical-design.md) §2, §3 |
| **Status** | Plan — awaiting Approval |
| **Date** | 2026-09-05 |

---

## 1. Goal

Prepare database and platform roles for the two-tier diagnostic approval workflow **without changing lab/radiology save behaviour** (that is DRA-2). After this slice:

- Admin can invite **`pathologist`** and **`radiologist`**
- `diagnostic_order_items` has approval columns; existing live rows are **`released`**
- `radiology_reports.status` accepts **`pending_approval`**
- `LAB_APPROVE_ROLES` / `RADIOLOGY_APPROVE_ROLES` exist for DRA-2 handlers

---

## 2. Architecture constraints (immutable AD-N)

| AD | Constraint | This slice |
|----|------------|------------|
| **AD-1** | `approval_status` is clinician visibility source of truth | Add column + check constraint; **no app reads yet** |
| **AD-6** | Grandfather `resulted_at` rows → `released` | Migration 030 backfill UPDATE |
| *(others)* | Submit/approve/reject, 403 gates, bedside bypass | **DRA-2+** — do not implement here |

---

## 3. Previous slices context

**None** — greenfield feature. Current codebase state (verified):

| Area | Today |
|------|--------|
| Latest migration | `028_lab_panel_components.sql` → next files **`029`**, **`030`**, **`031`** |
| `app_role` enum | `radiologist` exists (024); **`pathologist` missing** from DB enum and `backend/src/db/schema/enums.ts` |
| `INVITE_ROLES` | Has `lab_tech`, `radiographer`; **missing `radiologist` and `pathologist`** (`platform.constants.ts`) |
| Frontend hospital roles | `HOSPITAL_APP_ROLE.RADIOLOGIST` already in `hospitals.ts`; **no `pathologist`** |
| Frontend credentialed roster | `clinicalRoles.ts` has `radiologist`; **no `pathologist`** |
| `require-roles.ts` | `CREDENTIALED_CLINICAL_ROLE_SET` includes `radiologist`; **`LAB_APPROVE_ROLES` / `RADIOLOGY_APPROVE_ROLES` not defined** |
| `diagnostic_order_items` | No approval columns (`diagnostic-order-items.pgschema.ts`) |
| `radiology_reports.status` check | `draft`, `verified`, `amended`, `cancelled` only — no `pending_approval` |
| Save paths | `enterOrderResults` still sets `resulted_at` immediately — **unchanged in DRA-1** |

---

## 4. Relevant files

### Modify

| Path | Change |
|------|--------|
| `backend/src/db/migrations/029_pathologist_role.sql` | **New** — `ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'pathologist'` |
| `backend/src/db/migrations/030_diagnostic_order_item_approval.sql` | **New** — approval columns, check, index, grandfather UPDATE, COMMENT ON |
| `backend/src/db/migrations/031_radiology_report_pending_approval.sql` | **New** — extend `radiology_reports_status_check` |
| `backend/src/modules/clinical/pgschema/diagnostic-order-items.pgschema.ts` | Mirror new columns + FKs + check |
| `backend/src/modules/clinical/pgschema/radiology-reports.pgschema.ts` | Update status check array |
| `backend/src/db/schema/enums.ts` | Add `'pathologist'` to `app_role` pgEnum array |
| `backend/src/modules/platform/platform.constants.ts` | `ROLE.PATHOLOGIST`, `INVITE_ROLES` += pathologist + radiologist, `CREDENTIALED_CLINICAL_ROLES` += pathologist |
| `backend/src/modules/clinical/clinical.constants.ts` | `APPROVAL_STATUS` const object (used in DRA-2) |
| `backend/src/middleware/require-roles.ts` | Add `pathologist` to `CREDENTIALED_CLINICAL_ROLE_SET`; define `LAB_APPROVE_ROLES`, `RADIOLOGY_APPROVE_ROLES` (alias/rename intent of `RADIOLOGY_VERIFY_ROLES` — keep both sets until DRA-2 removes verify path) |
| `backend/src/db/seeds/rbac-staff.ts` | Optional demo accounts: `pathologist@flowmd.dev`, `radiologist@flowmd.dev` |
| `src/constants/clinicalRoles.ts` | `PATHOLOGIST` + roster entry |
| `src/platform/constants/hospitals.ts` | `HOSPITAL_APP_ROLE.PATHOLOGIST` + `HOSPITAL_APP_ROLE_VALUES` |
| `src/config/staticRoleAccess.ts` | Add `pathologist` to `labOperationalRoles`; optional `pathologistOnly` stub (landing → lab track until DRA-3 approve tab) |

### Reference (do not change behaviour)

| Path | Why |
|------|-----|
| `backend/src/modules/clinical/orders/orders.service.ts` | DRA-2 will stop immediate `resulted_at` |
| `backend/src/modules/clinical/orders/radiologyReports.service.ts` | DRA-2 moves verify to approve |
| `backend/src/modules/platform/platform.schema.ts` | Uses `INVITE_ROLES` enum — auto-updates when constants change |
| `backend/src/modules/platform/org/org.schema.ts` | Same |

---

## 5. Implementation phases

### Phase 1 — Migrations (deploy before app code)

**Order:** 029 → 030 → 031. Run `npm run db:migrate` in `backend/`.

#### 029_pathologist_role.sql

```sql
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'pathologist';
```

#### 030_diagnostic_order_item_approval.sql

Add columns to `public.diagnostic_order_items`:

| Column | Type | Notes |
|--------|------|-------|
| `approval_status` | `text` nullable | Check: `draft_ops`, `pending_approval`, `released`, `rejected` |
| `submitted_for_approval_at` | `timestamptz` | |
| `submitted_by` | `uuid` → `profiles(id)` | |
| `approved_at` | `timestamptz` | |
| `approved_by` | `uuid` → `profiles(id)` | |
| `rejected_at` | `timestamptz` | |
| `rejected_by` | `uuid` → `profiles(id)` | |
| `rejection_reason` | `text` | |
| `approval_exempt` | `boolean NOT NULL DEFAULT false` | Bedside POC |

- Partial index: `idx_doi_approval_status` WHERE `approval_status = 'pending_approval'`
- **Grandfather:**

```sql
UPDATE public.diagnostic_order_items
SET approval_status = 'released',
    approved_at = COALESCE(resulted_at, now())
WHERE resulted_at IS NOT NULL
  AND approval_status IS NULL;
```

- `COMMENT ON COLUMN` for each new column (match migration 026 style)

#### 031_radiology_report_pending_approval.sql

```sql
ALTER TABLE public.radiology_reports
  DROP CONSTRAINT IF EXISTS radiology_reports_status_check;
ALTER TABLE public.radiology_reports
  ADD CONSTRAINT radiology_reports_status_check
  CHECK (status IN ('draft', 'pending_approval', 'verified', 'amended', 'cancelled'));
```

**Rollback note:** Revert app only; do not drop columns in hotfix without down migration.

---

### Phase 2 — Backend constants + schema mirror

1. **`clinical.constants.ts`** — add:

```typescript
export const APPROVAL_STATUS = {
  DRAFT_OPS: 'draft_ops',
  PENDING_APPROVAL: 'pending_approval',
  RELEASED: 'released',
  REJECTED: 'rejected',
} as const;

export const APPROVAL_STATUS_VALUES = Object.values(APPROVAL_STATUS);
```

2. **`platform.constants.ts`**
   - `ROLE.PATHOLOGIST = 'pathologist'`
   - Append `ROLE.PATHOLOGIST` and `ROLE.RADIOLOGIST` to `INVITE_ROLES`
   - Append `ROLE.PATHOLOGIST` to `CREDENTIALED_CLINICAL_ROLES`

3. **`require-roles.ts`**
   - Add `'pathologist'` to `CREDENTIALED_CLINICAL_ROLE_SET`
   - Add (do not wire to routes yet):

```typescript
export const LAB_APPROVE_ROLES = new Set([
  'super_admin', 'admin', 'provider_admin', 'pathologist',
]);
export const RADIOLOGY_APPROVE_ROLES = new Set([
  'super_admin', 'admin', 'provider_admin', 'radiologist',
]);
```

   - Keep `RADIOLOGY_VERIFY_ROLES` unchanged until DRA-2 refactors radiology verify path

4. **`diagnostic-order-items.pgschema.ts`** — add columns matching migration; FKs to `profiles` for `submitted_by`, `approved_by`, `rejected_by`; check on `approval_status` using `APPROVAL_STATUS_VALUES`

5. **`radiology-reports.pgschema.ts`** — extend check to include `'pending_approval'`

6. **`enums.ts`** — append `'pathologist'` to `app_role` array (keep sort consistent with PG enum order after migration)

---

### Phase 3 — Frontend role wiring

1. **`clinicalRoles.ts`**
   - `PATHOLOGIST: "pathologist"`
   - Roster entry: `{ value: CLINICAL_ROLE.PATHOLOGIST, label: "Pathologist" }`

2. **`hospitals.ts`**
   - `PATHOLOGIST: 'pathologist'` in `HOSPITAL_APP_ROLE`
   - Add to `HOSPITAL_APP_ROLE_VALUES` (alphabetical or grouped with lab/radiology roles)

3. **`staticRoleAccess.ts`** (minimal stub for DRA-1)
   - Add `"pathologist"` to `labOperationalRoles` array (same desk family as lab)
   - Update file header comment to document pathologist
   - **Do not** add approve-tab URLs yet — DRA-3 owns `tab=approve` landing

---

### Phase 4 — Seed (optional but recommended)

**`rbac-staff.ts`** — append:

| Email | Role | Department |
|-------|------|------------|
| `pathologist@flowmd.dev` | `pathologist` | Laboratory |
| `radiologist@flowmd.dev` | `radiologist` | Radiology |

Run `npm run db:seed:auth-users` after migrate on dev machines.

---

## 6. Step-by-step task checklist

| # | Task | File(s) |
|---|------|---------|
| 1 | Create migration 029 | `029_pathologist_role.sql` |
| 2 | Create migration 030 with COMMENT ON + backfill | `030_diagnostic_order_item_approval.sql` |
| 3 | Create migration 031 | `031_radiology_report_pending_approval.sql` |
| 4 | Run migrations locally | `cd backend && npm run db:migrate` |
| 5 | Add `APPROVAL_STATUS` constants | `clinical.constants.ts` |
| 6 | Add `ROLE.PATHOLOGIST`, extend invite/credentialed arrays | `platform.constants.ts` |
| 7 | Add approve role sets + pathologist to credentialed set | `require-roles.ts` |
| 8 | Mirror DB in Drizzle pgschema | `diagnostic-order-items.pgschema.ts`, `radiology-reports.pgschema.ts` |
| 9 | Update drizzle `app_role` enum | `enums.ts` |
| 10 | Frontend pathologist roster + hospital role | `clinicalRoles.ts`, `hospitals.ts` |
| 11 | Stub pathologist in staticRoleAccess | `staticRoleAccess.ts` |
| 12 | Optional seed accounts | `rbac-staff.ts` |
| 13 | Add/update tests (see §7) | see below |
| 14 | Validation commands (see §8) | — |

---

## 7. Testing strategy

### Unit

| Test | Assert |
|------|--------|
| **New:** `backend/src/modules/clinical/__tests__/clinical.constants.test.ts` (or extend existing) | `APPROVAL_STATUS_VALUES` contains all four states |
| **New:** `backend/src/middleware/__tests__/require-roles.test.ts` (if missing, add minimal) | `pathologist` ∈ `CREDENTIALED_CLINICAL_ROLE_SET`; `LAB_APPROVE_ROLES` has pathologist; `RADIOLOGY_APPROVE_ROLES` has radiologist |
| **Extend:** `platform.schema` compile smoke | AJV accepts invite body with `role: 'pathologist'` and `role: 'radiologist'` |

### Integration / manual

| Check | Method |
|-------|--------|
| Migrations apply on fresh + demo DB | `npm run db:migrate` |
| Backfill | SQL: `SELECT count(*) FROM diagnostic_order_items WHERE resulted_at IS NOT NULL AND approval_status = 'released'` |
| Invite pathologist | Org Setup → invite user with Pathologist role → 200 |
| Invite radiologist | Same — previously blocked by backend `INVITE_ROLES` |
| Lab save unchanged | Enter lab result → `resulted_at` still set (until DRA-2) |

### Regression

- Full backend unit suite: `npm run test:backend`
- Frontend unit suite: `npm run test`
- No changes to order integration tests expected (columns nullable; old code ignores them)

---

## 8. Validation commands

From repo root `projects/his-global-south/`:

```bash
cd backend && npm run db:migrate && npm run build && npm test
cd .. && npm run lint && npx tsc -b && npm test
```

Before PR (per workspace rules):

```bash
npm run lint && npx tsc -b          # frontend root
cd backend && npm run build && npm test
```

---

## 9. Acceptance criteria

| # | Criterion | Validation |
|---|-----------|------------|
| AC-1 | `pathologist` in `app_role` enum | `\dT+ app_role` or migration 029 applied |
| AC-2 | Admin can invite pathologist | Manual org invite OR schema unit test |
| AC-3 | Admin can invite radiologist | Manual — was blocked by `INVITE_ROLES` |
| AC-4 | Approval columns exist on `diagnostic_order_items` | `\d diagnostic_order_items` or pgschema |
| AC-5 | Existing `resulted_at` rows → `approval_status = released` | SQL count after migrate |
| AC-6 | `radiology_reports.status` accepts `pending_approval` | Insert test row in dev or migration review |
| AC-7 | No save-path behaviour change | Lab enter still sets `resulted_at`; existing order tests green |
| AC-8 | Build + tests pass | Commands in §8 |

---

## 10. Scope boundaries

### In scope

- Migrations 029–031
- Platform + frontend role/constants wiring
- Drizzle pgschema mirror
- Approve role set **definitions** (not used by routes yet)
- Optional demo seed accounts

### Out of scope

- `approval.service.ts`, REST routes, controller (DRA-2)
- Ops tracker / approval queue UI (DRA-3)
- SSE (DRA-4)
- Changing `enterOrderResults`, `reportDocuments`, radiology verify (DRA-2)
- Encounter tab (ELR feature)
- List API projection of approval fields (DRA-2)

---

## 11. Risks

| Risk | Mitigation |
|------|------------|
| Enum migration order | Deploy 029 before any code referencing `pathologist` |
| Drizzle enum drift | Update `enums.ts` in same PR as migration 029 |
| Frontend shows radiologist but backend rejected invites | Fixed by adding both to `INVITE_ROLES` |
| Grandfather misses edge cases | Backfill only where `resulted_at IS NOT NULL`; null stays null status |

---

## Approval

Plans and PRDs must include this block before implement phase.

- [ ] Product — US-6 satisfied; grandfather preserves existing demos; no user-visible workflow change yet
- [ ] Tech — AD-1, AD-6 respected; migrations deploy-before-code; no DRA-2 behaviour in this slice
- [ ] **Approved by:** ___
- [ ] **Date:** YYYY-MM-DD

**Agent rule:** Do not implement until all boxes are checked and approver name is filled.

**Next slice after merge:** [DRA-2 plan](./diagnostic-results-approval-workflow-slice-2.md) (create via `plan-slice` when ready).
