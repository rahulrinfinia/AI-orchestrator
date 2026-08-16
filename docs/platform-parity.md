# Hub vs platform-workspace

Same **operating model** as platform-workspace:

| Concept | Platform | This hub |
|---------|----------|----------|
| Hub git tracks plans only | yes | yes |
| App repos cloned locally | yes (gitignored) | yes (gitignored) |
| Each clone has own git | yes | yes |
| Agent skills | `.claude/commands/` | `.cursor/skills/` |

**Folder naming difference:** platform uses `backend/` + `frontend/` for many microservice repos. This hub uses **`projects/`** — one folder per product (modular monolith). Simpler for your stack.

```text
ai-orchestrator-workspace/     ← hub git (plans only)
├── projects/                  ← gitignored clones
│   └── ipd/                   ← own git repo on GitHub
│       ├── src/               ← React
│       └── backend/           ← Fastify (inside the app repo)
├── prd/  specs/  docs/
└── .cursor/skills/
```

**Important:** `projects/ipd/` is on disk for convenience but **never committed** to the hub repo — same as platform never commits `backend/user-backend/` to its git.
