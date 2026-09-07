# IAM-4 — Backend enforcement (P0 routes)

| Field | Value |
|-------|--------|
| **Feature** | `iam-resource-groups` |
| **Slice** | 4 |
| **Depends on** | IAM-2 |
| **Technical design** | [../technical-design.md](../technical-design.md) §6, AD-1 |
| **Goal** | Protected routes return 403 when effective group access denies action |

---

## Purpose

Ship `requirePermission` and `requireCapability` middleware using `req.auth.effectiveAccess`. Apply to highest-risk routes first.

---

## User stories addressed

| Story | Coverage |
|-------|----------|
| US-5 Backend enforcement | Partial — P0 route list |

---

## Scope

### Backend

- `authorization/authorization.middleware.ts`
- `authorization/capability-sets.ts` — bridge legacy `LAB_APPROVE_ROLES` checks to `approve_lab` capability during transition
- Wire `attachEffectiveAccess` into `withOrgAndRoles` chain (or new `withOrgAuthAndAccess`)

### P0 routes (minimum)

| Area | Check |
|------|-------|
| Encounters create/update | `requirePermission('encounters', 'create\|update')` |
| Claims create/submit | `requirePermission('claims', 'create')` |
| Prescriptions write | `requirePermission('prescriptions', 'create')` + `requireCapability('prescribe')` |
| Orders approval approve/reject | `requireCapability('approve_lab' \| 'approve_radiology')` |
| IAM group/member mutations | super_admin (already) |
| Plan builder writes | super_admin (unchanged) |

### Transition

- Orders/clinical routes still using `requireAnyRole(CLINICAL_ROLES)` — add capability check **in addition** OR replace where group capabilities cover same surface (document per route in slice spec)

### Tests

- Integration: biller not in clinical group → POST encounter → 403
- Integration: pathologist in group → approve lab → 200
- Integration: doctor in opd_doctor → prescribe → 200

---

## Out of scope

- Full route sweep (IAM-6)
- Frontend changes

---

## Acceptance criteria

- [ ] `FORBIDDEN_PERMISSION` error envelope on deny
- [ ] P0 routes listed above have integration tests
- [ ] super_admin bypass on all P0 routes
- [ ] No regression on demo seed accounts for allowed actions

---

## Approval

- [ ] Product — US-5 P0 list agreed
- [ ] Tech — middleware chain order documented
- [ ] **Approved by:** ___
- [ ] **Date:** YYYY-MM-DD
