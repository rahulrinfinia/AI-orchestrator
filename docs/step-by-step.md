# Step-by-step — AI-driven development

Follow these steps in order. Each step says **what you do**, **what you say in Cursor**, and **what appears in the hub**.

Conceptual background: [ai-driven-development.md](ai-driven-development.md)  
Command reference: [how-it-works.md](how-it-works.md)

---

## Before you start (one time)

| Step | Action |
|------|--------|
| 1 | Open **`C:\projects\ai-orchestrator-workspace`** in Cursor (the hub, not only the app folder) |
| 2 | Confirm `repos.yaml` lists your project (e.g. `ipd`) |
| 3 | Run `.\scripts\setup.ps1` if `projects/ipd/` is missing |
| 4 | Bookmark `docs/conventions/` — agents read these automatically |

You do **not** need to fill convention files — they are pre-written.

---

## Path A — New feature (full pipeline)

Use when the work is a **new capability** (epic, major screen, new module).

### Step 1 — Start intake

**Say in Cursor:**

```text
Run feature-orchestrator for ipd — <describe the feature in plain English>
```

Optional: add Jira link, Figma link, or screenshots.

**Agent creates:**

```text
prd/ipd/<feature>/ticket.md
```

**You do:** Read it. Confirm scope is correct.

**Say:** `Proceed to PRD` or `Change: …`

---

### Step 2 — PRD (Gate G1)

**Agent creates:**

```text
prd/ipd/<feature>/prd.md
```

**You do:**

1. Read problem, users, acceptance criteria, non-goals  
2. Edit if needed  
3. Add approval block at the bottom (copy from `docs/templates/approval.md`):

```markdown
## Approval
- [x] Product — acceptance criteria match intent
- [x] Tech — scope is realistic
- **Approved by:** Your Name
- **Date:** YYYY-MM-DD
```

**Say:** `Proceed to technical design`

---

### Step 3 — Technical design (Gate G2)

**Agent creates:**

```text
prd/ipd/<feature>/technical-design.md
```

Contains: modules, API endpoints, DB entities, AD references — **system level, not file list**.

**You do:**

1. Check it matches `docs/architecture/ipd.md`  
2. Edit if needed  
3. Add **Approval** block (same template)

**Say:** `Decompose into slices`

---

### Step 4 — Decompose slices (Gate G3)

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

### Step 5 — Plan slice (Gate G4)

**Agent creates:**

```text
specs/features/ipd/slice-1-<name>.md
```

Contains: exact files in `projects/ipd/`, steps, tests, validation commands.

**You do:**

1. Read every step — this is what the agent will execute  
2. Edit if wrong  
3. Add **Approval** block — **required before implement**

**Say:** `Implement specs/features/ipd/slice-1-<name>.md`

---

### Step 6 — Implement

**Agent does (in `projects/ipd/`, not hub):**

1. Runs **convention-loader**  
2. Creates git branch  
3. Writes code + tests  
4. Runs lint/typecheck/test  
5. Opens PR (if you allow)  
6. Writes report:

```text
reports/features/<branch>-report.md
```

**You do:**

1. Review the PR  
2. Test locally if needed  
3. Merge when satisfied  
4. Update `prd/ipd/<feature>/slices/status.yaml` → merged

**Say (optional):** `pre-review ipd` before opening PR  
**Say (optional):** `code-review ipd PR #N`

---

### Step 7 — Next slice

Repeat **Steps 5–6** for slice 2, 3, … until all slices in `status.yaml` are merged.

---

### Step 8 — Close feature (optional)

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
| 3 | `Implement specs/features/ipd/<name>.md` | Code + PR + report |

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
| 6 | Full feature docs only | Path A Steps 1–5 — **stop before Step 6** |

---

## Path F — Onboard a new project (e.g. FlowMD)

