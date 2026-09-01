# Slice 1 — Org product flags (`opd_enabled` / `ipd_enabled`)

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `ipd` |
| **Branch base** | `develop` (after Slice 0 merged) |
| **Depends on** | [ipd-slice-0-scaffold.md](./ipd-slice-0-scaffold.md) merged |
| **Goal** | Per-hospital OPD/IPD module toggles — DB columns, API exposure, IPD enforcement (403), UI gates |

---

## Approval

| Role | Name | Date | Status |
|------|------|------|--------|
| Product | | | pending |
| Engineering | | | pending |

## Approval (required before implement)

- [ ] Product — acceptance criteria match intent
- [ ] Tech — architecture decisions (ADR 0006, §7) respected; no scope creep
- [ ] **Approved by:** ___
- [ ] **Date:** YYYY-MM-DD

**Agent rule:** Do not implement until all boxes are checked.

---

## Context (read before coding)

| Doc | Why |
|-----|-----|
| [his-global-south.md](../../docs/architecture/his-global-south.md) §7 | Locked flag defaults and 403 rule |
| [flowmd-two-cases-and-plugins.md](../../docs/architecture/flowmd-two-cases-and-plugins.md) | Case 1 embedded vs standalone hospital |
| [flowmd-platform-full-architecture.md](../../docs/architecture/flowmd-platform-full-architecture.md) §1.2–1.3, Part 3–4 | Super Admin sets flags; embedded vs IPD-only |
| [his-global-south-patterns.md](../../docs/conventions/his-global-south-patterns.md) | IPD routing, constants, module layout |
| ADR [0006](../../docs/decisions/his-global-south/0006-embedded-in-his-global-south.md) | IPD embedded in same app/DB |
| ADR [0009](../../docs/decisions/his-global-south/0009-ipd-naming-and-versioning.md) | `/api/v1/ipd/*` prefix |

**Clone path:** `projects/his-global-south/`

---

## 1. Problem statement

Phase 1 is **Case 1 — embedded OPD + IPD** in one app ([flowmd-two-cases-and-plugins.md](../../docs/architecture/flowmd-two-cases-and-plugins.md)). Not every hospital runs both modules:

| Hospital type | `opd_enabled` | `ipd_enabled` | User experience |
|---------------|---------------|-----------------|-----------------|
| **Embedded** (typical) | `true` | `true` | OPD + IPD menus |
| **OPD only** (default today) | `true` | `false` | OPD menus only; no IPD |
| **IPD only / standalone** (future) | `false` | `true` | IPD menus only; OPD nav hidden |

Slice 0 added the IPD module shell for **all** orgs. Slice 1 makes IPD **opt-in per organization** so:

- Hospitals without IPD contract do not see IPD UI or call IPD business APIs.
- IPD-only hospitals can be configured later without a separate codebase.
- Super Admin / org admin can flip flags on the existing `organizations` row (Phase 1: via org setup PATCH — not a separate “Create hospital” UI).

This slice implements **data + enforcement + UI gates**. It does **not** implement admissions, events, or `config_profile_id` (later slices / Super Admin portal).

---

## 2. Architecture constraints (immutable)

| ID | Constraint | This slice |
|----|------------|------------|
| AD-0006 | IPD in `backend/src/modules/ipd/` + `src/pages/ipd/v1/` | Flags enforced in IPD module + shared platform org |
| AD-0007 | Drizzle pgschema + SQL migrations | New migration + update `organizations.pgschema.ts` |
| AD-0008 | Better Auth session cookie | No auth model change |
| ARCH-§7 | Defaults: `opd_enabled=true`, `ipd_enabled=false` | Migration defaults + backfill |
| ARCH-§7 | When `ipd_enabled=false`: IPD APIs → **403**; sidebar hidden | Middleware + sidebar + route guard |
| ADDITIVE | Do not break OPD routes/services | No OPD route rewrites; sidebar filter only for nav groups |
| NAMING | IPD API prefix `/api/v1/ipd/*` | Gate applies to all routes under prefix |

**Out of scope for Slice 1:**

