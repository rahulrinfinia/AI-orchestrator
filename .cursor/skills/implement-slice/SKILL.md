---
name: implement-slice
description: Implements an approved slice plan in the cloned modular monolith under projects/, runs validation, opens a PR, and writes a report. Use only when specs/features/ plan has completed Approval section.
---

# Implement Slice

Input: `specs/features/<project>/slice-N-*.md`

## Gate check (first step)

Read the plan file. If `## Approval` is missing or checkboxes empty → **STOP** and tell user to approve plan first.

## Preconditions

- Work in `projects/<project>/` — not this hub repo.
- Branch: `feat/<project>-slice-N-<short-title>`

## Steps

1. Read plan completely.
2. Run **convention-loader** for files in the plan; follow output.
3. Create branch in cloned repo.
3. Execute plan steps in order (migration → backend → frontend → tests).
4. Run all validation commands from plan.
5. Commit with message: `feat(<domain>): slice N — <title>`
6. Push and open PR via `gh pr create` if available.
7. Write `reports/features/<branch>-report.md`:
   - Plan path, branch, PR URL
   - Files changed
   - Validation results
   - Convention compliance
8. Update `prd/<project>/slices/status.yaml` → `in_review` or `merged`.

## PR body template

```markdown
## Summary
Slice N: …

## Plan
specs/features/<project>/slice-N-….md

## Test plan
- [ ] …

## Deploy note
Paths touched: src/ | backend/ | both
```

## Do not

- Commit application code to the hub repo.
- Skip tests defined in plan.
- Amend architecture decisions from technical design.
