# PAF-7 — Audited hospital support view (v1)

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Clone** | `projects/his-global-south/` |
| **Epic** | [platform-admin-follow-ons](../../../prd/his-global-south/platform-admin-follow-ons/plan.md) |
| **Slice brief** | [prd/.../slices/paf-7.md](../../../prd/his-global-south/platform-admin-follow-ons/slices/paf-7.md) |
| **Depends on** | PAF-4 health (in clone). Wave A PAF-1…4 implemented locally, not committed. |
| **Status** | Implemented locally (not committed) |

---

## Goal

A FlowMD operator can answer “who works at this hospital?” without becoming that hospital’s `super_admin` and without seeing any patient.

Every successful open writes an append-only audit row.

---

## Explicitly out of this slice

| Out | Why |
|-----|-----|
| **PAF-6** (terminology / payer catalogues) | Separate epic. Do not touch reference routes or sidebar. |
| Impersonation / “login as hospital admin” | Later product yes only. Not v1. |
| Patient list, visits, charts, MRNs | PHI. Forbidden on platform APIs. |
| Changing staff roles or passwords | Already hospital Personnel + PAF-2 (replace admin). This view is read-only. |
| Widening `GET .../health` with names | Keep health counts-only. Support is a **new** endpoint. |
| Reusing `GET /api/platform/users` | That lists the **caller’s** org (Flow Health), not the target hospital. |
| Grant `platform_admin` from UI | Unchanged. |
| Retarget SQL `is_platform_admin()` | Still means hospital `super_admin` for payer RLS. |
| Disable Register | Out of epic. |

---

## Architecture constraints

| Decision | This slice |
|----------|------------|
| App-layer `assertPlatformAdmin()` only | Gate the new GET. Do not use SQL `is_platform_admin()`. |
| No PHI in platform APIs | Staff directory only (hospital employees). Never join `patients`. |
| ADR 0004 (PHI audit) | Do **not** write `patient_audit_log`. New table `platform_support_access` (staff PII access, not PHI). |
| Constants + `*_VALUES` | Action + max staff in `org.constants.ts`; mirror labels in `src/platform/constants/hospitals.ts`. |
| Types not from services/components | `org.types.ts` / `src/platform/types/hospitals.ts`. |
| Mapping in `*.mapping.ts` | Narrow roles; drop `platform_admin` from the staff list. |
| Fastify params | `:id` `format: uuid`. No body. |
| Wire snake_case | Convert only in `src/integrations/api/client.ts`. |
| Frontend `src/platform/` | Panel on `/platform/hospitals/:id`. Do not modify OPD modules. |

**AD for this slice (locked):**

1. New `GET /api/platform/organizations/:id/support` — do not add names to `/health`.
2. Audit insert is **fail-closed**: if the audit row cannot be written, return 500 and **do not** return the staff list.
3. Audit stores **actor + hospital + time + action** only. Do not snapshot the staff list into the audit row.
4. Staff = users with `user_roles.organization_id = :id`, excluding `ROLE.PLATFORM_ADMIN`. Source is roles, not the patients table.

---

## Previous slices (what exists in code)

| Slice | In clone today |
|-------|----------------|
| PAF-1 | `backend/src/shared/mail.ts` — SMTP or copy-link |
| PAF-2 | `PUT .../admin`, invite status on list/get |
| PAF-3 | `reject-suspended-hospital` on `withOrgAuth`; Suspend UI |
| PAF-4 | `getOrganizationHealth` + `GET .../:id/health` — counts only |
| Hospital Personnel | `listUsers(orgId)` uses **session org**, not a path id — unusable for support |

Reusable (do not duplicate):

- `assertPlatformAdmin` in `org.service.ts`
- `getOrganizationHealth` — call it and attach `staff`
- `toRoleCounts` / `toAppRole` in `org.mapping.ts`
- `sessions.updated_at` for last login (same pattern as health’s max session)
- `organizationIdParamsSchema`
- `useHospitalHealth` / queryKeys pattern — add `support`
- Edit page `HospitalHealthPanel` — add a sibling **Support** panel

