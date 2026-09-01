# PRD: Platform Admin — Onboard & manage hospitals (OPD / IPD module flags)

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `platform-admin-hospitals` |
| **Version** | 1.0 draft |
| **Date** | 2026-08-20 |
| **Status** | Draft — **Gate G1 pending** (product decisions below locked) |
| **Supersedes** | `super-admin-hospitals` PRD (2026-08-19) |

---

## Background & Problem

flowMD is **multi-tenant**: many hospitals share one deployment and one Postgres; each hospital is a row in `organizations`.

Each hospital may use **OPD**, **IPD**, or **both** — configured per organization, not per codebase fork.

### Problem today

1. New hospitals are created only through **database seed or manual SQL**.
2. Existing **`super_admin`** is the **hospital-internal** highest admin (users, roles, org profile, staff, payer catalog) — scoped to **one org**. It must **not** be repurposed for cross-tenant hospital onboarding.
3. There is **no dedicated platform operator role** and no UI to create or list hospitals.
4. The name “platform admin” exists only as `is_platform_admin()` — which today checks **`super_admin`**, not a separate role.

### What we are building

A **new role `platform_admin`** for flowMD company staff who **onboard and manage hospitals** platform-wide.

**Existing roles stay unchanged**, especially `super_admin`.

Platform admin accounts are **static in the database** (seed / manual SQL only). Nobody can grant `platform_admin` from the hospital Org setup UI.

**Product lock (2026-08-20):** Everything else in the app stays **as it is**. This slice is **only hospital onboarding**. No changes to payer catalog, `super_admin` behaviour, clinical modules, or hospital admin flows.

---

## Confirmed product decisions

| Decision | Answer |
|----------|--------|
| Platform admin email | **`platform@flowmd.ai`** — confirmed |
| Hospital create fields | **All fields already used for org profile + regional settings** (see below) |
| Payer catalog | **No change** — stays on existing `super_admin` gate; out of this slice |
| Existing roles | **`super_admin`, `provider_admin`, all hospital flows unchanged** |
| Scope | **Hospital onboard only** — create, list, edit hospitals + OPD/IPD flags |

---

## Role model (locked for this PRD)

| Role | Who | Scope | Changed by this PRD? |
|------|-----|--------|----------------------|
| **`platform_admin`** (NEW) | flowMD platform operator | **All hospitals** — create, list, OPD/IPD flags | **Yes — add role** |
| **`super_admin`** | Hospital IT / top hospital admin | **One hospital** — users, org profile, staff, payer catalog, module bypass | **No — unchanged** |
| **`provider_admin`** | Hospital org admin | One hospital — org setup (partial) | **No — unchanged** |
| **Clinical / ops roles** | Doctors, nurses, reception, etc. | One hospital | **No — unchanged** |

```text
flowMD staff                         Hospital staff
────────────                         ──────────────
platform_admin                       super_admin, provider_admin, …
  → Platform → Hospitals               → Org setup, Personnel, clinical…
  → cross-tenant                       → single tenant only
  → DB-seeded creds only               → assignable by hospital super_admin
```

---

## Goals & Success Metrics

| Goal | Metric | Target |
|------|--------|--------|
| Platform operator can onboard without SQL | Hospitals created via UI/API | 100% of new tenants in dev/staging |
| Module choice recorded at creation | Every new org has `opd_enabled` + `ipd_enabled` | 100% |
| Existing hospital admin roles untouched | Zero behaviour change for `super_admin` / `provider_admin` | No regressions in Org setup, Personnel, payer catalog |
| Platform admin is tightly controlled | `platform_admin` assignable only via DB | 0 UI/API paths to grant role |
| Unauthorized users blocked | Non–platform-admin create/list/update flags | 403 |
| Minimal schema change | New tables | **0**; 2 columns on `organizations` + 1 enum value |

---

## User Personas

| Persona | Role | Needs |
|---------|------|--------|
| **Platform Admin** | `platform_admin` | Create/list hospitals, set OPD/IPD flags |
| **Hospital Super Admin** | `super_admin` (unchanged) | Manage users, staff, org profile **inside their hospital** |
| **Hospital Admin** | `provider_admin` | Org setup for own hospital |
| **Hospital staff** | doctor, nurse, … | No direct use of this feature; later `/me` flags for nav |

---

## Platform admin provisioning (static DB credentials)

### Principle

Platform admin is **not** a self-service or hospital-manageable role.

