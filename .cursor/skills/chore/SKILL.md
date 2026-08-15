---
name: chore
description: Creates a maintenance or refactor plan in specs/chores/ with zero behavior change unless stated. Use for dependency upgrades, convention alignment, tech debt cleanup.
---

# Chore Planning

Output: `specs/chores/<short-name>.md`

## Rules

- State explicitly: **no behavior change** unless user allows
- Same validation as before (lint, tsc, tests green)
- Work in `projects/<project>/`

## Process

1. Read conventions + affected code in `projects/<project>/`
2. Write plan: goal, files, steps, validation commands, rollback note
3. Approval block required before implement

Report: `reports/chores/`.

Implement after approval via **implement-slice** (same implement flow, point plan path to specs/chores/).
