# Technical Design: IAM — Resource Group RBAC

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `iam-resource-groups` |
| **PRD** | [prd.md](./prd.md) |
| **Target repo** | `projects/his-global-south/` |
| **Status** | Draft — pending Gate G2 approval |
| **Date** | 2026-09-06 |

---

## 0. Architecture decisions (AD-N)

| ID | Decision | Rationale |
|----|----------|-----------|
| **AD-1** | **Resource groups are the authorization source of truth** | Admin assigns users to groups; not per-user `module_permissions` as primary |
| **AD-2** | **Effective access = union of all group memberships** | Multi-group users (doctor + pathologist) merge with OR for booleans |
| **AD-3** | **Keep `user_roles` for roster/display**; do not delete enum | Attending pickers, clinical staff roster, invite schema unchanged |
| **AD-4** | **`super_admin` and `platform_admin` bypass group checks** | Existing break-glass and platform ops preserved |
| **AD-5** | **System groups seeded per org** from static RBAC templates | Parity with today's `staticRoleAccess.ts` + `require-roles.ts` on day one |
| **AD-6** | **New `iam` module** — Hemant layout (`mch`/`ipd` pattern) | Sub-features: `groups`, `members`, `access`, `authorization` |
| **AD-7** | **`IAM_API_BASE = '/api/iam'`** — no repeated path strings in routes | PR review lesson |
| **AD-8** | **Migration maps `user_roles` → `resource_group_members`** | Zero-touch deploy for existing hospitals |
| **AD-9** | **Deprecate runtime use of `staticRoleAccess.ts`** after slice 5 | Templates move to seed JSON / `systemGroupTemplates.ts` |
| **AD-10** | **Legacy `/api/platform/permissions` proxies to iam resolver** during transition | Avoid breaking existing frontend until slice 5 |

---

## 1. Design summary

```text
Admin edits Resource Group (permissions + capabilities + ui_access)
        ↓
resource_group_members (user_id ↔ group_id)
        ↓
access.service.resolveEffectiveAccess(userId, orgId)
        ↓
GET /api/iam/me/access  →  frontend nav + usePermissions
        ↓
requirePermission / requireCapability on routes
```

---

## 2. Data model

### 2.1 Migration `032_iam_resource_groups.sql`

```sql
CREATE TABLE public.resource_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);

CREATE TABLE public.resource_group_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.resource_groups(id) ON DELETE CASCADE,
  module text NOT NULL,
  can_create boolean NOT NULL DEFAULT false,
  can_read boolean NOT NULL DEFAULT true,
  can_update boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  UNIQUE (group_id, module)
);

CREATE TABLE public.resource_group_capabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.resource_groups(id) ON DELETE CASCADE,
  capability text NOT NULL,
  UNIQUE (group_id, capability)
);

CREATE TABLE public.resource_group_ui_access (
  group_id uuid PRIMARY KEY REFERENCES public.resource_groups(id) ON DELETE CASCADE,
  config jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE public.resource_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.resource_groups(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  added_by text REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

CREATE INDEX idx_rgm_user_id ON public.resource_group_members (user_id);
CREATE INDEX idx_rg_org_id ON public.resource_groups (organization_id);
```

**Capability enum (application layer):** `prescribe`, `approve_lab`, `approve_radiology`, `clinical_orders`, `ed_triage_read`, `ed_triage_write`.

**Module enum:** same 11 modules as `usePermissions.ts` MODULES.

### 2.2 Drizzle pgschema

`backend/src/modules/iam/pgschema/*.pgschema.ts` — mirror live tables; export from `pgschema/index.ts`.

### 2.3 System group templates

**File:** `backend/src/modules/iam/groups/systemGroupTemplates.ts`

Maps slug → permissions, capabilities, ui_access (ported from `staticRoleAccess.ts` + `require-roles.ts`):

| Slug | Maps from current role/persona |
|------|--------------------------------|
| `org_admin` | super_admin full nav + all modules |
| `opd_doctor` | doctor persona |
| `opd_nurse` | nurse (non-ED) |
| `ed_doctor` | ed_doctor |
| `ed_nurse` | ed_nurse |
| `lab_desk` | lab_tech / phlebotomist |
| `pathologist` | pathologist approve |
| `radiology_desk` | radiographer |
| `radiologist` | radiologist approve |
| `biller` | biller RCM nav |
| `receptionist` | frontdesk nav |

### 2.4 Seed + backfill

