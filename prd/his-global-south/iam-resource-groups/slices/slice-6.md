# IAM-6 — Custom groups + route rollout

| Field | Value |
|-------|--------|
| **Feature** | `iam-resource-groups` |
| **Slice** | 6 |
| **Depends on** | IAM-4, IAM-5 |
| **Technical design** | [../technical-design.md](../technical-design.md) §4, §6 |
| **Goal** | Hospitals create custom groups; remaining API routes enforce group permissions |

---

## Purpose

Complete RBAC coverage: custom resource groups (US-7) and extend `requirePermission` to all org-scoped mutation routes not covered in IAM-4.

---

## User stories addressed

| Story | Coverage |
|-------|----------|
| US-7 Custom org resource groups | Full |
| US-5 Backend enforcement | Full — broad rollout |

---

## Scope

### Backend — custom groups

- `POST /api/iam/groups` — create with optional `clone_from_slug`
- `DELETE /api/iam/groups/:id` — custom only; block if system or has members without confirm
- Validation: slug unique per org

### Backend — route rollout

Apply `requirePermission` / `requireCapability` to remaining modules:

- frontdesk (visits, scheduling)
- RCM (eligibility, preauth, billing read/write split)
- IPD admissions
- clinical read paths where appropriate
- screening (map phases to capabilities or module checks)
- MCH (clinical_orders capability)

Remove redundant `requireAnyRole` Sets where fully replaced by capabilities (keep until tests green).

### Frontend

- "Create group" flow on resource groups list
- Clone from system template dropdown

### Tests

- Create custom group → add member → effective access matches clone
- OpenAPI sweep / route matrix test increment
- Cannot delete system group

---

## Out of scope

- Per-user overrides (US-8)
- SSO / MFA

---

## Acceptance criteria

- [ ] Custom group CRUD works for super_admin
- [ ] Route matrix document updated — all mutation routes gated
- [ ] Integration suite: role-group matrix spot-check 20 endpoints
- [ ] `require-roles.ts` Sets documented as deprecated or thin wrappers

---

## Approval

- [ ] Product — US-7; enforcement complete
- [ ] Tech — rollout list signed off
- [ ] **Approved by:** ___
- [ ] **Date:** YYYY-MM-DD
