# 0001. PostgreSQL as primary data store

Date: 2026-08-16  
Updated: 2026-08-19  
Status: Accepted  
Project: **his-global-south**

## Decision

Use **PostgreSQL** as the sole application database (shared with OPD).

- IPD tables: `ipd_{module}_{entity}` in `public` — [ADR 0009](0009-ipd-naming-and-versioning.md)
- Data access: Drizzle pgschema — [ADR 0007](0007-drizzle-pgschema-data-access.md)
- OPD tables unchanged

## References

- [his-global-south.md](../../architecture/his-global-south.md)
