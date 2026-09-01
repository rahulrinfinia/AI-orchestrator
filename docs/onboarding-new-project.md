# Onboarding a new project

Add a second (or third) product to the hub — same pattern as platform-workspace adding Curio vs Caria.

**Time:** ~30 minutes for hub setup (same stack). Coding in the clone comes later.

---

## Before you start

| Question | If yes | If no |
|----------|--------|-------|
| Same stack as IPD? (Fastify + React + Postgres) | Reuse all `docs/conventions/` | Add new convention file under `docs/conventions/` |
| Healthcare / PHI? | Reuse `hipaa.md` + audit ADRs | Skip or adapt security docs |
| Repo exists on GitHub? | Continue below | Create empty or starter repo first |

---

## Step 1 — Register the clone (5 min)

Edit `repos.yaml`:

```yaml
projects:
  - name: flowmd
    repo: https://github.com/YOUR_ORG/flowmd.git
    branch: main
    type: modular-monolith
    product: flowmd
    layout:
      frontend: .
      backend: backend/
```

Clone:

```powershell
cd C:\projects\ai-orchestrator-workspace
.\scripts\setup.ps1
```

Result: `projects/flowmd/` (gitignored in hub, own git inside).

---

## Step 2 — Hub documentation (15 min)

Use checklist: [`templates/new-project-checklist.md`](templates/new-project-checklist.md)

| # | Action | File |
|---|--------|------|
| 1 | Copy template and fill | `docs/architecture/<name>.md` ← [`templates/project-architecture.md`](templates/project-architecture.md) |
| 2 | Add product row | [`docs/architecture.md`](architecture.md) |
| 3 | Create ADR folder | `docs/decisions/<name>/` — minimum: data store, auth, deploy |
| 4 | Service discovery | Say in Cursor: `project-discovery <name>` → `docs/services/<name>.md` |
| 5 | Optional stubs | `docs/contracts/<name>/`, `docs/journeys/<name>/`, `docs/changelog/<name>/` |

**Architecture structure:** [`architecture/STRUCTURE.md`](architecture/STRUCTURE.md) (12 sections).

**Do not** merge new product into another project's architecture doc — one file per `repos.yaml` name.

Example for this hub:

```text
docs/architecture/his-global-south.md
docs/decisions/his-global-south/
prd/his-global-south/ipd/
specs/features/his-global-south/
projects/his-global-south/
```

---

## Step 3 — Reuse without copying (0 min)

These are **shared** for all Fastify + React monoliths:

| Reuse as-is |
|-------------|
| `docs/conventions/` (all files) |
| `docs/test/testing-strategy.md` |
| `.cursor/skills/` (all 28 skills) |
| `docs/templates/approval.md`, `prd.md` |
| `AGENTS.md`, `docs/how-it-works.md` |

---

## Step 4 — App repo setup (when ready to code)

| Action | Where |
|--------|--------|
| Copy Cursor rules from IPD | `projects/<name>/.cursor/rules/` (backend, frontend, security) |
| CI workflow | `projects/<name>/.github/workflows/ci.yml` |
| Folder structure | See [`conventions/folder-structure.md`](conventions/folder-structure.md) |

Skip this step if you are **hub-only** for now.

---

## Step 5 — First feature

In Cursor (this hub):

```text
Run feature-orchestrator for flowmd — describe your first feature
```

That creates:

```text
prd/flowmd/...
specs/features/flowmd/...
```

Implement only after plan approval — and only when you are ready to work in `projects/flowmd/`.

---

## Quick reference — what to fill when

| Document | When | Who |
|----------|------|-----|
| `docs/conventions/` | Once per stack | Done — reuse |
| `docs/architecture/<name>.md` | Each new project | You + agent |
| `docs/decisions/<name>/` | Each new project (key ADRs) | You + agent |
| `docs/services/<name>.md` | After clone / when code changes | `project-discovery` |
| `prd/<name>/` | Each feature | `feature-orchestrator` |
| `specs/features/<name>/` | Each slice plan | `plan-slice` |
| `docs/contracts/`, `journeys/` | As APIs/flows ship | `contracts`, `journey` skills |

---

## Same stack vs new stack

### Same stack (Fastify + React + Postgres)

- Reuse conventions
- Copy IPD ADRs if decisions match, or write new ones in `docs/decisions/<name>/`
- Copy `.cursor/rules/` from `projects/his-global-south/`

### Different stack (e.g. Django, Angular)

- Add `docs/conventions/<stack>.md` (like platform-workspace’s 7 convention files)
- Update `convention-loader` skill sources if needed
- Architecture + ADRs still per project

---

## Multi-project layout (after several products)

```text
ai-orchestrator-workspace/
├── repos.yaml
├── projects/his-global-south/, projects/<other>/, ...
├── docs/architecture.md
├── docs/architecture/his-global-south.md
├── docs/decisions/his-global-south/
├── prd/his-global-south/ipd/
└── specs/features/his-global-south/
```

---

## Cursor commands

```text
project-discovery flowmd
architecture skill for flowmd
drift flowmd
Run feature-orchestrator for flowmd — <feature>
```

---

## Related docs

| Doc | Purpose |
|-----|---------|
| [adding-a-project.md](adding-a-project.md) | Detailed add-project steps |
| [templates/new-project-checklist.md](templates/new-project-checklist.md) | Checkbox checklist |
| [architecture/STRUCTURE.md](architecture/STRUCTURE.md) | Architecture doc sections |
| [how-it-works.md](how-it-works.md) | Full hub workflow |
