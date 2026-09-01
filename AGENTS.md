# AI Orchestrator — Agent Entry

**Default project:** `his-global-south`  
**Default feature (current work):** `ipd`

**Claude Code:** see [CLAUDE.md](CLAUDE.md) — same rules as Cursor below.

## Cursor rules (always apply for HIS work)

1. [.cursor/rules/his-implement-before-code.mdc](.cursor/rules/his-implement-before-code.mdc) — constants, types, schemas, layout
2. [.cursor/rules/his-pr-review-lessons.mdc](.cursor/rules/his-pr-review-lessons.mdc) — PR #47 review bar (response schemas, AJV messages, registration guards)
3. [.cursor/rules/his-match-ci-before-done.mdc](.cursor/rules/his-match-ci-before-done.mdc) — lint + `tsc -b` before done
4. [.cursor/rules/no-git-without-explicit-approval.mdc](.cursor/rules/no-git-without-explicit-approval.mdc) — no commit/push unless asked
5. [.cursor/rules/no-frontend-heavy-lifting.mdc](.cursor/rules/no-frontend-heavy-lifting.mdc) — counts/aggregates server-side, not in React

## PR review (his-global-south)

Use **[.cursor/skills/his-pr-review/SKILL.md](.cursor/skills/his-pr-review/SKILL.md)** — covers all Cursor + Claude rules, PR #47 bar, and [PR review checklist](docs/templates/his-pr-review-checklist.md). Prefer over generic `code-review` for this project.

Author self-check first: [.cursor/skills/pre-review/SKILL.md](.cursor/skills/pre-review/SKILL.md).

## Before any IPD implement step

1. [his-global-south.md](docs/architecture/his-global-south.md) — project architecture
2. [his-global-south-patterns.md](docs/conventions/his-global-south-patterns.md) — code patterns
3. Slice spec: `specs/features/his-global-south/ipd-slice-N-*.md` with **Approval** filled
4. Clone: `projects/his-global-south/` per [repos.yaml](repos.yaml)
5. Status: [prd/his-global-south/ipd/slices/status.yaml](prd/his-global-south/ipd/slices/status.yaml)

## Workflow

```text
Approve slice spec → implement in projects/his-global-south/ → PR to develop
→ update prd/his-global-south/ipd/slices/status.yaml → reports/
```

**Never implement without approved slice spec. Never modify OPD modules for IPD work.**

## Adding another project later

See [adding-a-project.md](docs/adding-a-project.md) — new row in `repos.yaml` + new `docs/architecture/<name>.md`.
