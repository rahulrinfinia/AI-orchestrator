# PRD: IAM — Resource Group RBAC

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature key** | `iam-resource-groups` |
| **Product** | flowMD |
| **Version** | **1.0** |
| **Date** | 2026-09-06 |
| **Status** | Draft — **Gate G1 pending** |
| **Related** | [technical-design.md](./technical-design.md) · [slices/](./slices/README.md) |
| **Replaces (conceptually)** | Per-user `module_permissions` as primary model; `staticRoleAccess.ts` as nav source |
| **Preserves** | Better Auth sessions; `app_role` enum for clinical roster / attending pickers; platform_admin cross-hospital ops |

---

## 1. Summary

Introduce an **IAM-style access model** centred on **Resource Groups** (e.g. OPD Doctor, Lab Desk, Pathologist, Biller). Hospital **super_admin** defines group permissions once; **adds users to groups** — they inherit module CRUD, clinical capabilities, and navigation. **Backend enforces** effective access on every protected route; frontend reads the same resolved policy from the API.

**Not** one-by-one user permission toggles as the primary workflow.

---

## 2. Background & problem

| Symptom | Root cause |
|---------|------------|
| Admin assigns roles but nav/API behaviour unchanged | `staticRoleAccess.ts` hardcoded; backend mostly `withOrgAuth` only |
| Per-user module matrix does not scale | 50 staff × 11 modules = hundreds of toggles |
| Role change does not update permissions for existing users | No role→permission template; manual matrix |
| Lab approve / prescribe / claims access inconsistent | Rules in 3 places: `require-roles.ts`, static frontend, optional user rows |
| `module-permissions` CRUD unprotected | Any org member can hit admin APIs |

---

## 3. Goals & success metrics

| Goal | Metric | Target |
|------|--------|--------|
| Admin manages access via groups | Create/edit group + add member without per-user matrix | 100% primary path |
| Group change applies to all members | Update group permissions → members see change on next request | ≤120s (cache TTL) |
| Backend enforces effective access | Wrong group → 403 on protected routes | Integration tests per slice |
| Frontend matches backend | Nav/landing from `/me` resolved policy | No `STATIC_ROLE_ACCESS` in prod path |
| Migrate existing users | Current `user_roles` → group membership | Zero manual re-assign on deploy |
| Super_admin bypass | Platform/hospital super_admin full access | Unchanged |

---

## 4. User personas

- **Hospital super_admin** — creates/edits resource groups; adds/removes members; does not toggle 11 modules × N users individually.
- **Platform admin (`platform_admin`)** — hospital lifecycle only; not in hospital resource groups.
- **Clinical / ops staff** — inherit access from group membership only (OPD Doctor, Lab Desk, etc.).
- **Engineering** — single module (`iam`) with Hemant-style folder layout for future IAM expansion.

---

## 5. User workflows

### Workflow 1: Seed system groups on hospital create

**Trigger:** New organization created (platform admin or hospital setup).  
**Persona:** System

1. Insert default **system resource groups** for org (OPD Doctor, OPD Nurse, ED Doctor, ED Nurse, Lab Desk, Pathologist, Radiology Desk, Radiologist, Biller, Receptionist, Org Admin).
2. Each group preloaded with module permissions, capabilities, and UI access matching today's static RBAC.

### Workflow 2: Admin adds doctor to OPD Doctor group

**Trigger:** New OPD doctor onboarded.  
**Persona:** Hospital super_admin

1. Open **Org Setup → Resource Groups**.
2. Select **OPD Doctor** group.
3. Search/add user (by name or user id).
4. User immediately gets group's encounters/prescriptions access, prescribe capability, and OPD nav — no per-module toggles.

### Workflow 3: Admin updates group permissions

**Trigger:** Hospital policy change (e.g. nurses may read claims).  
**Persona:** Hospital super_admin

1. Edit **OPD Nurse** group → enable Claims **Read**.
2. All members of OPD Nurse receive updated effective permissions without individual updates.

### Workflow 4: User in multiple groups

**Trigger:** Part-time pathologist who also runs lab desk.  
**Persona:** Hospital super_admin

1. Add user to **Lab Desk** and **Pathologist** groups.
2. Effective access = **union** of both groups (capabilities and module CRUD merged with OR logic).

### Workflow 5: API request denied

**Trigger:** Biller attempts `POST /api/.../encounters` without group permission.  
**Persona:** System

1. Middleware resolves effective permissions from group memberships.
2. Returns **403** `FORBIDDEN_PERMISSION` — not UI-only hiding.

---

## 6. User stories

### US-1: System resource groups per org

**As a** hospital, **I want** default resource groups created automatically **so that** admin can assign staff immediately.

**Acceptance Criteria:**

- [ ] System groups seeded on org create and backfilled for existing orgs
- [ ] Groups include module permissions, capabilities, and ui_access equivalent to current static RBAC
- [ ] Groups are org-scoped; slug unique per org

**Priority:** Must Have

### US-2: Add/remove group members