- On `createOrganization`: call `seedSystemResourceGroups(orgId)`.
- One-time migration job: for each existing org → seed groups if missing; for each `user_roles` row → insert `resource_group_members` where slug maps from role name.

**Role → group slug map:**

```typescript
const ROLE_TO_GROUP_SLUG: Record<string, string> = {
  super_admin: 'org_admin',
  admin: 'org_admin',
  provider_admin: 'org_admin',
  doctor: 'opd_doctor',
  nurse: 'opd_nurse',
  ed_doctor: 'ed_doctor',
  ed_nurse: 'ed_nurse',
  lab_tech: 'lab_desk',
  phlebotomist: 'lab_desk',
  pathologist: 'pathologist',
  radiographer: 'radiology_desk',
  radiologist: 'radiologist',
  biller: 'biller',
  receptionist: 'receptionist',
  pharmacist: 'opd_doctor', // full nav subset — tune in seed
  // ...
};
```

### 2.5 Deprecation path for `module_permissions`

- v1: table remains; **not written** on group member add.
- Resolver: group permissions only; ignore per-user rows unless override slice shipped.
- Later migration: drop or repurpose as `user_permission_overrides`.

---

## 3. Backend module layout

```text
backend/src/modules/iam/
├── index.ts                    # fastify-plugin
├── iam.routes.ts               # aggregator
├── iam.constants.ts            # IAM_API_BASE, CAPABILITY, MODULE enums
├── iam.types.ts
├── pgschema/
├── groups/
│   ├── groups.routes.ts
│   ├── groups.controller.ts
│   ├── groups.schema.ts
│   ├── groups.service.ts       # CRUD groups, edit permissions/capabilities/ui
│   └── systemGroupTemplates.ts
├── members/
│   ├── members.routes.ts
│   ├── members.controller.ts
│   ├── members.schema.ts
│   └── members.service.ts      # add/remove/list members
├── access/
│   ├── access.routes.ts
│   ├── access.controller.ts
│   ├── access.schema.ts
│   └── access.service.ts       # resolveEffectiveAccess, pickPrimaryRole
├── authorization/
│   ├── authorization.middleware.ts  # requirePermission, requireCapability
│   └── capability-sets.ts           # maps capability → legacy role Set (transition)
└── __tests__/
```

**Register in `build-app.ts`:** `app.register(iamPlugin)`.

**Middleware relocation:** `require-roles.ts` capability checks delegate to `access.service.hasCapability()` over time; keep re-exports for unchanged routes until slice 5.

---

## 4. API endpoints

