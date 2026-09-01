# EB-2 — Triage fee (`TRIAGE-ED`)

| Field | Value |
|-------|--------|
| **Feature** | `emergency-billing` |
| **Depends on** | EB-1 |
| **Goal** | First triage complete → one `TRIAGE-ED` receipt line |

## Scope

- RCM handler on `triage.completed`
- `getOrCreateReceipt` for visit
- Idempotency: `source_type = emergency_triage`, `source_id = encounterId`
- Price resolve via org catalog; skip + log if missing
- Integration test: triage save → receipt item exists

## Acceptance

- [ ] AC-EB-1, AC-EB-5, AC-EB-6 (partial — triage line only)
- [ ] No duplicate on replay/idempotent handler invoke
