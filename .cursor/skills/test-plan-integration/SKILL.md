---
name: test-plan-integration
description: Creates integration test plan for a modular monolith using real Postgres. Output specs/tests/integration/. Use for API + DB flows.
---

# Integration Test Plan

Output: `specs/tests/integration/<project>.md`

## Scope

Test within `projects/<project>/`:

- API routes → service → Postgres
- Migrations apply cleanly on test DB
- Auth/session on protected routes

## Plan includes

- Critical flows from slice specs or `prd/`
- Testcontainers or docker-compose test DB setup
- Seed data approach
- Scenarios with expected HTTP status + body shape (snake_case on wire)
- Commands to run integration vitest config

Implement with **test-implement**.