| Allowed | Not allowed |
|---------|-------------|
| Seed file (`demo.sql`, `create-admin.ts`) | Org setup → Users & Roles |
| One-off migration | `super_admin` assigning `platform_admin` |
| Manual SQL by DevOps / DBA | Self sign-up on `/auth` |
| Documented runbook in repo | Public API to create platform admins |

### v1 seeded account (dev / staging)

| Field | Value |
|-------|--------|
| **Email** | `platform@flowmd.ai` |
| **Password** | Set in `create-admin.ts` seed script (same pattern as `admin@flowmd.ai`; document in `POST-SETUP.md` — **not** committed as plaintext in PRD) |
| **Profile org** | FlowMD internal org — reuse demo org `00000000-0000-0000-0000-000000000001` (Flow Health) for profile FK only; hospital APIs **ignore org scope** for platform admin |
| **Role row** | `user_roles.role = platform_admin` for that user |

Production: same mechanism — **insert user + profile + role via controlled migration or ops SQL**, not product UI.

### Runbook (acceptance)

- [ ] `docs/platform/PLATFORM-ADMIN-RUNBOOK.md` (or section in `POST-SETUP.md`) explains how ops adds/removes a platform admin via SQL
- [ ] Seed creates exactly one platform admin for local dev
- [ ] Demo hospital `super_admin` accounts (`admin@flowmd.ai`, etc.) **do not** receive `platform_admin` unless explicitly documented for dual-role dev testing

---

## User Workflows

### Workflow 1: Platform Admin logs in

1. Platform operator opens flowMD login.
2. Signs in with **seeded** credentials (`platform@flowmd.ai` in dev).
3. Session loads `platform_admin` from `user_roles`.
4. Sidebar shows **Platform → Hospitals** (platform admin only).
5. Hospital-scoped admin screens (Personnel, payer catalog) remain hidden or inaccessible unless user also has those roles (not default).

---

### Workflow 2: Create hospital (full org details + OPD/IPD)

**Persona:** Platform Admin

1. Opens **Platform → Hospitals**.
2. Clicks **Add hospital**.
3. Fills all **writable `organizations` fields** (see § Hospital create — full database field contract):
   - Identity: name *(required)*, npi, tax_id, phone, email
   - Address jsonb: street, city, county, country, postal_code
   - Status: active, billing_mode
   - Regional: currency, timezone, locale, date_format, time_format, jurisdiction_code
4. Sets **Module flags:** OPD enabled (default on), IPD enabled (default off)
5. Submit → new `organizations` row.
6. Hospital appears in list.

**Validation:** name required; at least one of OPD/IPD checked; NPI unique if provided (existing DB constraint).

See **§ Hospital create — full database field contract** below for every column/key.

**Post-create (out of scope):** Hospital `super_admin` or `provider_admin` adds users inside that hospital.

---

## Hospital create — full database field contract

Every column on `public.organizations` (existing + this feature). Platform Admin **create/edit form and POST/PATCH API** must accept all **writable** keys below.

### Existing columns (today’s schema)

| DB column | API / form key | Type | Required on create | Default if omitted | Notes |
|-----------|----------------|------|--------------------|--------------------|-------|
| `id` | — | uuid | — | `gen_random_uuid()` | **System-generated** — not in form |
| `name` | `name` | text | **Yes** | — | Hospital display name |
| `npi` | `npi` | text | No | `null` | Facility / national ID; **unique** if set |
| `tax_id` | `tax_id` | text | No | `null` | Tax registration |
| `address` | `address` | jsonb object | No | `null` | See address sub-keys below |
| `phone` | `phone` | text | No | `null` | Main contact phone |
| `email` | `email` | text | No | `null` | Main org email |
| `active` | `active` | boolean | No | `true` | Tenant active/suspended |
| `billing_mode` | `billing_mode` | text enum | No | `fee_for_service` | Allowed: `dpc`, `fee_for_service`, `hybrid` |
| `currency` | `currency` | text | No | `AED` | From allowed currency list (Org setup) |
| `timezone` | `timezone` | text | No | `Asia/Dubai` | IANA timezone |
| `locale` | `locale` | text | No | `en-AE` | e.g. `en-KE`, `en-AE` |
| `date_format` | `date_format` | text | No | `DD/MM/YYYY` | Display format |
| `time_format` | `time_format` | text | No | `24h` | `12h` or `24h` |
| `jurisdiction_code` | `jurisdiction_code` | text | No | `KE` | Market / jurisdiction (e.g. `KE`, `AE`) |
| `created_at` | — | timestamptz | — | `now()` | **System-generated** |
| `updated_at` | — | timestamptz | — | `now()` | **System-set on save** |

