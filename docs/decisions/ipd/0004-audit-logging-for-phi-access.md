# 0004. Audit logging for PHI access

Date: 2026-08-16
Status: Accepted

## Context

HIPAA requires accountability for PHI access. IPD must record who accessed or changed patient-related data without storing PHI in log messages.

## Decision

Implement an **append-only audit log** for PHI events.

- Table: `audit_events` (or dedicated schema)
- Events: `phi.read`, `phi.create`, `phi.update`, `phi.delete`, plus `auth.*`
- Fields: `actor_id`, `resource_type`, `resource_id`, `action`, `metadata` (JSON, no PHI), `ip_address`, `created_at`
- Emit from service layer when PHI resources are read or mutated
- Audit writes in same transaction as business mutation when possible

## Consequences

### Positive

- Supports compliance investigations and access reviews
- Clear pattern for agents: "add audit event in service.ts"

### Negative

- Extra write on every PHI operation
- Storage growth — retention policy required

### Neutral

- Implement alongside first PHI domain slice (admissions/patients)
- See `docs/conventions/hipaa.md` for field rules
