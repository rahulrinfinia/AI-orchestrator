# Emergency billing — slices

| Field | Value |
|-------|--------|
| **Feature** | `emergency-billing` |
| **PRD** | [../prd.md](../prd.md) |
| **Technical design** | [../technical-design.md](../technical-design.md) |
| **Status** | Planned — no slice approved for implement yet |

---

## Vertical slices (tracer order)

```text
EB-1 → EB-2 → EB-3 → EB-4 → EB-5
         ↘ EB-3 can parallel after EB-1 if handlers split
```

| Slice | Goal | Tracer |
|-------|------|--------|
| **EB-1** | Event plumbing + constants | Emit `triage.completed` from triage save (no RCM lines yet); event typed in orchestration |
| **EB-2** | Triage fee | First triage complete → `TRIAGE-ED` receipt line; idempotent |
| **EB-3** | ED consult fee | Emergency sign → `CONSULT-EMERGENCY`; OPD regression |
| **EB-4** | ED bed fee | Triage destination map → `BED-ED-*` line; idempotent |
| **EB-5** | Pilot readiness | Demo catalog seed, integration test, [docs-update-checklist](../docs-update-checklist.md) |

---

## Preserve existing (all slices)

Every slice must confirm:

- **OPD billing regression green** (consult + lab smoke)
- No changes to `order.created` / `prescription.created` unless explicitly scoped (none planned)
- Hub [docs-update-checklist.md](../docs-update-checklist.md) ticked for that slice

---

## Dependencies

| Slice | Requires |
|-------|----------|
| EB-1 | Emergency triage save API (ET-3+) implemented |
| EB-2 | EB-1 |
| EB-3 | EB-1 (shared RCM module); encounter sign exists |
| EB-4 | EB-2 (same `triage.completed` handler) |
| EB-5 | EB-2, EB-3, EB-4 |

**Not required:** IPD ward receipt, SATS reassessment, dynamic disposition UI (mapping can use static codes until unit UUIDs stable).

---

## Out of slice scope

- Billing UI in triage form
- IPD M8 / ward daily bed charges
- Reassessment re-billing (v2)
- Admin UI for destination → price mapping (v2)

---

## Status tracking

Update [status.yaml](./status.yaml) when slices are approved and implemented.