- `organizations.config_profile_id` (Kenya/UAE profile — later)
- `p1_config.facility` row on IPD enable (later slice)
- Super Admin “Add hospital” portal ([flowmd-platform-full-architecture.md](../../docs/architecture/flowmd-platform-full-architecture.md) §1.3)
- OPD **API** 403 when `opd_enabled=false` (store flag + UI hide only; API gate deferred to avoid wide OPD touch)
- `module_permissions` per-module IPD row (use org flag + existing RBAC)

---

## 3. Previous slice context (must exist in code)

From Slice 0 (verify before implement):

| Item | Expected |
|------|----------|
| `backend/src/modules/ipd/` plugin registered in `build-app.ts` | Yes |
| `GET /api/v1/ipd/health` | 200, no auth today |
| `src/routes/ipdRoutes.tsx` + `src/pages/ipd/v1/routes.tsx` | Central routing per conventions |
| Sidebar link to `/ipd/v1` | Present (will be gated this slice) |

---

## 4. Data model

### 4.1 New columns on `public.organizations`

| Column | Type | Default | Meaning |
|--------|------|---------|---------|
| `opd_enabled` | `boolean NOT NULL` | `true` | Hospital uses OPD modules (frontdesk, clinical, RCM nav) |
| `ipd_enabled` | `boolean NOT NULL` | `false` | Hospital uses IPD module (`/api/v1/ipd/*`, `/ipd/v1/*`) |

**Business rules:**

- At least one must be `true` (check constraint or PATCH validation).
- Existing rows backfill: `opd_enabled=true`, `ipd_enabled=false` (matches current production behavior).
- Demo org `00000000-0000-0000-0000-000000000001` (**Flow Health**): set `ipd_enabled=true` in migration or seed patch so dev can test IPD without manual SQL.

### 4.2 Migration

- File: `backend/src/db/migrations/002_organizations_product_flags.sql`
- Steps:
  1. `ALTER TABLE organizations ADD COLUMN opd_enabled boolean NOT NULL DEFAULT true;`
  2. `ALTER TABLE organizations ADD COLUMN ipd_enabled boolean NOT NULL DEFAULT false;`
  3. `COMMENT ON COLUMN organizations.opd_enabled IS '...';`
  4. `COMMENT ON COLUMN organizations.ipd_enabled IS '...';`
  5. Optional: `ALTER TABLE ... ADD CONSTRAINT organizations_at_least_one_module CHECK (opd_enabled OR ipd_enabled);`
  6. `UPDATE organizations SET ipd_enabled = true WHERE id = '00000000-0000-0000-0000-000000000001';` (demo only)
- Update mirror: `backend/src/modules/platform/pgschema/organizations.pgschema.ts`

Run: `npm run db:migrate` in `backend/` (Docker: `docker compose exec api npm run db:migrate`).

---

## 5. Backend design

### 5.1 Read path — expose flags to clients

**`GET /api/platform/me`** and **`GET /api/platform/organizations/:id`** must include:

```json
{
  "opd_enabled": true,
  "ipd_enabled": false
}
```

(snake_case in JSON per API convention)

Implementation:

- Extend `getMe()` join/select in `org.service.ts` to include columns from `organizations`.
- Extend `getOrganization()` / `patchOrganization()` returning payload.
- Extend `useAuth` / frontend org object (camelCase: `opdEnabled`, `ipdEnabled` via existing `keysToCamel`).

### 5.2 Write path — who can toggle flags

| Actor | Can PATCH flags? | Where |
|-------|------------------|-------|
| `super_admin` | Yes | `PATCH /api/platform/organizations/:id` |
| `provider_admin` / others | No (403) | — |

Extend `updateOrganizationBodySchema` in `platform.schema.ts`:

```typescript
opd_enabled: { type: 'boolean' },
ipd_enabled: { type: 'boolean' },
```

Extend `patchOrganization()` in `org.service.ts`:

- Validate: after patch, `opd_enabled || ipd_enabled` must remain true.
- Only `super_admin` (existing check) may change these fields.
- Return updated flags in response.

**Frontend (org setup — additive):** In `OrganizationProfileSection` or new **Module flags** collapsible (super_admin only): two switches bound to PATCH. Use existing admin service `patchOrganization`.

### 5.3 IPD API gate — `requireIpdEnabled`

New middleware: `backend/src/middleware/require-ipd-enabled.ts`

Behavior:

