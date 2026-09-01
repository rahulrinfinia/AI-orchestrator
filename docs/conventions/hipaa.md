# HIPAA-aware development conventions

Apply to all apps under `projects/` that handle **Protected Health Information (PHI)** — including IPD.

This document defines **development standards**. Legal/compliance sign-off (BAA, policies) remains an organizational responsibility.

## PHI examples in IPD context

- Patient name, MRN, admission details
- Diagnosis, treatment, medications
- Dates of birth, addresses, phone numbers linked to care
- Insurance / billing identifiers tied to a person

## Minimum necessary

- API responses return only fields required for the current screen/workflow
- List endpoints: avoid loading full clinical notes when showing a bed board
- Log and audit: record *that* access occurred, not full record contents

## Technical safeguards (development)

### Encryption

| Layer | Requirement |
|-------|-------------|
| In transit | HTTPS/TLS 1.2+ in all non-local environments |
| At rest | Postgres encryption at rest (cloud provider or disk encryption) |
| Secrets | Env vars / secret manager — never in git |

### Authentication and access

- JWT bearer auth; short-lived access token in memory (not localStorage); see ADR 0002
- Session timeout: configure per org policy (default target: 15–30 min idle)
- Role-based access control (RBAC) on every PHI endpoint
- Principle of least privilege for staff roles

### Audit logging

Required for PHI access and mutations. See ADR `docs/decisions/his-global-south/0004-audit-logging-for-phi-access.md`.

Log events:

| Event | Fields (no PHI in message) |
|-------|----------------------------|
| `phi.read` | actor_id, resource_type, resource_id, timestamp, ip |
| `phi.create` | actor_id, resource_type, resource_id, timestamp |
| `phi.update` | actor_id, resource_type, resource_id, changed_fields[], timestamp |
| `phi.delete` | actor_id, resource_type, resource_id, timestamp |
| `auth.login` / `auth.logout` | user_id, timestamp, success |

Store audit logs in append-only table or dedicated audit service.

### Application rules

- **Never** log PHI to stdout, files, Sentry, or APM
- **Never** put PHI in URL query strings
- **Never** cache PHI in localStorage/sessionStorage
- Scrub error reports before sending to Sentry
- Mask PHI in non-production environments (synthetic data preferred)

## Input validation

- Zod validation on every API input
- Max lengths on text fields that may contain clinical notes
- Reject unexpected fields (strict schemas where feasible)

## Data retention

- Document retention per table in migration COMMENT or ADR
- Soft delete + retention job vs hard delete — decide per domain in ADR
- Backup strategy documented (see Postgres ADR)

## Breach-ready practices

- Ability to identify who accessed a record (audit log)
- Ability to revoke sessions (force logout)
- No shared user accounts

## Agent / pre-review checklist

Before merging PHI-touching code:

- [ ] Auth + authorization on new routes
- [ ] No PHI in logs, errors, or client storage
- [ ] Audit event emitted on read/write of PHI resources
- [ ] API returns minimum necessary fields
- [ ] Tests cover forbidden access (403) cases
- [ ] Migration has COMMENT ON for new PHI tables

## Related docs

- `docs/conventions/security.md` — general security baseline
- `docs/conventions/api-design.md` — error envelope, IDOR prevention
- `docs/decisions/his-global-south/0004-audit-logging-for-phi-access.md`
