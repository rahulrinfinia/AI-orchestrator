# AI Orchestrator Workspace — Agent Entry

You are working in the **central planning hub**, not inside an application repo.

## Before any work

1. Read `docs/how-it-works.md` if unfamiliar with this hub.
2. Read `repos.yaml` — which projects exist under `projects/`?
3. Read `docs/architecture.md` and `docs/conventions/` for the target stack.
4. All **plans** live here (`prd/`, `specs/`). All **code changes** happen in `projects/<name>/` (cloned monolith repo).

## Orchestrator skill

For new features, use **`feature-orchestrator`**. It enforces human approval gates:

| Phase | Output | Gate |
|-------|--------|------|
| Intake | `prd/<project>/ticket.md` | — |
| PRD | `prd/<project>/prd.md` | **Human approves** |
| Technical design | `prd/<project>/technical-design.md` | **Human approves** |
| Decompose | `prd/<project>/slices/` | **Human approves** |
| Plan slice | `specs/features/<project>/slice-N-*.md` | **Human approves** |
| Implement | Branch + PR in `projects/<project>/` | Human PR review |
| Report | `reports/features/...` | — |

**Never run implement phase until the plan file contains an approved `## Approval` section.**

Standalone equivalents: **`prd`**, **`technical-design`**, **`decompose-slices`**, **`plan-slice`**, **`implement-slice`**.

## Project layout (modular monolith)

```text
projects/<name>/
├── src/                 ← React (Vite) — frontend
├── backend/src/modules/ ← Fastify — domain modules
├── backend/src/db/migrations/
└── e2e/
```

One vertical slice = one PR touching backend + frontend + migrations + tests when needed.

## All skills

| Category | Skills |
|----------|--------|
| Feature flow | `feature-orchestrator`, `prd`, `technical-design`, `decompose-slices`, `plan-slice`, `implement-slice`, `feature` |
| Work types | `bug`, `chore` |
| Stories | `create-stories`, `user-stories` |
| Testing | `test-plan`, `test-implement`, `test-plan-integration`, `test-plan-contracts` |
| Review | `pre-review`, `code-review`, `pr-review`, `pr-review-implement` |
| Docs | `project-discovery`, `drift`, `contracts`, `journey`, `changelog`, `architecture` |
| Decisions | `architecture-decision`, `architecture-decision-record` |

| **Decisions** | `architecture-decision`, `architecture-decision-record` |
| **Conventions** | `convention-loader` — load relevant rules before coding |

## Key rules

- Before implement: run **`convention-loader`** with files from the plan.
- Spec is source of truth — implementation must match the approved plan.
- Slice 1 = tracer bullet (thinnest end-to-end path).
- Do not re-decide architecture in plan-slice — technical design AD-N items are constraints.
- After implement: **`pre-review`** → PR → **`code-review`**; write report under `reports/`.
- After clone: run **`project-discovery`** → `docs/services/<project>.md`.
- Periodically: **`drift`** to catch stale docs.

## Commands (human)

```text
"Run feature-orchestrator for flowmd — Jira PROJ-123"
"Bug: login 500 on projects/flowmd"
"Chore: upgrade vitest in flowmd"
"test-plan flowmd backend auth module"
"project-discovery flowmd"
"drift flowmd"
```

## Review loop

| Skill | Who | Example |
|-------|-----|---------|
| `pre-review` | Author | before opening PR |
| `code-review` | Reviewer | `code-review flowmd PR #12` |
| `pr-review` | Author | `pr-review flowmd PR #12` |
| `pr-review-implement` | Author | apply review plan |

Reports: `reports/code-reviews/`, `reports/pr-reviews/`

## Adding a project

See `docs/adding-a-project.md`.
