---
name: bug
description: Creates a focused bug fix plan in specs/bugs/ before coding. Use when fixing a bug, production issue, or user describes broken behavior. Minimal scope — root cause and regression test.
---

# Bug Planning

Output: `specs/bugs/<short-name>.md`

## Rules

- Minimal fix — no refactors unless required
- Read `docs/conventions/modular-monolith-fastify-react.md`
- Work will happen in `projects/<project>/` after plan approved
- Include reproduction steps and root cause

## Process

1. Read `docs/architecture.md`, `docs/services/<project>.md` if exists
2. Explore `projects/<project>/` — find root cause in code
3. Check `docs/changelog/` for recent related changes
4. Write plan with: symptoms, expected vs actual, root cause, files to change, test to prevent regression, validation commands
5. Include `docs/templates/approval.md` block (empty until user approves)

## Plan sections

- Bug description
- Reproduction steps
- Root cause analysis
- Relevant files (under `projects/<project>/`)
- Fix steps (surgical)
- Testing strategy (regression test required)
- Validation commands
- Approval block

Implement with **implement-slice** or **implement-bug** after approval. Report: `reports/bugs/`.