Base: `IAM_API_BASE = '/api/iam'`. All org-scoped routes use `withOrgAuth`; mutations require `assertSuperAdmin` unless noted.

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/api/iam/groups` | List groups for org | org member + read admin or super_admin |
| GET | `/api/iam/groups/:id` | Group detail + permissions + capabilities + ui + member count | super_admin |
| POST | `/api/iam/groups` | Create custom group | super_admin |
| PATCH | `/api/iam/groups/:id` | Update name, permissions, capabilities, ui_access | super_admin |
| DELETE | `/api/iam/groups/:id` | Delete custom group (empty members) | super_admin |
| GET | `/api/iam/groups/:id/members` | List members | super_admin |
| POST | `/api/iam/groups/:id/members` | Add user `{ user_id }` | super_admin |
| DELETE | `/api/iam/groups/:id/members/:userId` | Remove member | super_admin |
| GET | `/api/iam/me/access` | Effective permissions + capabilities + ui_access + group slugs | org member |
| GET | `/api/iam/users/:userId/groups` | Groups for user | super_admin |

**Legacy shim (slice 2–4):**

| Legacy | Shim |
|--------|------|
| `GET /api/platform/permissions` | Calls `access.service.resolveEffectiveAccess` |
| `GET /api/platform/me` | Adds `ui_access`, `groups[]` fields |

**Protect existing hole:**

| Route | Fix |
|-------|-----|
| `GET/POST/PATCH /api/platform/module-permissions` | `assertSuperAdmin` immediately (slice 1 hotfix can ship early) |

Every route: full `schema.response` for success + 403/404/422.

---

## 5. Access resolution algorithm

```typescript
// access.service.ts — conceptual
async function resolveEffectiveAccess(userId: string, orgId: string) {
  if (await assertSuperAdmin(userId)) return SUPER_ADMIN_ACCESS;
  if (await assertPlatformAdmin(userId)) return PLATFORM_ADMIN_ACCESS; // hospital UI minimal

  const groupIds = await listGroupIdsForUser(userId, orgId);
  const perms = mergeModulePermissions(await loadGroupPermissions(groupIds)); // OR booleans
  const capabilities = union(await loadGroupCapabilities(groupIds));
  const uiAccess = mergeUiAccess(await loadGroupUiAccess(groupIds)); // priority: restricted nav wins
  const groups = await loadGroupSlugs(groupIds);

  return { permissions: perms, capabilities, ui_access: uiAccess, groups, role: pickPrimaryRoleFromGroups(groups) };
}
```

**Cache:** extend `auth-context-cache.ts`:

- `auth:access:{userId}:{orgId}` TTL 120s
- Invalidate on: member add/remove, group permission patch, org suspend

---

## 6. Authorization middleware

**File:** `iam/authorization/authorization.middleware.ts`

```typescript
export const requirePermission = (module: Module, action: Action): preHandler =>
export const requireCapability = (capability: Capability): preHandler =>
```

Implementation calls `resolveEffectiveAccess` (or cached `req.auth.effectiveAccess` attached by `attachEffectiveAccess` preHandler).

**P0 routes (slice 3):**

- Encounters: create/update → `encounters` module
- Claims: create/submit → `claims`
- Billing mutations → `encounters` or dedicated module
- Prescriptions write → `prescriptions` + `requireCapability('prescribe')`
- Orders approval → `requireCapability('approve_lab'|'approve_radiology')`
- IAM group/member mutations → super_admin

**Phased rollout (slice 5):** frontdesk, RCM read paths, IPD, remaining clinical.

---

## 7. Frontend module layout

```text
src/modules/iam/
├── index.ts                 # barrel
├── iam.constants.ts         # IAM_UI_BASE, route paths
├── iam.types.ts             # EffectiveAccess, ResourceGroup, etc.
├── api/
│   ├── groups.service.ts
│   ├── members.service.ts
│   └── access.service.ts
├── hooks/
│   ├── useEffectiveAccess.ts    # replaces usePermissions + useRoleAccess
│   └── useResourceGroups.ts
├── components/
│   ├── RequirePermission.tsx
│   └── GroupMemberPicker.tsx
└── pages/
    └── resource-groups/
        ├── index.tsx            # list groups
        ├── detail.tsx           # edit group + members
        └── routes.tsx
```

**Org Setup change:** `/org-setup` adds **Resource Groups** tab as primary; legacy Users & Roles matrix moved to secondary/deprecated section.

**AppSidebar:** consume `useEffectiveAccess().uiAccess` instead of `useRoleAccess()`.

---

## 8. Migration strategy

1. Deploy migration `032` + seed/backfill (slice 1).
2. Deploy iam module read paths — dual-read: groups + legacy (slice 2).
3. Frontend still on static until slice 5.
4. Enable middleware on P0 routes (slice 3).
5. Switch frontend to API access (slice 5).
6. Remove shim + static file (slice 5 cleanup).

**Rollback:** feature flag `IAM_GROUP_RBAC_ENABLED` — resolver falls back to legacy `user_roles` + `module_permissions` if false.

---

## 9. Testing approach

| Layer | Tests |
|-------|-------|
| Unit | `access.service` merge logic; template seed completeness |
| Integration | Add user to group → `/me/access` reflects template; wrong group → 403 on protected route |
| Frontend | `useEffectiveAccess` hook; Resource Groups page add member |
| Regression | Demo `@flowmd.dev` accounts same nav as before (snapshot slugs) |

Mock org rows: `active: true` (PR review lessons). Default `resource_group_members` mock includes fields any handler destructures.

---

## 10. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Drift during transition (3 systems) | Feature flag; slice order; delete static in slice 5 only |
| Performance (N groups × M modules) | Cache 120s; single query with joins |
| super_admin lockout | Guard last super_admin demotion |
| Incomplete route coverage | Slice 3 P0 list + openapi sweep test increment |

---

## 11. Slice suggestions

See [slices/README.md](./slices/README.md).

| Slice | Summary |
|-------|---------|
| IAM-1 | Schema + seed + backfill + list groups + add member (tracer) |
| IAM-2 | Access resolver + `/me/access` + legacy shim + protect module-permissions |
| IAM-3 | Admin UI resource groups + edit group permissions |
| IAM-4 | `requirePermission` / `requireCapability` on P0 backend routes |
| IAM-5 | Frontend `useEffectiveAccess`; kill `staticRoleAccess`; sidebar from API |
| IAM-6 | Custom groups + route rollout remainder |

---

<!-- Gate G2: approval block before decompose implement -->
