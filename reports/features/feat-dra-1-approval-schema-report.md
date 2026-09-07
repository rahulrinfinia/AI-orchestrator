# DRA-1 implementation report

| Field | Value |
|-------|--------|
| **Plan** | [diagnostic-results-approval-workflow-slice-1.md](../../specs/features/his-global-south/diagnostic-results-approval-workflow-slice-1.md) |
| **Branch** | `feat/dra-1-approval-schema` |
| **Repo** | `projects/his-global-south/` |
| **Date** | 2026-09-05 |

## Summary

DRA-1 adds schema and platform role foundation for the diagnostic results approval workflow. No change to lab/radiology save behaviour yet (DRA-2).

## Files changed (17)

- Migrations: `029_pathologist_role.sql`, `030_diagnostic_order_item_approval.sql`, `031_radiology_report_pending_approval.sql`
- Backend: pgschema, `clinical.constants`, `platform.constants`, `require-roles`, `enums`, `rbac-staff`, shared `clinicalRoles`
- Frontend: `clinicalRoles.ts`, `hospitals.ts`, `staticRoleAccess.ts`
- Tests: approval constants, require-roles, invite roles

## Validation

| Check | Result |
|-------|--------|
| `backend npm run build` | Pass |
| `backend npm test` | 443 passed |
| `npm run lint:frontend` | Pre-existing errors in unrelated WIP (`ordersWorkspace.service.ts`) |
| `npx tsc -b` | Pre-existing errors (tiptap/dompurify) unrelated to DRA-1 |
| `npm run db:migrate` | Not run in agent session — run locally before deploy |

## Deploy note

**Run migrations 029 → 030 → 031 before deploying app code.** Optional: `npm run db:seed:auth-users` for `pathologist@flowmd.dev` / `radiologist@flowmd.dev`.

## Next

DRA-2 — `approval.service` + submit/approve/reject APIs + save-path changes.
