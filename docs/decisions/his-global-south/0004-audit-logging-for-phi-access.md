# 0004. Audit logging for PHI access

Date: 2026-08-16  
Status: Accepted  
Project: **his-global-south**

## Decision

Append-only audit log for PHI events (IPD-AUD-001). No PHI in log message bodies.

Emit from IPD service layer on material reads/mutations. See `docs/conventions/hipaa.md`.