### `address` jsonb sub-keys (same as Org setup PATCH today)

| Sub-key | API key | Required |
|---------|---------|----------|
| Street | `address.street` | No |
| City | `address.city` | No |
| County / state | `address.county` or `address.state` | No |
| Country | `address.country` | No |
| Postal code | `address.postal_code` or `address.zip` | No |

Example (from demo seed):

```json
{
  "street": "Hospital Road",
  "city": "Abu Dhabi",
  "county": "Reem Island",
  "country": "UAE",
  "postal_code": "00202"
}
```

### New columns (this feature — migration)

| DB column | API / form key | Type | Required on create | Default if omitted | Notes |
|-----------|----------------|------|--------------------|--------------------|-------|
| `opd_enabled` | `opd_enabled` | boolean | No | `true` | Outpatient modules |
| `ipd_enabled` | `ipd_enabled` | boolean | No | `false` | Inpatient modules |

**Module rule:** at least one of `opd_enabled` or `ipd_enabled` must be `true`.

### Summary — keys Platform Admin sends on create

```json
{
  "name": "string (required)",
  "npi": "string | null",
  "tax_id": "string | null",
  "address": {
    "street": "string",
    "city": "string",
    "county": "string",
    "country": "string",
    "postal_code": "string"
  },
  "phone": "string | null",
  "email": "string | null",
  "active": true,
  "billing_mode": "fee_for_service | dpc | hybrid",
  "currency": "string",
  "timezone": "string",
  "locale": "string",
  "date_format": "string",
  "time_format": "12h | 24h",
  "jurisdiction_code": "string",
  "opd_enabled": true,
  "ipd_enabled": false
}
```

**Not in request body:** `id`, `created_at`, `updated_at` (server-managed).

---

### Workflow 3: Create embedded hospital (OPD + IPD)

Same as Workflow 2 with both **OPD enabled** and **IPD enabled** checked.

---

### Workflow 4: Create OPD-only hospital

Same as Workflow 2; **IPD enabled** unchecked.

---

### Workflow 5: Create IPD-only hospital

Same as Workflow 2; **OPD enabled** unchecked, **IPD enabled** on.

**Validation:** reject if **both** module flags unchecked.

---

### Workflow 6: Edit existing hospital

1. Open **Platform → Hospitals** → select hospital.
2. Edit org profile fields, regional settings, and/or OPD/IPD flags.
3. Save → PATCH (platform admin, any org id).

---

## User Stories

### US-1: New platform_admin role

**As a** product owner  
**I want** a dedicated `platform_admin` role  
**So that** hospital onboarding does not reuse or break `super_admin`

**Acceptance Criteria:**

- [ ] `platform_admin` added to `app_role` enum via migration
- [ ] Existing `super_admin` checks and behaviour unchanged
- [ ] `platform_admin` is **not** assignable from Org setup UI or existing user-role APIs available to hospital admins

**Priority:** Must Have

---

### US-2: Static platform admin credentials in DB

**As a** platform owner  
**I want** platform admin accounts provisioned only via seed/SQL  
**So that** hospital staff cannot elevate themselves to platform operator

**Acceptance Criteria:**

- [ ] Dev seed creates `platform@flowmd.ai` (or agreed email) with `platform_admin` role
- [ ] Password set via existing `create-admin.ts` (or equivalent) — documented in setup docs
- [ ] Runbook documents manual SQL steps to add/remove platform admin in staging/production
- [ ] No API endpoint to grant `platform_admin` in v1

**Priority:** Must Have

---

### US-3: Create hospital with full org details and module flags

**As a** Platform Admin  
**I want** to create a hospital with the same org fields we already use in Org setup, plus OPD/IPD checkboxes  
**So that** the tenant is fully configured at onboarding without manual SQL

**Acceptance Criteria:**

- [ ] Create form + POST body accept **every writable `organizations` column** per § Hospital create — full database field contract
- [ ] **Required:** `name` only (DB NOT NULL); module flags: at least one of OPD/IPD true
- [ ] **Optional:** all other writable columns with DB defaults when omitted
- [ ] `address` jsonb with all sub-keys supported
- [ ] `billing_mode` validated against `dpc | fee_for_service | hybrid`
- [ ] Only `platform_admin` can create
- [ ] Returns full created row including `id`, timestamps, and all saved fields

