# DRA-1 — Roles + schema foundation

| Field | Value |
|-------|--------|
| **Feature** | `diagnostic-results-approval-workflow` |
| **Slice** | 1 |
| **Depends on** | — |
| **Technical design** | [../technical-design.md](../technical-design.md) §2, §3, AD-1, AD-6 |
| **Goal** | Database and platform ready for approval workflow; no behaviour change to save paths yet |

---

## Purpose

Add `pathologist` role, `approval_status` columns on `diagnostic_order_items`, radiology `pending_approval` status, and grandfather backfill — without switching lab/radiology save flows to draft-only yet (that is DRA-2).

---

## User stories addressed

| Story | Coverage |
|-------|----------|
| US-6 Assign pathologist and radiologist | Full — enum, invite, seed, frontend role constants |

Partial prep for US-1–US-5 (schema only).

---

## Scope

### Backend

- Migration `029_pathologist_role.sql` — `ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'pathologist'`
- Migration `030_diagnostic_order_item_approval.sql` — columns, check constraint, index, grandfather UPDATE
- Migration `031_radiology_report_pending_approval.sql` — extend `radiology_reports.status` check
- Drizzle: `diagnostic-order-items.pgschema.ts` — new columns
- Constants: `APPROVAL_STATUS` in `clinical.constants.ts`
- Platform: `pathologist` in `INVITE_ROLES`, `CREDENTIALED_CLINICAL_ROLES`
- Middleware: define `LAB_APPROVE_ROLES`, `RADIOLOGY_APPROVE_ROLES` in `require-roles.ts` (used in DRA-2)
- Seed: optional `pathologist@flowmd.dev` demo account

### Frontend

- `clinicalRoles.ts` — include `pathologist`
- `staticRoleAccess.ts` — stub nav entries for approval landing (can be hidden until DRA-3)

### Tests

- Migration applies cleanly on empty + seeded DB
- Enum value accepted in invite flow (unit or integration)

---

## Out of scope

- `approval.service.ts` and REST routes (DRA-2)
- Changing `enterOrderResults` / radiology verify behaviour (DRA-2)
- Approval queue UI (DRA-3)
- SSE events (DRA-4)

---

## Acceptance criteria (slice)

- [ ] `pathologist` exists in `app_role` and admin can invite pathologist
- [ ] `radiologist` in `INVITE_ROLES` (enum already exists)
- [ ] `diagnostic_order_items` has approval columns + check constraint
- [ ] Rows with existing `resulted_at` backfilled to `approval_status = released`
- [ ] `radiology_reports.status` accepts `pending_approval`
- [ ] Backend build + existing tests pass (no save-path regression yet)

---

## Modules / files (reference)

| Area | Path |
|------|------|
| Migrations | `backend/src/db/migrations/029_*.sql`, `030_*.sql`, `031_*.sql` |
| Schema | `diagnostic-order-items.pgschema.ts` |
| Constants | `clinical.constants.ts`, `platform.constants.ts`, `require-roles.ts` |
| Frontend roles | `clinicalRoles.ts`, `staticRoleAccess.ts` |

---

## Approval

- [ ] Product — US-6 satisfied; grandfather preserves existing demos
- [ ] Tech — AD-1, AD-6; migrations deploy-before-code order documented
- [ ] **Approved by:** ___
- [ ] **Date:** YYYY-MM-DD

**Agent rule:** Do not implement until all boxes are checked.
