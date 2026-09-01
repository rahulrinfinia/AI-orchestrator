# Slices — platform-admin-follow-ons

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `platform-admin-follow-ons` |
| **Plan** | [../plan.md](../plan.md) |
| **Spec** | [../../../../specs/features/his-global-south/platform-admin-follow-ons.md](../../../../specs/features/his-global-south/platform-admin-follow-ons.md) |
| **G3 status** | Wave A + PAF-7 implemented locally — not committed. PAF-6 parked (separate epic). |

## Dependency graph

```text
PAF-1 … PAF-4 (Wave A, local)
  └── PAF-7 (support view)     plan: specs/.../platform-admin-follow-ons-paf-7-support.md

PAF-6  ── parked ──  own epic (not this work)
PAF-5  ── later ──  own branch (IPD/OPD gating)
```

## Out of scope (all slices)

- Disable public Register
- Grant `platform_admin` from hospital UI
- PHI in platform APIs
- Retarget SQL `is_platform_admin()`
