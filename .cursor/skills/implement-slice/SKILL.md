---
name: implement-slice
description: Implements an approved slice plan in projects/<name>/, runs validation, writes a report. Does NOT commit or push unless user explicitly asks. Use only when specs/features/ plan has completed Approval section.
---

# Implement Slice

Input: `specs/features/<project>/slice-N-*.md`

## Gate check (first step)

Read the plan file. If `## Approval` is missing or checkboxes empty → **STOP** and tell user to approve plan first.

## Preconditions

- Work in `projects/<name>/` per `repos.yaml` — **not** this hub repo.
- Tell user code lives under `projects/<name>/` (hub `.gitignore` hides it from hub commits).

## Steps

1. Read plan completely.
2. Read `.cursor/rules/his-implement-before-code.mdc` and write code to those patterns (constants + `*_VALUES`, types not from components, Fastify schemas, `sql.raw` CHECKs, `src/<mod>/` layout).
3. Run **convention-loader** for files in the plan; follow output.
4. Execute plan steps in order (migration → backend → frontend → tests).
5. Run validation commands from plan. For `his-global-south`, also run the **same commands as GitHub CI** in `projects/his-global-south/` — do not skip even if the plan omitted them:
   - Frontend (`src/**`): `npm run lint` then `npx tsc -b`
   - Backend (`backend/**`): `npm run build` in `backend/`
   Vite / `npm run dev` / Vitest alone is **not** done. If `tsc -b` fails, fix before the report.
6. Write `reports/features/<slice-id>-report.md`:
   - Plan path, clone path, list of files created/changed
   - Validation results
   - Convention compliance
7. Update `prd/<project>/slices/status.yaml` → `implemented` (local only).
8. **Stop.** Tell user exactly which paths changed in `projects/<name>/`.

## Commit / push / PR (only when user explicitly asks)

- Branch: `feat/<project>-slice-N-<short-title>`
- Commit message: `feat(<domain>): slice N — <title>`
- Push + `gh pr create` only on user request
- Then update `status.yaml` → `in_review` with PR URL

## PR body template (when user asks for PR)

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

- Commit or push without explicit user approval.
- Commit application code to the hub repo.
- Skip tests defined in plan.
- Amend architecture decisions from technical design.