1. Runs **after** `withOrgAuth` (needs `req.auth.organizationId`).
2. Loads `ipd_enabled` for org (prefer cache on `req.auth` if attached in `scopeToOrg` enhancement — optional optimization).
3. If `ipd_enabled === false` → `403` with body:

```json
{
  "error": "IPD module is not enabled for this organization",
  "code": "IPD_DISABLED"
}
```

**Apply to:**

- All routes registered under `backend/src/modules/ipd/` **except** none — **including** `GET /api/v1/ipd/health` when called in org-scoped context.

**Health endpoint auth note (Slice 1 change from Slice 0):**

- Change `GET /api/v1/ipd/health` to use `{ preHandler: [...withOrgAuth, requireIpdEnabled] }` so disabled orgs get 403.
- Unauthenticated calls → 401 from `authenticate` (acceptable).

Register pattern in `ipd.routes.ts`:

```typescript
const ipdAuth = { preHandler: [...withOrgAuth, requireIpdEnabled] };
// all future IPD routes use ipdAuth
```

Export chain from `auth-prehandlers.ts` (optional convenience):

```typescript
export const withIpdOrgAuth = [authenticate, scopeToOrg, requireIpdEnabled] as const;
```

### 5.4 OPD flag (Slice 1 scope)

- **Persist and expose** `opd_enabled` only.
- **Do not** add `requireOpdEnabled` on OPD APIs in this slice.
- **Do** hide OPD sidebar groups when `opd_enabled=false` (see §6.2).

### 5.5 Platform cache / scopeToOrg (optional but recommended)

To avoid a DB hit per IPD request, extend `scopeToOrg` or org auth cache to attach:

```typescript
req.auth.productFlags = { opd_enabled: boolean, ipd_enabled: boolean };
```

Document in `auth.types.ts`. `requireIpdEnabled` reads from cache when present.

---

## 6. Frontend design

### 6.1 Source of truth

Use org flags from **`useAuth().organization`** (populated via `/api/platform/me` reload) or dedicated hook:

```typescript
// src/hooks/useOrgProductFlags.ts
export function useOrgProductFlags() {
  const { organization } = useAuth();
  return {
    opdEnabled: organization?.opdEnabled ?? true,
    ipdEnabled: organization?.ipdEnabled ?? false,
  };
}
```

Defaults match ARCH-§7 when org not loaded yet.

### 6.2 Sidebar gates ([AppSidebar.tsx](projects/his-global-south/src/components/layout/AppSidebar.tsx))

**IPD-only touch** for nav groups — filter items before render:

| Nav group | Visible when |
|-----------|--------------|
| **IPD** (`ipdItems`) | `ipdEnabled === true` |
| **Front Desk**, **Clinical**, **Revenue Cycle** | `opdEnabled === true` |
| **Organization**, **Platform**, **Dev** | unchanged (org/platform admin rules) |

Do not remove OPD routes from `appRoutes.tsx` — only hide navigation. Direct URL to OPD when `opd_enabled=false` may still work until OPD API gate exists (document as known gap).

### 6.3 Route guard — `/ipd/v1/*`

Add wrapper in `src/routes/ipdRoutes.tsx` or `src/pages/ipd/v1/routes.tsx`:

- If `!ipdEnabled` → redirect to `/` (or show “IPD not enabled” card with link to dashboard).
- Prevents bookmark access when sidebar hidden.

### 6.4 Org setup UI (super_admin)

In `/org-setup` admin page — **Module product flags** section:

- Toggle: **OPD enabled**
- Toggle: **IPD enabled**
- Helper text explaining embedded vs IPD-only (from architecture table above).
- Save via existing `patchOrganization(orgId, { opdEnabled, ipdEnabled })`.
- Validation error if both would be false (show API error message).

---

## 7. Files to create / modify

### Backend — new

| File | Purpose |
|------|---------|
| `backend/src/db/migrations/002_organizations_product_flags.sql` | Columns + comments + demo org update |
| `backend/src/middleware/require-ipd-enabled.ts` | 403 when IPD off |
| `backend/src/middleware/__tests__/require-ipd-enabled.test.ts` | Unit tests |

### Backend — modify

