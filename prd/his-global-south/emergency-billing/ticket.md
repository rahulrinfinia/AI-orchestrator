# Ticket: Emergency billing (Option C+)

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `emergency-billing` |
| **Type** | Feature |
| **Priority** | High (revenue gap on ED path) |
| **Plan (start here)** | [plan.md](./plan.md) |
| **PRD** | [prd.md](./prd.md) v2.0 |

---

## Summary

Auto-post **triage fee**, **ED consultation fee**, and **ED bed/care-area fee** to the emergency **visit receipt** via RCM event handlers. Lab/Rx unchanged. IPD ward bed out of scope.

---

## Why now

- Emergency clinical path exists; billing explicitly deferred in emergency-triage AC-14
- OPD consult auto-fee skips `encounter_type = emergency`
- Cashiers lack reliable auto lines for ED; manual Add Charge is fragile

---

## Deliverables

1. [plan.md](./plan.md) — G1 approval
2. [prd.md](./prd.md) — G1 approval
3. [technical-design.md](./technical-design.md) — G2 approval
4. [docs-update-checklist.md](./docs-update-checklist.md) — hub PRD updates per slice
5. Five vertical slices EB-1…EB-5 ([slices/README.md](./slices/README.md))
6. Implement in `projects/his-global-south/` after slice approval

## Implementation rule

**Additive only** — preserve existing OPD RCM, Catalog Browser, and `/billing` behaviour. Update linked hub PRDs when each slice completes.

---

## Acceptance (release)

- AC-EB-1 … AC-EB-7 from PRD
- OPD billing regression green
- Pilot org can demo full ED visit → receipt with 3+ line types

---

## Links

- Supersedes: emergency-triage AC-14 (emergency only)
- Related: `emergency-triage`, `emergency-triage-dynamic-disposition`, IPD ward receipt (future)
