# 0001. PostgreSQL as primary data store

Date: 2026-08-16
Status: Accepted

## Context

IPD requires relational data (patients, admissions, beds, staff assignments) with ACID transactions and audit-friendly storage. We need one primary database for the modular monolith.

## Decision

Use **PostgreSQL 16** as the sole application database.

- Hand-written SQL migrations in `backend/src/db/migrations/`
- Connection via `pg` pool in Fastify plugin
- UUID primary keys, TIMESTAMPTZ for all timestamps
- No ORM — SQL in `service.ts` only

## Consequences

### Positive

- Strong consistency for clinical workflows
- Mature tooling (Testcontainers, backups, replication)
- JSONB available when semi-structured data needed

### Negative

- Manual SQL and migration discipline required
- Team must know Postgres indexing and query patterns

### Neutral

- Local dev via `docker-compose.dev.yml`
- Managed Postgres (RDS, Cloud SQL, etc.) in production — provider TBD per deployment ADR
