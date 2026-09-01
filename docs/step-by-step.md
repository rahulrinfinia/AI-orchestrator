# Step-by-step — complete guide

> **his-global-south / IPD:** See [architecture/his-global-south.md](architecture/his-global-south.md) and [specs/features/his-global-south/ipd-slice-0-scaffold.md](../specs/features/his-global-south/ipd-slice-0-scaffold.md). Use `projects/his-global-south/`.

**Start here.** This doc covers setup, features, tests, code review, PR review, who does what, and what to say at each step.

Conceptual background: [ai-driven-development.md](ai-driven-development.md)  
Folder layout + skills: [how-it-works.md](how-it-works.md)  
Platform comparison: [platform-parity.md](platform-parity.md)

---

## Table of contents

1. [Two layers — hub vs clone](#1-two-layers--hub-vs-clone)
2. [Who does what](#2-who-does-what)
3. [One-time setup](#3-one-time-setup)
4. [Path A — New feature (full pipeline)](#path-a--new-feature-full-pipeline)
5. [Path B — Small feature](#path-b--small-feature-short-pipeline)
6. [Path C — Bug fix](#path-c--bug-fix)
7. [Path D — Chore](#path-d--chore-deps-cleanup)
8. [Path E — Hub only (no coding)](#path-e--hub-only-no-coding)
9. [Path F — Onboard a new project](#path-f--onboard-a-new-project-eg-flowmd)
10. [Path G — Code review & PR review](#path-g--code-review--pr-review-after-implement)
11. [Path H — Testing](#path-h--testing)
12. [Full lifecycle diagram](#full-lifecycle-diagram)
13. [What to push where (git)](#what-to-push-where-git)
14. [All skills (platform parity)](#all-skills-platform-parity)
15. [Approval gate](#the-approval-gate-every-implement-path)
16. [Artifact map](#what-goes-where-quick-map)
17. [Decision tree](#decision-tree--which-path)
18. [First end-to-end run](#first-end-to-end-run-copy-this-sequence)
19. [Why folders look empty](#why-folders-look-empty-vs-platform)

---

## 1. Two layers — hub vs clone

**Always open the hub in Cursor** — not only the app folder.

```text
┌─────────────────────────────────────────────────────────┐
│  ai-orchestrator-workspace  ← OPEN THIS in Cursor       │
│  prd/  specs/  reports/  docs/  .cursor/skills/         │
│  Hub git — plans only, NO app source code               │
└──────────────────────────┬──────────────────────────────┘
                           │ setup.ps1 clones once
                           ▼
┌─────────────────────────────────────────────────────────┐
│  projects/ipd/  ← real code lives here                  │
│  src/ (React)  backend/ (Fastify)  e2e/                 │
│  Own git → push to GitHub IPD repo only                 │
│  Gitignored by hub — never pushed with hub branch       │
└─────────────────────────────────────────────────────────┘
```

| Layer | What's there | Who pushes |
|-------|--------------|------------|
| **Hub** | PRDs, plans, test plans, review reports | Hub git |
| **Clone** `projects/ipd/` | App code, tests, PRs | IPD git (via PR merge) |

Same model as **platform-workspace**: hub = brain, clone = body. Platform uses `backend/` for microservices; this hub uses **`projects/`** for modular monoliths.

---

## 2. Who does what

| Work | Agent | You |
|------|-------|-----|
| PRD, technical design, slices, slice plans | Writes drafts | **Approve** each gate (G1–G4) |
| Code + tests in slice implement | Writes + runs | Review PR, **merge** |
| Dedicated test plans | Writes in hub | Approve → `test-implement` |
| `pre-review`, `code-review`, `pr-review` | Runs checks / writes reports | **Trigger** with chat command |
| `pr-review-implement` | Applies fixes, pushes | Review again, merge |
| Push hub docs | — | You (when ready) |

**Agent does the work. You approve before code and before merge.**

Messages like `Run feature-orchestrator for ipd — …` are **Cursor chat prompts**, not terminal commands. Replace the description with your feature in plain English:

```text
Run feature-orchestrator for ipd — Ward staff can admit a patient: demographics, ward, bed, validation, PHI audit log
```

---

## 3. One-time setup

| Step | Action |
|------|--------|
| 1 | Open **`C:\projects\ai-orchestrator-workspace`** in Cursor |
| 2 | Confirm `repos.yaml` lists your project (e.g. `ipd`) |
| 3 | Run `.\scripts\setup.ps1` if `projects/ipd/` is missing |
| 4 | Run `.\scripts\update.ps1` to pull latest on all clones |
| 5 | Say `project-discovery ipd` — documents routes, modules, env |
| 6 | Bookmark `docs/conventions/` — agents read these automatically |

You do **not** need to fill convention files — they are pre-written for Fastify + React.

---

## Path A — New feature (full pipeline)

Use when the work is a **new capability** (epic, major screen, new module).

### Step 0 — Start intake

**Say in Cursor:**

```text
Run feature-orchestrator for ipd — <describe the feature in plain English>
```

Optional: Jira link, Figma link, screenshots.

**Agent creates:** `prd/ipd/<feature>/ticket.md`

**You do:** Read it. Confirm scope is correct.

**Say:** `Proceed to PRD` or `Change: …`

---

### Step 1 — PRD (Gate G1)

**Agent creates:** `prd/ipd/<feature>/prd.md`

**You do:**

1. Read problem, users, acceptance criteria, non-goals
2. Edit if needed
3. Add approval block (copy from `docs/templates/approval.md`):

```markdown
## Approval
- [x] Product — acceptance criteria match intent
- [x] Tech — scope is realistic
- **Approved by:** Your Name
- **Date:** YYYY-MM-DD
```

**Say:** `Proceed to technical design`

---

### Step 2 — Technical design (Gate G2)

**Agent creates:** `prd/ipd/<feature>/technical-design.md`

Contains: modules, API endpoints, DB entities, ADR references — **system level, not file list**.

The agent drafts this from the approved PRD + `docs/architecture/ipd.md` + `docs/decisions/ipd/`. You review, edit, and approve. A human architect can rewrite it before approval if you prefer.

**You do:**

1. Check it matches `docs/architecture/ipd.md`
2. Edit if needed (`Change technical design: …`)
3. Add **Approval** block

**Say:** `Decompose into slices`

---

### Step 3 — Decompose slices (Gate G3)

**Agent creates:**

```text
prd/ipd/<feature>/slices/README.md
prd/ipd/<feature>/slices/slice-1.md
prd/ipd/<feature>/slices/slice-2.md
…
prd/ipd/<feature>/slices/status.yaml
```

**Rule:** Slice 1 = **tracer bullet** (thinnest UI → API → DB path).

**You do:**

1. Review slice order
2. Approve in chat or add note in `slices/README.md`
3. Add **Approval** block to `slices/README.md` or confirm in chat

**Say:** `Plan slice 1` (or `Plan slice prd/ipd/<feature>/slices/slice-1.md`)

---

### Step 4 — Plan slice (Gate G4)

**Agent creates:** `specs/features/ipd/slice-1-<name>.md`

Contains: exact files in `projects/ipd/`, steps, **tests to write**, validation commands.

**You do:**

1. Read every step — this is what the agent will execute
2. Edit if wrong
3. Add **Approval** block — **required before implement**

**Say:** `Implement specs/features/ipd/slice-1-<name>.md`

---

### Step 5 — Implement

**Agent does (in `projects/ipd/`, not hub):**

1. Runs **convention-loader**
2. Creates git branch `feat/ipd-slice-1-…`
3. Writes code + tests from plan
4. Runs lint / typecheck / test
5. Opens PR (if you allow)
6. Writes `reports/features/<branch>-report.md`

**You do:**

1. Review the PR
2. Test locally if needed
3. Run review loop (Path G) — see below
4. Merge when satisfied
5. Update `prd/ipd/<feature>/slices/status.yaml` → merged

---

### Step 6 — Next slice

Repeat **Steps 4–5** for slice 2, 3, … until all slices in `status.yaml` are merged.

---

### Step 7 — Close feature (optional)

```text
changelog ipd
drift ipd
```

---

## Path B — Small feature (short pipeline)

Use when work fits **one PR** and does not need full PRD.

| Step | Say | Output |
|------|-----|--------|
| 1 | `feature plan for ipd — <description>` | `specs/features/ipd/<name>.md` |
| 2 | Review + add **Approval** | — |
| 3 | `Implement specs/features/ipd/<name>.md` | Code + tests + PR + report |

Skip PRD, technical design, and decompose.

---

## Path C — Bug fix

| Step | Say | Output |
|------|-----|--------|
| 1 | `Bug: <symptoms> on ipd` | `specs/bugs/<name>.md` |
| 2 | Review root cause + fix plan + add **Approval** | — |
| 3 | `Implement specs/bugs/<name>.md` | Fix + regression test + PR |

---

## Path D — Chore (deps, cleanup)

| Step | Say | Output |
|------|-----|--------|
| 1 | `Chore: <task> on ipd` | `specs/chores/<name>.md` |
| 2 | Review + add **Approval** | — |
| 3 | `Implement specs/chores/<name>.md` | PR (no behavior change unless stated) |

---

## Path E — Hub only (no coding)

Use while building process/docs before touching app code.

| Step | Goal | Say |
|------|------|-----|
| 1 | Document app | `project-discovery ipd` |
| 2 | Check stale docs | `drift ipd` |
| 3 | Plan tests | `test-plan ipd admissions module` |
| 4 | User journey | `journey ipd admit patient` |
| 5 | API contract | `contracts ipd admissions` |
| 6 | Full feature docs only | Path A Steps 0–4 — **stop before implement** |

---

## Path F — Onboard a new project (e.g. FlowMD)

| Step | Action |
|------|--------|
| 1 | Create GitHub repo (modular monolith layout) |
| 2 | Add entry to `repos.yaml` under `projects:` |
| 3 | Run `.\scripts\setup.ps1` |
| 4 | Copy `docs/templates/project-architecture.md` → `docs/architecture/flowmd.md` |
| 5 | Add row to `docs/architecture.md` |
| 6 | `project-discovery flowmd` |
| 7 | Add ADRs in `docs/decisions/flowmd/` if different from IPD |
| 8 | Start Path A with `Run feature-orchestrator for flowmd — …` |

Full detail: [onboarding-new-project.md](onboarding-new-project.md)

---

## Path G — Code review & PR review (after implement)

Runs **after implement** when a PR exists. Platform had `code-review`, `pr-review`, `pr-review-implement` — same jobs as skills here, plus **`pre-review`** (author self-check).

```text
implement → pre-review → open PR → code-review → pr-review → pr-review-implement → merge
   author      author      author     reviewer      author           author
```

### G1 — Pre-review (author, before opening PR)

**When:** Code is done on branch, before you open or share the PR.

**Say:** `pre-review ipd`

**Agent checks in `projects/ipd/`:**

- lint, typecheck, tests pass
- matches `docs/conventions/`
- no secrets / PHI in logs
- plan acceptance criteria covered

**Output:** Pass/fail in chat. Fix issues before opening PR.

---

### G2 — Code review (reviewer, on open PR)

**When:** PR exists on GitHub. Usually someone **other than the author**.

**Say:** `code-review ipd PR #12`

**Agent does:**

1. Fetches PR diff via `gh` in `projects/ipd/`
2. Finds original spec in hub (`specs/features/...`)
3. Checks code vs spec + conventions + security
4. Writes `reports/code-reviews/pr-12-ipd-review.md`
5. Can post review comments on GitHub (if `gh` configured)

| Category | Meaning |
|----------|---------|
| BLOCKER | Must fix before merge |
| IMPORTANT | Should fix |
| SUGGESTION | Optional |

---

### G3 — PR review (author, after comments arrive)

**When:** Reviewer left comments; you need a fix plan before coding.

**Say:** `pr-review ipd PR #12`

**Agent does:**

1. Fetches all PR comments from GitHub
2. Reads original spec from hub
3. Categorizes: Fix Required / Will Defend / Clarification / Already Addressed
4. Writes `specs/pr-reviews/pr-12-<short-title>.md`

**You do:** Review plan. Add **Approval**. **No code changes yet.**

---

### G4 — PR review implement (author, apply fixes)

**When:** Fix plan is approved.

**Say:** `pr-review-implement specs/pr-reviews/pr-12-<short-title>.md`

**Agent does:**

1. Applies fixes in `projects/ipd/` on PR branch
2. Runs validation commands
3. Pushes to same PR
4. Replies to review comments on GitHub
5. Writes `reports/pr-reviews/pr-12-report.md`

**You do:** Re-request review → repeat G2 if needed → merge when approved.

### Path G summary

| Step | Skill | Who | Input | Output |
|------|-------|-----|-------|--------|
| G1 | `pre-review` | Author | branch in `projects/ipd/` | chat checklist |
| G2 | `code-review` | Reviewer | PR # | `reports/code-reviews/` |
| G3 | `pr-review` | Author | PR # | `specs/pr-reviews/` |
| G4 | `pr-review-implement` | Author | approved pr-review plan | push + `reports/pr-reviews/` |

---

## Path H — Testing

Testing is **planned in the hub**, **implemented in the clone**, like features. Platform had `test-plan`, `test-implement`, etc. — same skills here.

Strategy doc (read once): [`docs/test/testing-strategy.md`](test/testing-strategy.md)

### When testing happens

| When | What |
|------|------|
| Path A Step 4 (slice plan) | Plan lists tests to write |
| Path A Step 5 (implement) | Agent writes + runs those tests |
| After slice merged (optional) | Dedicated `test-plan` for deeper coverage |
| Every PR | CI in `projects/ipd/.github/workflows/ci.yml` |

**Minimum:** every slice plan includes tests; implement runs them.

### H1 — Test plan (hub)

**Say (pick one):**

```text
test-plan ipd admissions module
test-plan-integration ipd
test-plan-contracts ipd
```

| Skill | Output |
|-------|--------|
| `test-plan` | `specs/tests/unit/ipd/<module>.md` |
| `test-plan-integration` | `specs/tests/integration/ipd.md` |
| `test-plan-contracts` | `specs/tests/contracts/ipd.md` |

**You do:** Review plan. Add **Approval** before implement.

### H2 — Test implement (clone)

**Say:** `test-implement specs/tests/unit/ipd/admissions.md`

**Agent does in `projects/ipd/`:**

1. Branch `test/<scope>`
2. Writes Vitest tests per plan
3. Runs `pnpm test`
4. Opens PR (optional)
5. Writes `reports/tests/<name>-report.md`

### H3 — CI (automatic)

On every PR in the app repo: frontend typecheck + lint; backend typecheck + lint + test.

### Path H summary

| Step | Skill | Output |
|------|-------|--------|
| H1a | `test-plan` | `specs/tests/unit/` |
| H1b | `test-plan-integration` | `specs/tests/integration/` |
| H1c | `test-plan-contracts` | `specs/tests/contracts/` |
| H2 | `test-implement` | tests in `projects/ipd/` + `reports/tests/` |

---

## Full lifecycle diagram

```text
YOU: describe feature
  │
  ▼
feature-orchestrator ──► ticket.md
  │
  ▼
PRD ──────────────────► prd.md                    [YOU approve G1]
  │
  ▼
technical-design ─────► technical-design.md       [YOU approve G2]
  │
  ▼
decompose-slices ─────► slices/slice-1..N.md    [YOU approve G3]
  │
  ▼
plan-slice ───────────► specs/features/slice-1   [YOU approve G4]
  │                      (includes test list)
  ▼
┌─────────────────────────────────────────────────────────┐
│  projects/ipd/ — implement-slice: code + tests + PR   │
└─────────────────────────────────────────────────────────┘
  │
  ▼
pre-review ipd                                    [optional, G1]
  │
  ▼
code-review ipd PR #N                             [reviewer, G2]
  │
  ▼
pr-review ipd PR #N                               [author, G3]
  │
  ▼
pr-review-implement                               [author, G4]
  │
  ▼
MERGE ──► next slice OR changelog/drift

Optional parallel:
  test-plan ──► test-implement  (extra coverage beyond slice)
```

---

## What to push where (git)

| You push… | To… | Contains |
|-----------|-----|----------|
| Hub branch | ai-orchestrator-workspace git | `prd/`, `specs/`, `reports/`, `docs/` |
| IPD PR merge | IPD GitHub repo | Code, tests, migrations |
| **Never** | Hub git | `projects/ipd/` (gitignored) |

---

## All skills (platform parity)

Platform uses `.claude/commands/`; this hub uses `.cursor/skills/` — same jobs.

| Category | Skills |
|----------|--------|
| **Feature flow** | `feature-orchestrator`, `prd`, `technical-design`, `decompose-slices`, `plan-slice`, `implement-slice`, `feature` |
| **Bug / chore** | `bug`, `chore` |
| **Testing** | `test-plan`, `test-implement`, `test-plan-integration`, `test-plan-contracts` |
| **Review** | `pre-review`, `code-review`, `pr-review`, `pr-review-implement` |
| **Docs** | `project-discovery`, `drift`, `contracts`, `journey`, `changelog`, `architecture` |
| **Decisions** | `architecture-decision`, `architecture-decision-record` |
| **Conventions** | `convention-loader` |

| Platform command | Your skill |
|------------------|------------|
| `test-plan` | `test-plan` |
| `test-implement` | `test-implement` |
| `code-review` | `code-review` |
| `pr-review` | `pr-review` |
| `implement` | `implement-slice` |
| `services` / `service` | `project-discovery` (one project at a time) |
| — | `pre-review`, `feature-orchestrator` (extras) |

Not ported (different stack): `fastapi-service`, `django-service`, `angular-app`, `react-native-app` — use one monolith per `projects/<name>/`.

---

## The approval gate (every implement path)

Before **any** implement command, the plan file must contain:

```markdown
## Approval
- [x] Product — acceptance criteria match intent
- [x] Tech — AD constraints respected
- **Approved by:** Your Name
- **Date:** YYYY-MM-DD
```

If missing → agent **must refuse** implement. This is by design.

---

## What goes where (quick map)

| Artifact | Folder |
|----------|--------|
| PRD, technical design, slices | `prd/ipd/` |
| Implementation plan | `specs/features/ipd/` |
| Bug / chore plan | `specs/bugs/`, `specs/chores/` |
| After implement | `reports/features/` |
| Code review | `reports/code-reviews/` |
| PR fix plans | `specs/pr-reviews/` + `reports/pr-reviews/` |
| Test plans | `specs/tests/unit\|integration\|contracts/` |
| Test reports | `reports/tests/` |
| Coding standards | `docs/conventions/` |
| System architecture | `docs/architecture/ipd.md` |
| ADRs | `docs/decisions/ipd/` |
| Application code | `projects/ipd/` only |

---

## Decision tree — which path?

```text
New large feature?     → Path A (full pipeline)
Small one-PR change?   → Path B
Something broken?      → Path C
Upgrade / cleanup?     → Path D
Docs/plans only?       → Path E (stop before implement)
New app in hub?        → Path F
Fix PR comments?       → Path G (G3–G4)
Review someone's PR?   → Path G (G2)
Extra test coverage?   → Path H
```

---

## First end-to-end run (copy this sequence)

```text
1.  project-discovery ipd

2.  Run feature-orchestrator for ipd — <your feature in plain English>

3.  Proceed to PRD → approve → Proceed to technical design

4.  approve TD → Decompose into slices

5.  approve slices → Plan slice 1

6.  approve slice plan → Implement specs/features/ipd/slice-1-....md

7.  pre-review ipd

8.  code-review ipd PR #1

9.  (if comments) pr-review ipd PR #1 → approve plan → pr-review-implement ...

10. merge → Plan slice 2 ... or changelog ipd
```

### Hub-only practice (~15 min, no code)

Do Path A **Steps 0–4 only**:

```text
Run feature-orchestrator for ipd — ward bed occupancy dashboard for nurses
```

Stop after the slice plan is approved. Full paper trail in `prd/` and `specs/` with zero code changes.

---

## Why folders look empty vs platform

Platform has hundreds of files in `prd/`, `specs/tests/`, `reports/code-reviews/` from **years of delivery**. Your hub has the **structure + skills** — content appears each time you run a step. That is normal for a new hub.

---

## Quick reference — what to say

| Goal | Command |
|------|---------|
| Full feature | `Run feature-orchestrator for ipd — …` |
| Plan one slice | `Plan slice 1` |
| Write code | `Implement specs/features/ipd/slice-1-….md` |
| Bug | `Bug: … on ipd` |
| Small feature | `feature plan for ipd — …` |
| Document app | `project-discovery ipd` |
| Check stale docs | `drift ipd` |
| Unit test plan | `test-plan ipd admissions module` |
| Write tests | `test-implement specs/tests/...` |
| Self-check before PR | `pre-review ipd` |
| Review PR | `code-review ipd PR #N` |
| Plan PR fixes | `pr-review ipd PR #N` |
| Apply PR fixes | `pr-review-implement specs/pr-reviews/...` |

---

## Related docs

| Doc | When |
|-----|------|
| [ai-driven-development.md](ai-driven-development.md) | Why this model exists |
| [how-it-works.md](how-it-works.md) | Folder layout + skills list |
| [developer-guide.md](developer-guide.md) | Full skill reference |
| [platform-parity.md](platform-parity.md) | How this maps to platform-workspace |
| [architecture/STRUCTURE.md](architecture/STRUCTURE.md) | Writing architecture docs |
