---
name: feature
description: Creates an implementation plan for a small scoped feature in specs/features/ without full PRD pipeline. Use when work is well-defined and does not need full PRD + technical design + decompose.
---

# Feature Planning (small scope)

Use **feature-orchestrator** for large work. Use this for small, clear features.

Output: `specs/features/<project>/<feature-name>.md`

## When to use

- Single screen or endpoint
- Scope fits one PR
- No cross-cutting architecture decisions

## When NOT to use

- Multi-slice epic → use **feature-orchestrator**
- New architecture → need technical design first

## Plan includes

- Description, user story, problem/solution
- Files under `projects/<project>/`
- Phases: foundation → implement → integration
- Testing + validation commands
- Acceptance criteria
- Approval block

Implement with **implement-slice** after approval.