**Priority:** Must Have

---

### US-4: List all hospitals

**As a** Platform Admin  
**I want** to see all hospitals with key details and OPD/IPD flags  
**So that** I can manage tenants from one place

**Acceptance Criteria:**

- [ ] List shows: name, npi, active, billing_mode, currency, jurisdiction_code, OPD flag, IPD flag, created date
- [ ] Only `platform_admin` can call list API / open page
- [ ] Includes pre-migration hospitals (with default flags after backfill)

**Priority:** Must Have

---

### US-5: Edit existing hospital

**As a** Platform Admin  
**I want** to update **any writable `organizations` column** on any hospital  
**So that** tenant details and contracts can change without SQL

**Acceptance Criteria:**

- [ ] PATCH accepts **same keys as create** (§ Hospital create — full database field contract)
- [ ] Cross-tenant: any org id (platform admin only)
- [ ] Cannot save both module flags false
- [ ] Hospital `super_admin` PATCH rules for **own org only** remain unchanged

**Priority:** Must Have

---

### US-6: Session exposes org module flags

**As a** logged-in hospital user  
**I want** my organization’s OPD/IPD flags on `/me`  
**So that** a later slice can gate navigation

**Acceptance Criteria:**

- [ ] `GET /api/platform/me` includes `opd_enabled`, `ipd_enabled` for the user’s organization
- [ ] Values match database

**Priority:** Must Have (API only; no sidebar gating in this PRD)

---

### US-7: Existing hospitals keep OPD behaviour

**As a** product owner  
**I want** safe migration defaults  
**So that** rollout does not break current OPD customers

**Acceptance Criteria:**

- [ ] All existing org rows: `opd_enabled=true`, `ipd_enabled=false` after migration
- [ ] Optional seed patch: demo Flow Health `ipd_enabled=true` for IPD dev testing

**Priority:** Must Have

---

### US-8: super_admin unchanged

**As a** hospital super admin  
**I want** my existing permissions to work as today  
**So that** this feature does not disrupt hospital operations

**Acceptance Criteria:**

- [ ] `super_admin` still manages users/roles, org profile (own org), Personnel, Clinical Staff, payer catalog
- [ ] `super_admin` **cannot** list all hospitals or create new hospitals (unless also given `platform_admin` in DB — not default)
- [ ] No changes to `assertSuperAdmin()` behaviour for existing endpoints

**Priority:** Must Have

---

## Scope

### In Scope

- Migration: add `platform_admin` to `app_role` enum
- Migration: add `opd_enabled`, `ipd_enabled` to `organizations` (NOT NULL, defaults, backfill)
- Seed: static platform admin user + `platform_admin` role row
- Docs: runbook for ops SQL to add/remove platform admin
- API: `POST /api/platform/organizations` — create (platform_admin, cross-tenant)
- API: `GET /api/platform/organizations` — list all (platform_admin)
- API: extend `GET/PATCH /api/platform/organizations/:id` — flags; PATCH flags cross-tenant for platform_admin only
- API: extend `GET /api/platform/me` — include flags
- Middleware: `assertPlatformAdmin()` (new) on hospital-management routes only
- UI: **Platform → Hospitals** — list, create, edit (org profile + regional + OPD/IPD flags); reuse Org setup field layout/components where practical
- Tests: auth (403 for super_admin without platform_admin), validation, integration smoke

### Out of Scope

- **Any change** to payer catalog, terminology, or `is_platform_admin()` / `super_admin` payer gates
- **Any change** to hospital `super_admin` / `provider_admin` permissions or UI
- UI or API to assign/revoke `platform_admin`
- Sidebar gating by OPD/IPD flags
- IPD API 403 when IPD disabled
- Auto-create hospital admin user on hospital create (**suggested for Slice 2 via email invite** — see [suggestion-email-invite-onboarding.md](./suggestion-email-invite-onboarding.md); not v1 unless explicitly added)
- **Outbound mail system** (SMTP / SendGrid / invite templates) — suggestion only, not v1
- Region/profile picker (`config_profile_id`), `p1_config.facility` provisioning
- Clinical, RCM, Personnel, Contracted Orgs — all unchanged

---