| Step | Action |
|------|--------|
| 1 | Create GitHub repo (modular monolith layout) |
| 2 | Add entry to `repos.yaml` |
| 3 | Run `.\scripts\setup.ps1` |
| 4 | Copy `docs/templates/project-architecture.md` → `docs/architecture/flowmd.md` |
| 5 | Add row to `docs/architecture.md` |
| 6 | `project-discovery flowmd` |
| 7 | Add ADRs in `docs/decisions/flowmd/` if different from IPD |
| 8 | Start Path A with `Run feature-orchestrator for flowmd — …` |

Full detail: [onboarding-new-project.md](onboarding-new-project.md)

---

## Path G — Code review & PR review (after implement)

Runs **after Step 6** of Path A (PR is open). Three roles: **author self-check**, **reviewer**, **author fixes feedback**.

```text
implement → pre-review → open PR → code-review → pr-review → pr-review-implement → merge
   author      author      author     reviewer      author           author
```

---

### G1 — Pre-review (author, before opening PR)

**When:** Code is done on branch, before you open or share the PR.

**Say:**

```text
pre-review ipd
```

**Agent checks in `projects/ipd/`:**

- lint, typecheck, tests pass
- matches `docs/conventions/`
- no secrets / PHI in logs
- plan acceptance criteria covered

**Output:** Pass/fail in chat. Fix issues before opening PR.

---

### G2 — Code review (reviewer, on open PR)

**When:** PR exists on GitHub. Usually someone **other than the author** (or you in a fresh chat).

**Say:**

```text
code-review ipd PR #12
```

**Agent does:**

1. Fetches PR diff via `gh` in `projects/ipd/`
2. Finds original spec in hub (`specs/features/...` linked from PR body)
3. Checks code vs spec + conventions + security
4. Writes report: `reports/code-reviews/pr-12-ipd-review.md`
5. Can post review comments on GitHub (if `gh` configured)

**Verdicts:** Approve / Request changes / Comment

| Category | Meaning |
|----------|---------|
| BLOCKER | Must fix before merge |
| IMPORTANT | Should fix |
| SUGGESTION | Optional |

---

### G3 — PR review (author, after comments arrive)

**When:** Reviewer left comments; **you** need a fix plan before coding.

**Say:**

```text
pr-review ipd PR #12
```

**Agent does:**

1. Fetches all PR comments from GitHub
2. Reads original spec from hub
3. Categorizes each comment: Fix Required / Will Defend / Clarification / Already Addressed
4. Writes plan: `specs/pr-reviews/pr-12-<short-title>.md`

**You do:** Review plan. Add **Approval** if you agree with fix approach.

**No code changes yet** — plan only.

---

### G4 — PR review implement (author, apply fixes)

**When:** Fix plan is approved.

**Say:**

```text
pr-review-implement specs/pr-reviews/pr-12-<short-title>.md
```

**Agent does:**

1. Applies fixes in `projects/ipd/` on PR branch
2. Runs validation commands
3. Pushes to same PR
4. Replies to review comments on GitHub
5. Writes report: `reports/pr-reviews/pr-12-report.md`

**You do:** Re-request review → repeat G2 if needed → merge when approved.

---

### Path G summary table

| Step | Skill | Who | Input | Output |
|------|-------|-----|-------|--------|
| G1 | `pre-review` | Author | branch in `projects/ipd/` | chat checklist |
| G2 | `code-review` | Reviewer | PR # | `reports/code-reviews/` |
| G3 | `pr-review` | Author | PR # | `specs/pr-reviews/` |
| G4 | `pr-review-implement` | Author | approved pr-review plan | push + `reports/pr-reviews/` |

---

## Path H — Testing

Testing is **planned in the hub**, **implemented in the clone**, like features.

Strategy doc (read once): [`docs/test/testing-strategy.md`](test/testing-strategy.md)

---

### When testing happens in the lifecycle

