# PRD: Super Admin — Create hospital with OPD / IPD module flags

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `super-admin-hospitals` |
| **Version** | 1.0 draft |
| **Date** | 2026-08-19 |
| **Status** | **Superseded** — see `../platform-admin-hospitals/prd.md` (uses new `platform_admin` role; leaves `super_admin` unchanged) |

---

## Background & Problem

flowMD serves multiple hospitals (tenants) from one platform. Each hospital may use **outpatient (OPD)**, **inpatient (IPD)**, or **both** — configured per organization, not per codebase fork.

Today:

1. New hospitals are created only through **database seed or manual SQL**, not through the product.
2. **Org setup** lets hospital admins edit **their own** organization profile — it does not create new tenants.
3. The platform API exposes **read one org** and **patch one org** — there is no **create hospital** or **list all hospitals** for platform operators.

FlowMD **Super Admin** (`super_admin` role — flowMD company staff, not hospital staff) must onboard hospitals from the UI: name the hospital and select which modules are active. Those choices must persist so future IPD and OPD features can respect them.

This PRD covers **platform onboarding only**. It does not deliver inpatient workflows (admissions, beds) — those remain separate IPD slices.

---

## Goals & Success Metrics

| Goal | Metric | Target |
|------|--------|--------|
| Super Admin can onboard a hospital without DB access | Hospitals created via UI/API | 100% of new tenants in dev/staging |
| Module choice is recorded at creation | Every new org row has `opd_enabled` + `ipd_enabled` | 100% |
| Unauthorized users cannot create tenants | Non–super-admin create/list attempts | 403 |
| Existing hospitals unchanged | Pre-migration orgs default OPD on, IPD off | Zero behaviour change until flags edited |
| Implementation stays minimal | New DB objects | **0 new tables**; 2 columns on `organizations` only |

---

## User Personas

| Persona | Who | Needs |
|---------|-----|--------|
| **Super Admin** | flowMD platform operator (`super_admin`) | Create hospital, set OPD/IPD flags, list all hospitals, edit flags |
| **Hospital admin** | `provider_admin` / org admin at one hospital | Uses org setup for **own** org only — **not** create new hospitals (unchanged) |
| **Hospital staff** | Doctors, nurses, reception | No direct interaction with this feature in v1; later `/me` flags drive nav |

---

## User Workflows

### Workflow 1: Super Admin creates embedded hospital (OPD + IPD)

**Trigger:** New customer signs for both outpatient and inpatient on same app.

**Persona:** Super Admin

1. Super Admin logs into flowMD with `super_admin` role.
2. Opens **Platform → Hospitals** (new screen).
3. Clicks **Add hospital**.
4. Enters hospital **name** (required).
5. Leaves **OPD enabled** checked (default).
6. Checks **IPD enabled**.
7. Submits form.
8. System creates `organizations` row with `opd_enabled=true`, `ipd_enabled=true`.
9. New hospital appears in list.

**Data Requirements:**

| Step | Data needed | Source |
|------|-------------|--------|
| 4 | Hospital name | User input |
| 5–6 | Module flags | User input (checkboxes) |
| 8 | Organization record | INSERT `organizations` |

**Post-create (out of this PRD):** Super Admin or hospital admin adds users, IPD bed config, etc.

---

### Workflow 2: Super Admin creates OPD-only hospital

**Trigger:** Customer uses flowMD outpatient only; IPD not contracted.

**Persona:** Super Admin

1. Same as Workflow 1, steps 1–4.
2. **OPD enabled** checked (default).
3. **IPD enabled** unchecked.
4. Submit → `opd_enabled=true`, `ipd_enabled=false`.

---

### Workflow 3: Super Admin creates IPD-only hospital (standalone)

**Trigger:** Hospital uses flowMD for inpatient only (e.g. existing HIS elsewhere); OPD UI not shown.

**Persona:** Super Admin

1. Same as Workflow 1, steps 1–4.
2. **OPD enabled** unchecked.
3. **IPD enabled** checked.
4. Submit → `opd_enabled=false`, `ipd_enabled=true`.

Validation must reject both unchecked.

---

### Workflow 4: Super Admin updates module flags on existing hospital

**Trigger:** Customer adds IPD contract to existing OPD hospital.

**Persona:** Super Admin

1. Opens **Platform → Hospitals**.
2. Selects hospital from list.
3. Toggles **IPD enabled** on.
4. Saves → PATCH organization flags.

**Note:** Creating `p1_config.facility` or IPD bed setup when IPD is enabled is **out of scope** for this PRD — handled in a later IPD config slice.

---

## User Stories

### US-1: Create hospital with module flags

**As a** Super Admin  
**I want** to create a new hospital with a name and OPD/IPD checkboxes  
**So that** the tenant is onboarded without manual database work

**Acceptance Criteria:**

- [ ] Form requires hospital name (non-empty)
- [ ] OPD checkbox defaults to **on**; IPD defaults to **off**
- [ ] Submitting with both checkboxes off shows a clear validation error
- [ ] Successful create returns the new hospital `id` and both flags
- [ ] Only `super_admin` can access create

