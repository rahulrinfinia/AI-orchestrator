# EB-3 — ED consult fee (`CONSULT-EMERGENCY`)

| Field | Value |
|-------|--------|
| **Feature** | `emergency-billing` |
| **Depends on** | EB-1 |
| **Goal** | Emergency encounter sign → `CONSULT-EMERGENCY` line |

## Scope

- Extend `encounter.signed` RCM handler for `encounter_type = emergency`
- **Do not modify** existing OPD branch (`encounter_type = opd` → `resolveConsultationFee`)
- Idempotency: existing `source_type = encounter`, `source_id = encounterId`
- OPD branch unchanged — regression tests for `encounter_type = opd`
- Integration test: emergency sign → consult line; OPD sign → CONSULT-{tier} only

## Acceptance

- [ ] AC-EB-2, AC-EB-4, AC-EB-5
