# New project checklist

Copy this when registering a **second (or later) product** in the hub — same pattern as platform-workspace adding a new product line.

## 1. Register clone

- [ ] App repo created (GitHub)
- [ ] Entry in `repos.yaml`
- [ ] `.\scripts\setup.ps1` → `projects/<name>/`

## 2. Hub documentation (required)

| File | Purpose |
|------|---------|
| `docs/architecture/<name>.md` | Product HLD — copy from [project-architecture.md](project-architecture.md) |
| `docs/services/<name>.md` | Discovery — run `project-discovery <name>` |
| `docs/decisions/<name>/` | ADRs — at minimum: data store, auth, deploy |
| Row in `docs/architecture.md` | Index table |

## 3. Hub documentation (as features ship)

| Path | Purpose |
|------|---------|
| `docs/contracts/<name>/` | API contracts |
| `docs/journeys/<name>/` | User journeys |
| `docs/changelog/<name>/` | Releases |
| `prd/<name>/` | Feature PRDs |

## 4. App repo (when coding)

| Path | Purpose |
|------|---------|
| `projects/<name>/.cursor/rules/` | backend, frontend, security |
| `.github/workflows/` | CI |

## 5. Same stack?

If **Fastify + React + Postgres** — reuse `docs/conventions/` as-is.

If **different stack** — add `docs/conventions/<stack-name>.md` (like platform’s separate Express, Angular, Django files).

## 6. First feature

```text
Run feature-orchestrator for <name> — <feature description>
```

Do not run implement until plans are approved.