**Priority:** Must Have

---

### US-2: List all hospitals

**As a** Super Admin  
**I want** to see all hospitals and their OPD/IPD flags  
**So that** I can manage tenants from one place

**Acceptance Criteria:**

- [ ] List shows name, OPD flag, IPD flag, active status, created date
- [ ] Only `super_admin` can call list API / open page
- [ ] List includes hospitals created before and after this feature (with migrated defaults)

**Priority:** Must Have

---

### US-3: Update flags on existing hospital

**As a** Super Admin  
**I want** to change OPD/IPD flags on an existing hospital  
**So that** module access can change when contracts change

**Acceptance Criteria:**

- [ ] PATCH accepts `opd_enabled` and `ipd_enabled`
- [ ] Cannot save both false
- [ ] Only `super_admin` can change flags

**Priority:** Must Have

---

### US-4: Session exposes org module flags

**As a** logged-in user  
**I want** my organization’s OPD/IPD flags available after login  
**So that** future UI can show the right modules (implemented in a later slice)

**Acceptance Criteria:**

- [ ] `GET /api/platform/me` includes `opd_enabled` and `ipd_enabled` for the user’s organization
- [ ] Values match database for that org

**Priority:** Must Have (API only; no sidebar changes in this PRD)

---

### US-5: Existing hospitals keep current behaviour

**As a** product owner  
**I want** migration defaults so live hospitals behave as today  
**So that** rollout does not break OPD-only customers

**Acceptance Criteria:**

- [ ] All existing rows: `opd_enabled=true`, `ipd_enabled=false` after migration
- [ ] Demo org Flow Health can be set `ipd_enabled=true` for dev testing (seed/migration patch)

**Priority:** Must Have

---

## Scope

### In Scope

- Database: add `opd_enabled`, `ipd_enabled` to `organizations` (NOT NULL, defaults, backfill)
- API: `POST /api/platform/organizations` (create)
- API: `GET /api/platform/organizations` (list, super_admin)
- API: extend `GET/PATCH /api/platform/organizations/:id` with flags
- API: extend `GET /api/platform/me` with flags
- UI: Super Admin **Hospitals** page — list + create (+ minimal edit flags)
- Authorization: super_admin only for create/list; flag PATCH super_admin only
- Tests: validation, auth, integration smoke

### Out of Scope

- Sidebar / navigation gating by flag
- IPD API `403` when `ipd_enabled=false`
- `config_profile_id`, Kenya/UAE profile picker
- Auto-provision `p1_config.facility` on IPD enable
- Invite/create first hospital user on create
- Delete/deactivate hospital lifecycle (use existing `active` column only if already supported)
- Multi-step wizard (address, billing, payer setup)
- Relationship to IPD slice 2+ (admissions, events, beds)

---

## Edge Cases

| Case | Expected behaviour |
|------|---------------------|
| Both OPD and IPD unchecked | Reject with validation error (400/422) |
| Non–super-admin calls POST or GET list | 403 Forbidden |
| Duplicate hospital name | Allow (names not unique today unless product decides otherwise) |
| Duplicate NPI if provided | 409 if unique constraint on `organizations.npi` violated |
| Empty hospital name | 400 validation error |
| Super Admin creates IPD-only org | Allowed; OPD nav hiding deferred to later slice |
| Hospital admin opens `/platform/hospitals` | Route/API denied (403 or redirect) |
| Migration on empty DB | Columns added with defaults; no error |

---

## Design References

- Architecture: [his-global-south.md §7](../../../docs/architecture/his-global-south.md)
- Platform Super Admin model: [flowmd-platform-full-architecture.md §1.3](../../../docs/architecture/flowmd-platform-full-architecture.md)
- Existing org setup (edit own org): `src/pages/admin/` — **different** from this feature
- Figma: _None yet — add link under `design/` when available_

---

## Dependencies

| Dependency | Notes |
|------------|--------|
| `his-global-south` on `develop` | Target clone |
| Better Auth + `super_admin` role | Already exists |
| `organizations` table + platform org module | Extend, do not replace |

---

## Open Questions

| # | Question | Default if unanswered |
|---|----------|------------------------|
| 1 | Required fields beyond name on create? (NPI, email, address) | Name only required; optional fields same as PATCH today |
| 2 | Should hospital **name** be unique platform-wide? | No — match current DB (no unique on name) |
| 3 | Deactivate hospital in v1 UI? | Out of scope unless `active` toggle is trivial |

---

## Approval (Gate G1)

- [ ] Product — acceptance criteria match intent
- [ ] Tech — no architecture/file decisions in this PRD (those go in technical design)
- [ ] **Approved by:** ___
- [ ] **Date:** YYYY-MM-DD

**Agent rule:** Do not proceed to technical design until all boxes are checked.

---

## Next step after G1 approval

Say in Cursor on the hub:

```text
PRD approved for his-global-south super-admin-hospitals. Proceed to technical design.
```
