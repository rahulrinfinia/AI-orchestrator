# Architecture doc — one-page structure

**File:** `docs/architecture/<product>.md` (one per project)  
**Index:** `docs/architecture.md` (short table of all products)  
**Template:** [`../templates/project-architecture.md`](../templates/project-architecture.md)  
**Example:** [his-global-south.md](his-global-south.md)

---

## What it is

| | Architecture (HLD) | Not architecture |
|---|-------------------|------------------|
| **Level** | Whole product | One feature or slice |
| **Answers** | What modules exist, how they connect, what stack | Which files to edit |
| **Location** | `docs/architecture/<name>.md` | `prd/`, `specs/`, `docs/contracts/` |
| **Updates when** | New module, ADR, integration, deploy change | Every slice (use TD + slice plan instead) |

---

## 12 sections (in order)

| # | Section | Write this | Skip / link elsewhere |
|---|---------|------------|------------------------|
| 1 | **Header table** | Clone path, repo URL, stack, DB, auth | — |
| 2 | **Purpose** | 1–2 paragraphs: product + users | Full requirements → PRD |
| 3 | **System context** | Mermaid: users → app → external systems | — |
| 4 | **Containers** | SPA, API, DB + deploy split | CI yaml → app repo |
| 5 | **Domain modules** | Table: domain ↔ backend module ↔ frontend pages | File list → his-global-south-patterns.md |
| 6 | **Data (high level)** | Entity names + owning module | Columns/SQL → migrations + TD |
| 7 | **API** | Base `/api`, auth, wire format | Schemas → contracts/ |
| 8 | **Security** | PHI, audit, links to hipaa.md | Checklist detail → conventions/ |
| 9 | **Decisions** | Table → `docs/decisions/<name>/` | Full ADR text → decision files |
| 10 | **Related docs** | services, journeys, contracts, prd | — |
| 11 | **Non-goals (v1)** | Explicit out-of-scope | — |
| 12 | **When to update** | Triggers (new domain, ADR, drift) | — |

**Target length:** 2–4 pages. If longer, split → `architecture/<name>/modules.md`, `data.md`.

---

## Document stack (hub)

```text
docs/architecture.md              ← index (all products)
docs/architecture/<name>.md       ← HLD (this cheat sheet)
docs/decisions/<name>/NNNN-*.md   ← why a choice was made
docs/services/<name>.md           ← what exists in code today
prd/<feature>/technical-design.md ← HLD for one feature
specs/features/<name>/slice-*.md  ← LLD for one slice
```

Flow: **ADR + TD → architecture** · **Architecture guides slice plans** · **Discovery/drift keeps services doc honest**

---

## Multi-project (like platform-workspace)

| Add project | Create |
|-------------|--------|
| New row | `docs/architecture.md` table |
| New product | `docs/architecture/<name>.md` |
| New clone | `repos.yaml` + `projects/<name>/` |
| Per product | `docs/services/<name>.md`, `docs/decisions/<name>/` |

**Rule:** one architecture file per product — never merge IPD + FlowMD into one doc.

---

## New product checklist

1. Copy [project-architecture.md](../templates/project-architecture.md) → `docs/architecture/<name>.md`
2. Add ADRs in `docs/decisions/<name>/` (data, auth, deploy minimum)
3. Add row to [architecture.md](../architecture.md)
4. Run `project-discovery <name>` → `docs/services/<name>.md`

Full checklist: [new-project-checklist.md](../templates/new-project-checklist.md)

---

## Cursor command

```text
architecture skill for ipd
Update docs/architecture/his-global-south.md when ADRs change
```

Before implement: read product architecture + run **convention-loader**.
