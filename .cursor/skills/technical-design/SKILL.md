---
name: technical-design
description: Creates technical design doc in specs/features/<project>/<feature>/technical-design.md. Use after PRD before decompose.
---

# Technical Design

Output: `specs/features/<project>/<feature>/technical-design.md`

## Input

- `prd/<feature>.md`
- `docs/services/<project>.md`, conventions, ADRs

## Include

- Approach summary
- Data model changes (Postgres)
- API endpoints (method, path, auth)
- Frontend routes/components
- Migration strategy
- Risks and mitigations
- Testing approach
- Slice suggestions (high level)

Approval block required before **decompose-slices**.

Code changes only in `projects/<project>/` after implement phase.
