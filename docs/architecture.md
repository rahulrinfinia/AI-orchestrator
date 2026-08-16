# Architecture (workspace index)

Combined index for all products cloned into `backend/` (and `frontend/` when separate SPA repos). Per-product deep dives live in [`architecture/`](architecture/).

Same pattern as platform-workspace: **one hub, many app repos, architecture split by product.**

---

## Products

| Project | Clone path | Pattern | Architecture | Service doc | ADRs |
|---------|------------|---------|--------------|-------------|------|
| **ipd** | `projects/ipd/` | Modular monolith (Fastify + React) | [architecture/ipd.md](architecture/ipd.md) | [services/ipd.md](services/ipd.md) | [decisions/ipd/](decisions/ipd/) |

_Add a row here when you register a new project in `repos.yaml`._

---

## Workspace layout (multi-project)

```text
ai-orchestrator-workspace/
├── repos.yaml                    ← list all projects to clone
├── backend/
│   ├── ipd/                      ← app repo (own git)
│   ├── flowmd/                   ← future
│   └── <name>/                   ← future
├── docs/
│   ├── architecture.md           ← this file (index)
│   ├── architecture/<name>.md    ← one per product
│   ├── services/<name>.md          ← one per product
│   ├── decisions/<name>/           ← ADRs per product
│   ├── contracts/<name>/           ← API docs per product
│   └── journeys/<name>/            ← flows per product
├── prd/<name>/                     ← features per product
└── specs/features/<name>/          ← plans per product
```

---

## Document layers (do not mix levels)

| Layer | Location | Scope |
|-------|----------|--------|
| **Workspace index** | `docs/architecture.md` | All products — table + rules |
| **Product architecture (HLD)** | `docs/architecture/<name>.md` | One monolith — modules, data, deploy |
| **Service discovery** | `docs/services/<name>.md` | What exists in the clone today |
| **Architecture decisions** | `docs/decisions/<name>/` | ADRs — Postgres, auth, etc. |
| **Feature technical design** | `prd/<feature>/technical-design.md` | One epic |
| **Slice plan (LLD)** | `specs/features/<name>/` | One slice |

---

## Cross-project rules

- Planning stays in **this hub** only — no app source in hub git.
- **Same stack** (Fastify + React + Postgres): reuse `docs/conventions/` for all projects.
- **Different stack** later: add `docs/conventions/<stack>.md` (like platform’s 7 convention files).
- **Do not cross-apply** product-specific ADRs — `decisions/ipd/` ≠ `decisions/flowmd/`.
- Before implement: **convention-loader** + product architecture doc.
- After clone or major change: **project-discovery** → **drift**.

---

## Adding a new product (checklist)

1. Create GitHub repo (modular monolith layout).
2. Add entry to `repos.yaml`.
3. Run `.\scripts\setup.ps1` → `projects/<name>/`.
4. Create hub docs (copy template `docs/templates/new-project-checklist.md`).
5. Add row to the table above.
6. Optional: `project-discovery <name>`.

---

## Shared conventions (all monolith projects)

| Doc | Purpose |
|-----|---------|
| [conventions/folder-structure.md](conventions/folder-structure.md) | Module layout |
| [conventions/fastify-backend.md](conventions/fastify-backend.md) | API modules |
| [conventions/react-frontend.md](conventions/react-frontend.md) | UI features |
| [conventions/api-design.md](conventions/api-design.md) | REST rules |
| [conventions/hipaa.md](conventions/hipaa.md) | Healthcare apps |

---

## How to update

| Change | Action |
|--------|--------|
| New project registered | Add `architecture/<name>.md`, `services/<name>.md`, update this index |
| New ADR | `docs/decisions/<name>/NNNN-*.md` + link from product architecture |
| New feature | `prd/` + technical design — update architecture only if boundaries change |
| Code drift | `drift <name>` |

Use skill **`architecture`** to refresh product docs after structural changes.