**As a** super_admin, **I want** to add a user to a resource group **so that** they inherit group access without individual permission rows.

**Acceptance Criteria:**

- [ ] Add member API + UI
- [ ] Remove member API + UI
- [ ] User effective access updates after cache invalidation
- [ ] super_admin only for member mutations

**Priority:** Must Have

### US-3: Edit group permissions and capabilities

**As a** super_admin, **I want** to edit a group's module CRUD and clinical capabilities **so that** all members get the change at once.

**Acceptance Criteria:**

- [ ] Edit module matrix at group level (not user level)
- [ ] Edit capabilities: prescribe, approve_lab, approve_radiology, ed_triage_write, etc.
- [ ] Changes persist; members inherit on next resolve

**Priority:** Must Have

### US-4: Effective access on login

**As a** staff user, **I want** my nav and API access to reflect my groups **so that** I only see and do what my desk allows.

**Acceptance Criteria:**

- [ ] `GET /api/iam/me/access` (or extended `/api/platform/me`) returns merged permissions + ui_access
- [ ] Frontend sidebar and landing use API response
- [ ] super_admin bypass unchanged

**Priority:** Must Have

### US-5: Backend enforcement

**As a** security requirement, **I want** protected routes to check effective group permissions **so that** UI hiding is not the only control.

**Acceptance Criteria:**

- [ ] `requirePermission(module, action)` on P0 routes (encounters write, claims, billing, module-permissions admin)
- [ ] `requireCapability(name)` for clinical actions (prescribe, approve_lab, approve_radiology)
- [ ] Integration tests: member of wrong group → 403

**Priority:** Must Have

### US-6: Migrate from user_roles

**As an** existing deployment, **I want** current role assignments mapped to groups **so that** no regression on go-live.

**Acceptance Criteria:**

- [ ] Migration script maps each `user_roles.role` to corresponding system group membership
- [ ] Users with multiple roles → multiple group memberships
- [ ] `user_roles` retained for roster/display; authorization uses groups

**Priority:** Must Have

### US-7: Custom org resource groups (v1.1)

**As a** super_admin, **I want** to create a custom group (e.g. "Senior Lab Tech") **so that** I am not limited to system templates.

**Acceptance Criteria:**

- [ ] Create custom group with name + permissions clone from template
- [ ] `is_system = false` groups editable/deletable

**Priority:** Should Have (slice 6)

### US-8: Per-user override (edge cases)

**As a** super_admin, **I want** optional per-user permission overrides **so that** one-off exceptions do not require a new group.

**Acceptance Criteria:**

- [ ] Override table or flags; merged after group union
- [ ] UI clearly labelled "Override" — not default path

**Priority:** Could Have (post v1)

---

## 7. Scope

### In scope

- New `iam` backend module (Hemant pattern: routes/controller/schema/service sub-features)
- New `src/modules/iam/` frontend barrel
- Tables: `resource_groups`, `resource_group_permissions`, `resource_group_capabilities`, `resource_group_ui_access`, `resource_group_members`
- System group seeds + migration from `user_roles`
- Group admin UI (replace primary workflow in Org Setup)
- Effective access resolution + cache invalidation
- Backend middleware enforcement (phased by slice)
- Deprecate `staticRoleAccess.ts` as runtime source (keep until slice 5)

### Out of scope

- SSO / OAuth / MFA (future IAM phase)
- Multi-org membership / org switcher
- Custom roles replacing `app_role` enum
- Patient portal separate auth
- Fine-grained row-level ACLs (per-patient, per-encounter)
- SMS/email staff invite (separate feature)
- Removing `user_roles` table entirely (retained for roster)

---

## 8. Edge cases

| Case | Behaviour |
|------|-----------|
| User in zero groups | Read-only minimal or 403 on clinical routes; admin prompted to assign |
| User removed from all groups mid-session | Next API call 403; frontend redirect to access-denied |
| super_admin | Full bypass; not required to be in any group |
| platform_admin on suspended hospital | Existing bypass unchanged |
| Last super_admin removed from Org Admin group | Block demotion if would leave org without super_admin |
| Group deleted with members | Block delete for system groups; custom groups require empty members or confirm reassign |

---

## 9. Design references

- Current admin UI: `src/pages/admin/components/UsersRolesSection.tsx` (reference only — group UI replaces primary flow)
- Static RBAC reference: `src/config/staticRoleAccess.ts` (seed templates for system groups)
- Module layout reference: `backend/src/modules/mch/`, `backend/src/modules/ipd/`

---

## 10. Open questions

| # | Question | Proposal |
|---|----------|----------|
| OQ-1 | Keep per-user matrix visible? | Hide by default; "Advanced override" accordion in v1.1 |
| OQ-2 | API base path | `/api/iam/*` new; proxy legacy `/api/platform/permissions` during transition |
| OQ-3 | Capability list v1 | prescribe, approve_lab, approve_radiology, ed_triage_read, ed_triage_write, clinical_orders |

---

<!-- Gate G1: paste docs/templates/approval.md when product approves -->
