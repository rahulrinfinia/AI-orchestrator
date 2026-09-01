# Security conventions (healthcare-aware)

Apply when building apps under `backend/` that handle PHI or sensitive data.

For PHI and healthcare apps, see **[hipaa.md](hipaa.md)** (full framework).

## Baselines

- No secrets in git — use env vars and secret managers
- Auth on all non-public routes (Better Auth)
- Audit log for read/write of sensitive records where required
- Minimum necessary data in API responses
- HTTPS only in production; secure cookies

## Agent checklist (pre-review)

- [ ] No PHI in logs or error messages
- [ ] Input validated with Zod at API boundary
- [ ] SQL parameterized (no string concatenation)
- [ ] Role/permission checks on mutations

For formal decisions, use **architecture-decision** + ADR.