```text
Path A Step 5 (slice plan)     → lists tests to write in that slice
Path A Step 6 (implement)      → agent writes those tests + runs them
After slice merged (optional)  → dedicated test-plan for deeper coverage
CI in app repo                → runs on every PR automatically
```

**Minimum:** every slice plan includes tests; implement runs them.  
**Extra:** separate test-plan path for modules that need more coverage.

---

### H1 — Test plan (hub, before writing tests)

**When:** After a slice ships, or before a test-only PR, or when coverage is thin.

**Say (pick one):**

```text
test-plan ipd admissions module
test-plan-integration ipd
test-plan-contracts ipd
```

**Agent writes:**

| Skill | Output |
|-------|--------|
| `test-plan` | `specs/tests/unit/ipd/<module>.md` |
| `test-plan-integration` | `specs/tests/integration/ipd.md` |
| `test-plan-contracts` | `specs/tests/contracts/ipd.md` |

**Plan includes:** what to test, file paths, mock strategy, vitest commands, priority (HIGH/MEDIUM/LOW).

**You do:** Review plan. Add **Approval** before implement.

---

### H2 — Test implement (clone)

**When:** Test plan approved.

**Say:**

```text
test-implement specs/tests/unit/ipd/admissions.md
```

**Agent does in `projects/ipd/`:**

1. Creates branch `test/<scope>`
2. Writes Vitest tests per plan
3. Runs `pnpm test` (backend and/or frontend)
4. Opens PR (optional)
5. Writes `reports/tests/<name>-report.md`

---

### H3 — What runs automatically (CI)

In `projects/ipd/.github/workflows/ci.yml` — on every PR:

- frontend: typecheck + lint  
- backend: typecheck + lint + test  

CI is in the **app repo**, not the hub. Agent should make PRs green before merge.

---

### Testing priority (honeycomb)

| Priority | What to test |
|----------|--------------|
| HIGH | `service.ts` logic, route handlers, React components with interaction |
| HIGH | Integration: API + Postgres |
| MEDIUM | API contract shapes, form validation |
| LOW | Pure mappers, trivial helpers |
| Minimal | E2E smoke in `e2e/` — critical journeys only |

---

### Path H summary table

| Step | Skill | Output |
|------|-------|--------|
| H1a | `test-plan` | `specs/tests/unit/` |
| H1b | `test-plan-integration` | `specs/tests/integration/` |
| H1c | `test-plan-contracts` | `specs/tests/contracts/` |
| H2 | `test-implement` | tests in `projects/ipd/` + `reports/tests/` |
| — | CI | `.github/workflows/ci.yml` in app repo |

---

## Full timeline — feature + test + review

```text
1.  feature-orchestrator → PRD → TD → slices        (Path A 1–4)
2.  plan slice → spec includes test section           (Path A 5)
3.  implement slice → code + tests + PR               (Path A 6)
4.  pre-review                                        (G1)
5.  code-review                                       (G2)
6.  pr-review → pr-review-implement (if comments)     (G3–G4)
7.  merge
8.  test-plan (optional extra coverage)               (H1)
9.  test-implement (optional)                         (H2)
10. next slice → repeat
```

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
| Test plans | `specs/tests/unit|integration|contracts/` |
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
Review someone's PR? → Path G (G2)
Extra test coverage? → Path H
```

---

## Your first exercise (hub only, ~15 min)

Do Path A **Steps 1–5 only** — no implement:

```text
Run feature-orchestrator for ipd — ward bed occupancy dashboard for nurses
```

Stop after the slice plan is approved. You will have a full paper trail in `prd/` and `specs/` with zero code changes.

---

## Related docs

| Doc | When |
|-----|------|
| [ai-driven-development.md](ai-driven-development.md) | Why this model exists |
| [how-it-works.md](how-it-works.md) | Folder layout + skills list |
| [developer-guide.md](developer-guide.md) | Full skill reference |
| [architecture/STRUCTURE.md](architecture/STRUCTURE.md) | Writing architecture docs |
