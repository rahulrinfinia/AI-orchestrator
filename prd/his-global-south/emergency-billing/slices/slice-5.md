# EB-5 — Pilot catalog seed + smoke

| Field | Value |
|-------|--------|
| **Feature** | `emergency-billing` |
| **Depends on** | EB-2, EB-3, EB-4 |
| **Goal** | Demo hospitals can verify full ED billing path |

## Scope

- Seed `items_master` / org prices: `TRIAGE-ED`, `CONSULT-EMERGENCY`, `BED-ED-STANDARD`, `BED-ED-RESUS`, `BED-ED-OBS`
- Document disposition → bed code mapping for demo ED units
- End-to-end integration or manual smoke checklist
- Hub note: emergency-triage AC-14 superseded for emergency encounters
- Complete [docs-update-checklist.md](../docs-update-checklist.md)

## Acceptance

- [ ] AC-EB-6 full path: triage + sign → 3 auto line types on visit receipt
- [ ] QA org can run without manual catalog setup