## Suggested follow-up (not v1 — product recommendation)

**See:** [suggestion-email-invite-onboarding.md](./suggestion-email-invite-onboarding.md)

After v1 ships hospital create/list/flags, the recommended **Slice 2** is a **platform mail system** so the first hospital admin does **not** need a password typed by Platform Admin:

1. Platform Admin creates hospital + enters **hospital admin email only**
2. System sends **invite email** with secure link (expires e.g. 72h)
3. Hospital admin opens link → **sets their own password** → logs in at `/auth`

**Why suggestion only:** Today there is **no outbound email** in the app (verification off, password reset stubbed). v1 should not block on mail infra.

**v1 default (if first admin needed before mail slice):** optional manual step — create admin with email + password using existing Personnel/sign-up pattern, or ops SQL — documented in runbook, not required for Gate G1.

---

## Edge Cases

| Case | Expected behaviour |
|------|---------------------|
| Both OPD and IPD unchecked | 400/422 validation error |
| `super_admin` calls POST or GET list (no `platform_admin`) | 403 Forbidden |
| `provider_admin` calls hospital create/list | 403 Forbidden |
| User has both `platform_admin` and `super_admin` | Platform hospital APIs + existing super_admin powers (dev only; not default seed) |
| Platform admin PATCH own profile org | Org-scoped endpoints unchanged; hospital CRUD uses platform middleware |
| Duplicate hospital name | Allow (no unique constraint on name unless product changes) |
| Empty hospital name | 400 validation error |
| Hospital admin opens `/platform/hospitals` | Access denied |
| Attempt to assign `platform_admin` via Org setup | Rejected — role not in assignable ROLE_OPTIONS for hospital admins |
| Self sign-up | Never receives `platform_admin` |

---

## API authorization summary

| Endpoint | platform_admin | super_admin (hospital) | provider_admin |
|----------|----------------|------------------------|----------------|
| `POST /api/platform/organizations` | ✅ | ❌ | ❌ |
| `GET /api/platform/organizations` | ✅ | ❌ | ❌ |
| `PATCH .../:id` (flags, any org) | ✅ | ❌ (own org profile only, existing rules) | ❌ |
| `GET .../:id` (any org) | ✅ | Own org only (existing) | Own org only |
| Existing org setup / users / payer catalog | ❌ (unless also super_admin) | ✅ (existing) | Partial (existing) |

---

## Design References

- Architecture: [flowmd-platform-full-architecture.md §1.3](../../../docs/architecture/flowmd-platform-full-architecture.md)
- Embedded Case 1: [his-global-south.md §7](../../../docs/architecture/his-global-south.md)
- Superseded: [super-admin-hospitals PRD](../super-admin-hospitals/prd.md)
- Existing hospital admin UI: `src/pages/admin/` — **different persona**
- DB function (future): `is_platform_admin()` — technical design may wire to `platform_admin`

---

## Dependencies

| Dependency | Notes |
|------------|--------|
| `his-global-south` on `develop` | Target clone |
| Better Auth | Existing sign-in |
| `organizations` + platform org module | Extend |
| `create-admin.ts` / `demo.sql` | Add platform admin seed |

---

## Open Questions

| # | Question | Status |
|---|----------|--------|
| 1 | Platform admin email `platform@flowmd.ai` | **Confirmed** |
| 2 | Hospital create fields | **Confirmed** — all writable `organizations` DB columns + `opd_enabled` / `ipd_enabled` (see field contract section) |
| 3 | Payer catalog / super_admin | **No change** — out of scope; everything else as-is |
| 4 | Platform admin UI scope | **Hospitals page only** (+ login/logout); no clinical modules |
| 5 | First hospital admin login | **v1:** out of scope or manual password (Personnel pattern). **Suggested Slice 2:** email invite — see [suggestion doc](./suggestion-email-invite-onboarding.md) |

---

## Approval (Gate G1)

- [ ] Product — role split (`platform_admin` vs unchanged `super_admin`) accepted
- [ ] Product — static DB-only provisioning for platform admin accepted
- [ ] Tech — no file-level design in this PRD (G2 technical design)
- [ ] **Approved by:** ___
- [ ] **Date:** YYYY-MM-DD

**Agent rule:** Do not proceed to technical design until all boxes are checked.

---

## Next step after G1 approval

```text
PRD approved for his-global-south platform-admin-hospitals. Proceed to technical design.
```
