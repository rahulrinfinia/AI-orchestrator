# EB-4 — ED bed fee (`BED-ED-*`)

| Field | Value |
|-------|--------|
| **Feature** | `emergency-billing` |
| **Depends on** | EB-2 |
| **Goal** | Triage destination → mapped bed/care-area receipt line |

## Scope

- Same `triage.completed` handler (or shared helper)
- Map **Appendix A** `triage_disposition` → `BED-ED-*` per [prd.md Appendix A](../prd.md#appendix-a--triage-disposition--bed-bill-code-v1)
- Idempotency: `source_type = emergency_triage_bed`, `source_id = encounterId`
- Unmapped disposition → skip bed line, triage fee still applies
- Unit tests for map; integration test with resuscitation vs standard destination

## Acceptance

- [ ] AC-EB-3, AC-EB-7 (IPD assign does not fire this handler)
