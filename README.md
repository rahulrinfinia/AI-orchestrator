# AI Orchestrator Workspace

Central hub for AI-driven product delivery — same role as [platform-workspace](https://github.com), adapted for **Cursor**, **modular monolith apps**, and **human approval gates**.

This repo does **not** track application source code. Each product lives in its own git repo, cloned into `projects/`.

## Quick start

```powershell
cd C:\projects\ai-orchestrator-workspace

# 1. Register a project in repos.yaml, then:
.\scripts\setup.ps1

# 2. Open this folder in Cursor. Start a feature:
#    "Run feature-orchestrator for <project> — Jira PROJ-123 + Figma link"
```

## Layout

| Path | Purpose |
|------|---------|
| `AGENTS.md` | Entry point for Cursor agents |
| `repos.yaml` | Projects to clone into `projects/` |
| `prd/` | PRD, technical design, slices, design intake |
| `specs/` | Implementation plans (features, bugs, tests, pr-reviews) |
| `reports/` | Audit trail after implement / review / test |
| `docs/` | Architecture, conventions, templates |
| `projects/` | Cloned app repos (gitignored) |
| `.cursor/skills/` | Full skill set (27) — parity with platform-workspace, adapted for monolith + Cursor |
| `docs/services/` | Per-app discovery docs |
| `docs/contracts/`, `docs/journeys/`, `docs/decisions/` | Contracts, journeys, ADRs |

## Workflow (with human gates)

```text
Jira + Figma
  → PRD (approve)
  → Technical design (approve)
  → Decompose slices (approve)
  → Plan slice N (approve)
  → Implement in projects/<name>/ + tests + PR
  → Code review → PR feedback → merge
  → Next slice
```

## Modular monolith app layout (each cloned project)

```text
projects/flowmd/
├── src/              ← React SPA (repo root)
├── backend/          ← Fastify API
├── e2e/
└── docker-compose.dev.yml
```

Frontend and backend deploy independently via path-based CI — same repo, separate artifacts.

## Skills (all in `.cursor/skills/`)

| Category | Skills |
|----------|--------|
| **Feature flow** | `feature-orchestrator`, `prd`, `technical-design`, `decompose-slices`, `plan-slice`, `implement-slice`, `feature` |
| **Work types** | `bug`, `chore` |
| **Stories** | `create-stories`, `user-stories` |
| **Testing** | `test-plan`, `test-implement`, `test-plan-integration`, `test-plan-contracts` |
| **Review** | `pre-review`, `code-review`, `pr-review`, `pr-review-implement` |
| **Docs & drift** | `project-discovery`, `drift`, `contracts`, `journey`, `changelog`, `architecture` |
| **Decisions** | `architecture-decision`, `architecture-decision-record` |
| **Conventions** | `convention-loader` |

Not ported from platform-workspace (different stack): microservice scaffolds (`fastapi-service`, `django-service`, `angular-app`, etc.) — use one modular monolith per `projects/<name>/` instead.

Optional tooling: copy `.mcp.json.example` → `.mcp.json` for Sonar/Sentry.

## Docs

- **[How it works](docs/how-it-works.md)** — start here
- [Developer guide](docs/developer-guide.md) — command reference
- [Adding a project](docs/adding-a-project.md)