| File | Change |
|------|--------|
| `backend/src/modules/platform/pgschema/organizations.pgschema.ts` | Add columns |
| `backend/src/modules/platform/platform.schema.ts` | PATCH body schema |
| `backend/src/modules/platform/org/org.service.ts` | getMe, getOrganization, patchOrganization |
| `backend/src/modules/platform/org/org.types.ts` | Types for flags |
| `backend/src/middleware/auth.types.ts` | Optional `productFlags` on auth |
| `backend/src/middleware/auth-prehandlers.ts` | Export `withIpdOrgAuth` |
| `backend/src/modules/ipd/ipd.routes.ts` | Auth + requireIpdEnabled on health |
| `backend/src/modules/ipd/README.md` | Document gate |

### Frontend — new

| File | Purpose |
|------|---------|
| `src/hooks/useOrgProductFlags.ts` | Read opd/ipd flags |
| `src/pages/admin/components/OrgModuleFlagsSection.tsx` | Super admin toggles (optional extract) |

### Frontend — modify (IPD + minimal platform)

| File | Change |
|------|--------|
| `src/hooks/useAuth.tsx` | Map `opdEnabled` / `ipdEnabled` on organization |
| `src/components/layout/AppSidebar.tsx` | Filter IPD + OPD nav groups |
| `src/routes/ipdRoutes.tsx` or `src/pages/ipd/v1/routes.tsx` | Route guard when IPD off |
| `src/pages/admin/index.tsx` | Wire module flags section (super_admin) |
| `src/services/admin.service.ts` | PATCH body types if needed |
| `src/modules/ipd/index.ts` | Re-export hook if useful |

**Do not modify:** OPD page components, clinical/frontdesk/rcm services, `visit_admissions`, `/api/platform/beds/*`.

---

## 8. Testing strategy

| Layer | Test |
|-------|------|
| Unit | `require-ipd-enabled.test.ts` — enabled/disabled/missing org |
| Integration | `api.integration.test.ts`: org with `ipd_enabled=false` → `GET /api/v1/ipd/health` → **403** + code |
| Integration | org with `ipd_enabled=true` → **200** |
| Integration | `PATCH organizations/:id` flags as super_admin; forbidden for non-super_admin |
| Frontend | Optional smoke: sidebar hides IPD when flag false (mock useAuth) |

Validation commands:

```bash
cd projects/his-global-south/backend
npm run db:migrate
npm test
npm run test:integration

cd ..
npm run lint
npm run test
```

---

## 9. Acceptance criteria

| # | Criterion | Validation |
|---|-----------|------------|
| 1 | Migration adds columns with correct defaults | DB `\d organizations` or migrate log |
| 2 | Demo org Flow Health has `ipd_enabled=true` | SQL select |
| 3 | `/api/platform/me` returns both flags | curl / integration test |
| 4 | Super admin can PATCH flags; others 403 | integration test |
| 5 | Cannot set both flags false | PATCH returns 422/400 |
| 6 | `ipd_enabled=false` → any `/api/v1/ipd/*` → 403 `IPD_DISABLED` | integration test |
| 7 | `ipd_enabled=true` → `/api/v1/ipd/health` → 200 | integration test |
| 8 | Sidebar: IPD hidden when flag false | Manual / component test |
| 9 | Sidebar: OPD groups hidden when `opd_enabled=false` | Manual |
| 10 | Direct `/ipd/v1` URL redirects or shows blocked state when IPD off | Manual |
| 11 | OPD routes unchanged (no regressions in existing integration tests) | CI green |

---

## 10. Rollout / ops

1. Merge to `develop` → run migration on dev/staging.
2. Existing hospitals: behave as today (`ipd_enabled=false`).
3. Enable IPD for a hospital: super_admin → Org setup → IPD enabled → save.
4. No redeploy needed beyond normal release (flags are data-driven).

---

## 11. Follow-on slices (not this PR)

| Slice | Builds on flags |
|-------|-----------------|
| Slice 2 | Event bridge only fires if `ipd_enabled` |
| Slice 3–4 | Admissions API/UI under gated `/api/v1/ipd/admissions` |
| Future | `requireOpdEnabled`, `config_profile_id`, Super Admin create-hospital UI |

---

## Status tracking

After merge, update [prd/his-global-south/ipd/slices/status.yaml](../../prd/his-global-south/ipd/slices/status.yaml):

```yaml
- id: ipd-slice-1-org-flags
  status: merged
```

Previous slice must be `merged` before implement starts.
