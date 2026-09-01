# EB-1 — Event plumbing (`triage.completed`)

| Field | Value |
|-------|--------|
| **Feature** | `emergency-billing` |
| **Depends on** | Emergency triage save (ET-3) |
| **Goal** | Emit typed `triage.completed` after first triage save commit |

## Scope

- Add event to orchestration constants + union type
- Emit from emergency triage save service **only when** `triage_status` transitions to `complete` (first time)
- Do **not** emit on reassessment (future API) in v1
- Register no-op or logging RCM subscriber to prove wiring
- Unit test: emit once; no emit on validation failure

## Out of scope

- Receipt lines (EB-2/EB-4)

## Acceptance

- [ ] Event payload includes encounterId, visitId, patientId, organizationId, triageDisposition, triagedBy
- [ ] Triage save API behaviour unchanged on success/failure
- [ ] Backend build + tests pass