---

## API

`GET /api/platform/organizations/:id/support`

- Auth: `withOrgAuth` (platform admin’s own org stays Flow Health; suspend check does not block them).
- Authz: `assertPlatformAdmin(caller)` → 403 `{ error: 'platform_admin only' }`.
- Params: `organizationIdParamsSchema` (`id` uuid).
- 404 if hospital missing.

**200 body (snake_case on the wire):**

```text
organization_id, user_count, role_counts, has_super_admin,
last_session_at, opd_enabled, ipd_enabled, active, created_at,
staff: [
  { user_id, first_name, last_name, email, roles[], last_login_at }
]
```

`role_counts` / health fields = same as PAF-4 (reuse `getOrganizationHealth`).

`staff[].roles` = role strings for **that hospital only**, already narrowed through `toAppRole`. Omit unknown roles.

`last_login_at` = max `sessions.updated_at` for that `user_id`, or null.

**Cap:** `PLATFORM_SUPPORT_STAFF_MAX` (constant, e.g. 200). If more staff exist, return the first N ordered by last name / email and set `staff_truncated: true` (boolean, not a patient field).

**Forbidden keys on the payload:** anything from `patients`, visit ids, NPI, phone, address, password, invite tokens.

Hospital `super_admin` calling this URL → 403 (not platform_admin). They already have Personnel.

---

## Data — `platform_support_access`

New migration `backend/src/db/migrations/005_platform_support_access.sql`.

```text
id                 uuid PK default gen_random_uuid()
actor_user_id      text NOT NULL REFERENCES users(id)
organization_id    uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
action             text NOT NULL   -- from SUPPORT_ACCESS_ACTION
created_at         timestamptz NOT NULL default now()
```

Indexes: `(organization_id, created_at DESC)`, `(actor_user_id, created_at DESC)`.

Mirror pgschema: `backend/src/modules/platform/pgschema/platform-support-access.pgschema.ts` + export from `pgschema/index.ts`.

Constants:

```text
SUPPORT_ACCESS_ACTION = { VIEW_STAFF: 'view_staff' }
SUPPORT_ACCESS_ACTION_VALUES = [...]
PLATFORM_SUPPORT_STAFF_MAX = 200
```

Do not log staff emails in application logs.

---

## UI

On `/platform/hospitals/:id` (edit), **below** the health panel:

- Title: Support — hospital staff
- Short note: Read-only. Opens are recorded. No patient data.
- Table: name, email, roles, last login
- Empty: “No hospital staff yet.”
- If `staffTruncated`: one line that the list is capped (use the max constant in copy, not a hardcoded `200` in JSX).

No new route. No “impersonate” button. Copy-invite / suspend stay as they are.

Load via `useHospitalSupport(id)` → `GET .../support`. Do **not** reuse hospital Personnel hooks.

---

## Relevant files

**Modify**

- `backend/src/modules/platform/org/org.constants.ts`
- `backend/src/modules/platform/org/org.types.ts`
- `backend/src/modules/platform/org/org.mapping.ts`
- `backend/src/modules/platform/org/org.service.ts` — `getOrganizationSupport`
- `backend/src/modules/platform/org/org.controller.ts`
- `backend/src/modules/platform/org/org.routes.ts`
- `backend/src/modules/platform/pgschema/index.ts`
- `backend/src/modules/platform/org/__tests__/org.hospitals.test.ts`
- `src/platform/constants/hospitals.ts`
- `src/platform/types/hospitals.ts`
- `src/platform/api/hospitals.service.ts`, `hospitals.mapping.ts`
- `src/platform/hooks/useHospitals.ts`
- `src/lib/queryKeys.ts` — `platformHospitals.support(id)`
- `src/platform/pages/hospitals/edit.tsx`

