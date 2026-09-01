# Feature: Platform admin follow-ons

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Clone** | `projects/his-global-south/` |
| **Parent** | `platform-admin-hospitals` |
| **Plan** | [prd/his-global-south/platform-admin-follow-ons/plan.md](../../../prd/his-global-south/platform-admin-follow-ons/plan.md) |
| **Status** | Draft |

## Description

Extend `platform_admin` with more tenant-operator tools after hospital create/list/edit. Public Register stays enabled (out of scope).

## User story

As a FlowMD platform operator  
I want invite mail, invite status, suspend, tenant health, and later module gating  
So that I can run hospitals without becoming that hospital’s `super_admin` or seeing PHI.

## Problem / solution

v1 onboarded tenants; Wave A (invite, suspend, health) is in the clone. Next in this epic is **PAF-7** (audited staff support view). **PAF-6** (shared reference catalogues) is a **separate epic** — do not implement with PAF-7. PAF-5 (module gating) stays its own branch.

## Files (Wave A — typical)

- `backend/src/modules/platform/org/org.constants.ts`, `org.types.ts`, `org.schema.ts`, `org.service.ts`, `org.routes.ts`, `org.mapping.ts`
- `backend/src/shared/mail.ts`, `backend/src/config/env.ts`
- `backend/src/middleware/authenticate.ts` or org-scope (suspend check)
- `src/platform/constants/hospitals.ts`, `types/hospitals.ts`, `api/`, `hooks/`, `pages/hospitals/`

Wave B also: `src/components/layout/AppSidebar.tsx`, IPD route preHandler.  
Wave C: terminology/payer routes (read-only) and a new audit table for PAF-7.

## Phases

1. **Foundation** — constants for invite status + suspend error code; no new tables for PAF-1…3.
2. **Implement** — one slice per PR, PAH conventions.
3. **Integration** — live smoke as platform admin + hospital admin 403 when suspended / IPD off.

## Testing

- Unit: mapping + invite status derivation + `emptyToNull` regressions.
- Service: suspend rejects non–platform-admin session; health payload has no patient keys.
- Manual: SMTP on/off; resend; suspend then sign-in as hospital admin.

## Acceptance (epic)

- [ ] SMTP send or copy-link, never a silent failure
- [ ] List shows pending / accepted / expired invite
- [ ] Inactive hospital cannot authenticate hospital staff
- [ ] Health endpoint is aggregates only
- [ ] PAF-5 only after its own approved slice spec
- [ ] No Register change; no `platform_admin` in Personnel; no SQL `is_platform_admin()` retarget

## Approval

- [ ] Product: acceptance criteria match Jira / Figma
- [ ] Tech: architecture decisions (AD-N) respected
- [ ] Scope: no creep beyond this slice file

**Approved by:** _name_  
**Date:** _YYYY-MM-DD_

_Implement must not start until all boxes are checked and approver is named. Then write PAF-1 slice spec and implement only that slice._
