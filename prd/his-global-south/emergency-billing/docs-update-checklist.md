# Emergency billing — documentation update checklist

Use this checklist **during and after** implementation so hub specs stay aligned with code.  
**Rule:** Existing OPD / RCM / Catalog Browser behaviour must remain unchanged unless this feature explicitly adds emergency-only paths.

---

## Before first code change (G1 + G2 approved)

- [ ] [plan.md](./plan.md) — product sign-off on Option C+
- [ ] [prd.md](./prd.md) — G1 approval block filled
- [ ] [technical-design.md](./technical-design.md) — G2 approval block filled
- [ ] Target slice spec (EB-N) — **Approval** section filled

---

## Hub PRD / spec updates (same PR as or immediately after implement)

### This feature folder (`prd/his-global-south/emergency-billing/`)

| File | When to update |
|------|----------------|
| [slices/status.yaml](./slices/status.yaml) | Slice started / done / blocked |
| [slices/slice-N.md](./slices/slice-1.md) | Mark acceptance boxes when verified |
| [plan.md](./plan.md) | Status line if gates cleared |
| [prd.md](./prd.md) | G1 approval date; any scope change |
| [technical-design.md](./technical-design.md) | AD changes; G2 approval |

### Cross-feature PRDs (link only — do not rewrite clinical scope)

| File | Update |
|------|--------|
| [../emergency-triage/prd.md](../emergency-triage/prd.md) | §14 Billing row + AC-14 footnote → points to `emergency-billing` |
| [../emergency-triage/slices/README.md](../emergency-triage/slices/README.md) | AC-14 row → superseded for ED billing by EB feature |
| [../emergency-triage-sats-enhancement/prd.md](../emergency-triage-sats-enhancement/prd.md) | §11 out of scope — add cross-link: reassessment billing = EB v2 |

### Optional hub docs (if behaviour visible to operators)

| File | Update if… |
|------|------------|
| `docs/services/his-global-south.md` | RCM events list includes `triage.completed` |
| `docs/journeys/` (ED journey) | Billing step documented for ED visit receipt |

---

## Implementation report (per slice)

After each EB slice in `projects/his-global-south/`, write:

`reports/features/his-global-south/emergency-billing/eb-N-report.md`

Include:

- What changed (files)
- Regression proof (OPD sign + lab order still same)
- Catalog codes used
- Manual smoke steps

---

## Regression docs (must pass before slice “done”)

Document in slice report that these **existing** flows were **not** changed:

| Existing flow | Verify unchanged |
|---------------|------------------|
| OPD check-in → intake → consult → sign | `CONSULT-NEW` line only on OPD encounter |
| OPD lab order | `order.created` lines unchanged |
| OPD prescription | `prescription.created` unchanged |
| Catalog Browser enrol / pricing UI | No regression; only new optional service codes in seed |
| `/billing` Charge Capture | OPD visits still render/collect |
| Manual Add Charge | Still works |
| Emergency triage clinical save | Still succeeds if RCM fails |
| IPD bed assign | No new receipt lines |

---

## Catalog Browser (admin-facing)

Document in EB-5 report / seed README:

| Code | Purpose | Enrolled via |
|------|---------|--------------|
| `TRIAGE-ED` | Nurse triage fee | Services tab + STANDARD price |
| `CONSULT-EMERGENCY` | ED doctor consult | Services tab |
| `BED-ED-STANDARD` | ED bay | Services tab |
| `BED-ED-RESUS` | Resuscitation bay | Services tab |
| `BED-ED-OBS` | Observation (optional) | Services tab |

**Do not** replace or rename existing `CONSULT-NEW` / lab codes.

---

## Git / deploy note

Hub doc updates live in **ai-orchestrator-workspace**. App code lives in **projects/his-global-south/**. Update both when slice completes; no git write unless user asks.
