# Architecture Documentation

Per-product architecture deep dives. The combined index lives at [`../architecture.md`](../architecture.md).

## Files

| File | Product | When to read |
|------|---------|--------------|
| [STRUCTURE.md](STRUCTURE.md) | — | **One-page cheat sheet** — what goes in architecture docs |
| [ipd.md](ipd.md) | IPD — in-patient department | Any work on `projects/ipd/` |
| _flowmd.md_ | _(future)_ | When FlowMD is registered |

## Key principles

**One file per product.** Do not merge IPD and FlowMD into one doc — same as platform-workspace separates Curio vs Caria.

**Same stack, shared conventions.** All monoliths under `projects/` use `docs/conventions/` unless a project ADR says otherwise.

**Product-specific ADRs** live in `docs/decisions/<name>/` — never assume another product’s ADR applies.

## How to add a new product

1. Register in `repos.yaml` and clone.
2. Copy [`../templates/new-project-checklist.md`](../templates/new-project-checklist.md).
3. Create `docs/architecture/<name>.md` from [`../templates/project-architecture.md`](../templates/project-architecture.md).
4. Add row to [`../architecture.md`](../architecture.md).

Run **`project-discovery <name>`** after clone, then **`architecture`** to align service + architecture docs.