**New**

- `backend/src/db/migrations/005_platform_support_access.sql`
- `backend/src/modules/platform/pgschema/platform-support-access.pgschema.ts`

**Reference only (do not change)**

- `getOrganizationHealth` contract (call it; do not add staff there)
- `listUsers` / Personnel pages
- `src/pages/terminology/**`
- IPD / OPD modules
- `reject-suspended-hospital.ts`

---

## Phases

### 1. Foundation

1. Add `SUPPORT_ACCESS_ACTION` + `*_VALUES` + `PLATFORM_SUPPORT_STAFF_MAX` in `org.constants.ts`.
2. Migration `005_platform_support_access.sql` + COMMENT ON table/columns.
3. pgschema table matching live SQL; export from barrel.

### 2. Backend

4. Types: `OrganizationSupportStaff`, `OrganizationSupport` (health fields + `staff` + `staff_truncated`).
5. Mapping: `toSupportStaffRoles`, exclude `ROLE.PLATFORM_ADMIN`; `supportPayloadHasPhiKeys` helper for tests (assert absent keys).
6. `getOrganizationSupport(actorUserId, orgId)`:
   - assert platform admin
   - `getOrganizationHealth` (404/403 propagate)
   - load staff from `user_roles` ⨝ `profiles` ⨝ `users` for that org
   - drop platform_admin users
   - attach `last_login_at` from `sessions`
   - insert audit (`VIEW_STAFF`); on insert failure throw / 500
   - return health + staff
7. Handler + `GET .../:id/support` next to health route.
8. Unit tests: 403, 404, staff excludes platform_admin, body has no `patient` keys, audit insert required for 200.

### 3. Frontend

9. Types + `toHospitalSupport` mapping (camelCase after client).
10. `getHospitalSupport`, hook, query key.
11. Read-only table on edit page.

### 4. Integration

12. Apply migration on local Postgres (`005`).
13. Restart `flowmd-api`.
14. Manual: `platform@flowmd.ai` opens a hospital → staff table + row in `platform_support_access`. `admin@flowmd.ai` → 403. Confirm no patient names.

---

## Testing strategy

| Layer | What |
|-------|------|
| Unit | Mapping drops `platform_admin`; role narrowing; 403/404 on service mocks |
| Unit | 200 path inserts into `platform_support_access` (mock) |
| Regression | Existing `org.hospitals.test.ts` + `reject-suspended-hospital` still pass; `/health` still has no names |
| Manual | Platform admin sees Flow Health + a QA hospital staff; hospital admin cannot call support |

**Validation commands** (from `projects/his-global-south/`):

```text
npx vitest run backend/src/modules/platform/org/__tests__/org.hospitals.test.ts
npx tsc --noEmit
```

(or `npx vitest run` from `backend/` with the same test path)

---

## Acceptance criteria

| # | Criterion | How to check |
|---|-----------|--------------|
| 1 | `GET .../support` is `platform_admin` only | 403 as hospital `admin@flowmd.ai` |
| 2 | Body includes health aggregates + staff name/email/roles/last_login | Response + UI table |
| 3 | No patient identifiers or visit data | Test asserts forbidden keys; no `patients` join |
| 4 | `platform_admin` users are not listed as hospital staff | Mapping/service test |
| 5 | Each 200 writes `platform_support_access` (actor, org, `view_staff`, time) | DB or mock; fail-closed if insert fails |
| 6 | `/health` unchanged (still no names) | Existing health tests + payload check |
| 7 | No impersonate control | UI review |
| 8 | PAF-6 untouched | Diff has no terminology/payer-catalog files |

---

## Approval

- [x] Product: acceptance criteria match Jira / Figma
- [x] Tech: architecture decisions (AD-N) respected
- [x] Scope: no creep beyond this slice file

**Approved by:** user (chat — implement PAF-7)  
**Date:** 2026-08-23
