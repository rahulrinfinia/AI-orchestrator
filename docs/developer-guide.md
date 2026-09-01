# Developer guide

Operational reference. For the conceptual overview see **[how-it-works.md](how-it-works.md)**.

## What this repo is

A **central hub** for AI-orchestrated delivery. Application code lives in cloned repos under `projects/<name>/` — each a **modular monolith** (React + Fastify in one repo).

Parity with **platform-workspace**: same planning/review/test/doc skills, adapted for Cursor + monolith layout + approval gates.

## Prerequisites

- Git, GitHub CLI (`gh`) optional for PRs
- Cursor with agent + skills
- For cloning: PowerShell (Windows) or bash
- Optional: `yq` for YAML parsing in shell scripts (or edit `repos.yaml` manually)
- Optional: copy `.mcp.json.example` → `.mcp.json` for Sonar/Sentry MCP

## Setup

```powershell
cd C:\projects\ai-orchestrator-workspace
# Edit repos.yaml — add your project
.\scripts\setup.ps1
# After clone:
# "project-discovery <name>"
```

Open **this folder** in Cursor (not only the cloned app).

## End-to-end flow (features)

### 1. Intake

Provide Jira link, Figma, screenshots, or plain description. Agent writes `prd/<project>/ticket.md`.

### 2. PRD (Gate G1)

Agent drafts `prd/<project>/prd.md`. You review workflows and acceptance criteria.  
Add approval block (see `docs/templates/approval.md`). Agent must not proceed without it.

### 3. Technical design (Gate G2)

Agent drafts `technical-design.md` with AD-1, AD-2…, endpoints, migrations, module map.  
You approve before decompose.

### 4. Decompose (Gate G3)

Agent writes `slices/README.md` + `slice-N.md` + `slices/status.yaml`.  
Slice 1 = tracer bullet (UI → API → DB). You approve slice order.

### 5. Plan slice (Gate G4)

For each slice: `specs/features/<project>/slice-N-*.md` with exact files in `backend/<project>/`.  
You approve → then implement.

### 6. Implement

Agent works in `backend/<project>/`: branch, code, tests, validation commands, PR, `reports/features/...`.

### 7. Pre-review & code review

Run **pre-review** locally, open PR, then **code-review** / **pr-review** loop.

### 8. Testing

Optional test plans: `specs/tests/unit|integration|contracts/`. Implement with **test-implement**.

### 9. Update status

Mark slice merged in `prd/<project>/slices/status.yaml`. **changelog** for releases.

## Other work types

| Type | Skill | Output |
|------|-------|--------|
| Small feature | `feature` | `specs/features/...` |
| Bug | `bug` | `specs/bugs/...` |
| Chore | `chore` | `specs/chores/...` |
| Jira stories | `create-stories` | `specs/stories/...` |

All require approval before implement (same template).

## Documentation maintenance

| Skill | Purpose |
|-------|---------|
| `project-discovery` | Scan clone → `docs/services/<project>.md` |
| `drift` | Find stale docs vs code |
| `contracts` | API contract docs |
| `journey` | End-to-end user flows |
| `architecture` | Hub + app architecture docs |
| `architecture-decision` / `architecture-decision-record` | ADRs in `docs/decisions/` |

## Human gates (non-negotiable)

```markdown
## Approval
- [x] Product — acceptance criteria match Jira/Figma
- [x] Tech — AD constraints respected
- **Approved by:** Name
- **Date:** YYYY-MM-DD
```

Implement skill **must refuse** if this section is missing or unchecked.

## Deploy note

Monorepo ≠ single deploy. Use path filters in app CI:

- `src/**` → frontend (Nginx/static) only
- `backend/**` → API only

## Full skill list

| Skill | Use |
|-------|-----|
| `feature-orchestrator` | Full phased workflow with stops |
| `prd` | PRD only |
| `technical-design` | Technical design only |
| `decompose-slices` | PRD + TD → slices |
| `plan-slice` | One slice → implementation plan |
| `implement-slice` | Approved plan → code + PR |
| `feature` | Small scoped feature plan |
| `bug` | Bug fix plan |
| `chore` | Maintenance plan |
| `create-stories` / `user-stories` | Jira-ready stories |
| `test-plan` / `test-implement` | Unit/component tests |
| `test-plan-integration` | API + Postgres tests |
| `test-plan-contracts` | Contract compliance tests |
| `pre-review` | Self-check before PR |
| `code-review` | Review someone else's PR |
| `pr-review` | Plan fixes for PR comments |
| `pr-review-implement` | Apply review fixes |
| `project-discovery` | Document cloned app |
| `drift` | Doc vs code drift report |
| `contracts` / `journey` / `changelog` / `architecture` | Living documentation |
| `architecture-decision` / `architecture-decision-record` | ADR workflow |
| `convention-loader` | Load relevant coding rules before implement |

## Industry standards

Full docs under `docs/conventions/` and `docs/test/testing-strategy.md`. See [conventions/README.md](conventions/README.md).

## After implement — review loop

```text
1. pre-review on branch
2. Open PR
3. code-review flowmd PR #12        → reports/code-reviews/...
4. (if comments) pr-review flowmd PR #12  → specs/pr-reviews/...
5. pr-review-implement specs/pr-reviews/pr-12-....md
6. Merge when approved
```
