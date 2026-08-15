# Adding a project

## 1. Create the application repo

Create a **modular monolith** on GitHub:

```text
flowmd/
├── src/                 ← React + Vite
├── backend/             ← Fastify + modules
├── e2e/
├── docker-compose.dev.yml
└── README.md
```

Initialize with your stack (Fastify, React, Postgres, etc.).

## 2. Register in repos.yaml

```yaml
projects:
  - name: flowmd
    repo: git@github.com:YOUR_ORG/flowmd.git
    branch: develop
    type: modular-monolith
    layout:
      frontend: .
      backend: backend/
```

## 3. Clone into workspace

```powershell
cd C:\projects\ai-orchestrator-workspace
.\scripts\setup.ps1
```

Result: `projects/flowmd/` (gitignored in hub, own `.git` inside).

## 4. Add hub documentation

Create:

- `docs/services/flowmd.md` — modules, ports, deploy targets
- `prd/flowmd/` — when starting first feature

## 5. Copy coding rules into the app repo

Add `.cursor/rules/` inside `projects/flowmd/` for Fastify/React standards (or symlink from template when ready).

## 6. Start first feature

In Cursor (this hub):

```text
Run feature-orchestrator for flowmd — Jira PROJ-123 + Figma <link>
```

## Adding another product later

Add another `projects:` entry → `setup.ps1` again. Same hub, multiple clones.
