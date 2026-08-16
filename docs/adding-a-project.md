# Adding a project

Same model as **platform-workspace**: one planning hub, many cloned app repos.

```text
platform-workspace          ai-orchestrator-workspace
├── backend/user-backend/   ├── projects/ipd/
├── backend/master-backend/ ├── projects/flowmd/     ← future
└── docs/architecture/      └── docs/architecture/
    ├── curio.md                ├── ipd.md
    └── caria.md                └── flowmd.md       ← future
```

---

## 1. Create the application repo

Modular monolith on GitHub:

```text
<name>/
├── src/                 ← React + Vite
├── backend/             ← Fastify + modules
├── e2e/
├── docker-compose.dev.yml
└── README.md
```

---

## 2. Register in repos.yaml

```yaml
projects:
  - name: flowmd
    repo: git@github.com:YOUR_ORG/flowmd.git
    branch: develop
    type: modular-monolith
    description: Short label for architecture index
    layout:
      frontend: .
      backend: backend/
```

---

## 3. Clone into workspace

```powershell
cd C:\projects\ai-orchestrator-workspace
.\scripts\setup.ps1
```

Result: `projects/flowmd/` (gitignored in hub, own `.git` inside).

---

## 4. Add hub documentation (required for each project)

Use checklist: [`docs/templates/new-project-checklist.md`](templates/new-project-checklist.md)  
Quick guide: [`onboarding-new-project.md`](onboarding-new-project.md)

| File | Action |
|------|--------|
| `docs/architecture/<name>.md` | Copy [`project-architecture.md`](templates/project-architecture.md) |
| `docs/architecture.md` | Add row to products table |
| `docs/services/<name>.md` | Run `project-discovery <name>` |
| `docs/decisions/<name>/` | Add ADRs (Postgres, auth, deploy, …) |
| `prd/<name>/` | When first feature starts |

Optional later: `docs/contracts/<name>/`, `docs/journeys/<name>/`, `docs/changelog/<name>/`

---

## 5. App repo rules (when coding)

Add `.cursor/rules/` inside `projects/<name>/` (backend, frontend, security).

---

## 6. Start first feature

```text
Run feature-orchestrator for flowmd — Jira PROJ-123 + description
```

---

## Adding more products later

1. Another `projects:` entry in `repos.yaml`
2. `setup.ps1` again
3. New `docs/architecture/<name>.md` — **do not** merge into ipd.md
4. Same `docs/conventions/` if same stack (Fastify + React)

No limit on project count — hub scales like platform-workspace.
