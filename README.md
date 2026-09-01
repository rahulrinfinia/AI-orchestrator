# AI Orchestrator Workspace

Planning hub for **his-global-south** (FlowMD + embedded IPD).

## Project resolution

| Key | Meaning |
|-----|---------|
| **`his-global-south`** | Git repo / clone (`repos.yaml` `name`) |
| **`ipd`** | Feature epic under that repo |

```text
projects/his-global-south/              ← code
docs/architecture/his-global-south.md   ← project architecture
specs/features/his-global-south/        ← slice plans (ipd-slice-*.md)
prd/his-global-south/ipd/               ← feature PRD + status
docs/decisions/his-global-south/          ← ADRs
```

## Quick start

1. `.\scripts\setup.ps1` → clone `projects/his-global-south/`
2. Read [docs/architecture/his-global-south.md](docs/architecture/his-global-south.md)
3. Approve [specs/features/his-global-south/ipd-slice-0-scaffold.md](specs/features/his-global-south/ipd-slice-0-scaffold.md)
4. Implement in clone

See [AGENTS.md](AGENTS.md).
