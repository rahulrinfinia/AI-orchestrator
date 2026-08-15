---
name: architecture
description: Updates hub-level docs/architecture.md and project-specific architecture notes from current code and ADRs.
---

# Architecture Documentation

## Hub

Update `docs/architecture.md`:

- Hub vs clone responsibilities
- How specs/reports flow
- CI/deploy model (path-based)

## Project

Optional: `docs/architecture/<project>.md` for app-specific:

- Module boundaries inside monolith
- Data flow diagram (mermaid)
- Auth model
- Deployment units (frontend static, backend container)

Read existing ADRs in `docs/decisions/` before editing.
