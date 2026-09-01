---
name: his-pr-review
description: Reviews pull requests for his-global-south (flowMD) against hub Cursor rules, CLAUDE.md, AGENTS.md, HIS-CODING-RULES-COMPLETE, and PR #47 bar. Use when reviewing a PR, before merge, code-review, his PR review, or when the user pastes a PR URL for projects/his-global-south.
---

# HIS Global South — PR Review

Review PRs in **`projects/his-global-south/`** (app clone). Hub holds specs/reports; the PR branch lives in the clone’s git remote.

## Applies to (Cursor + Claude Code)

Same rules — no separate Claude rulebook:

| Tool | Entry | Rules source |
|------|-------|--------------|
| **Cursor** | [AGENTS.md](../../../AGENTS.md) | `.cursor/rules/*.mdc` (5 files) |
| **Claude Code** | [CLAUDE.md](../../../CLAUDE.md) | Same `.cursor/rules/*.mdc` |
| **Both** | This skill | Workflow + checklist below |
| **Handbook** | [HIS-CODING-RULES-COMPLETE.md](../../../docs/conventions/HIS-CODING-RULES-COMPLETE.md) | Parts B–L (coding); Part P (agent entry) |

**Author PR template:** [docs/templates/his-pr-description.md](../../../docs/templates/his-pr-description.md)

**In-repo copy (his-global-south app):** `docs/conventions/pr-review/` — keep in sync when sharing with the project docs repo.

**Maintainers:** When `.cursor/rules/his-*.mdc` or handbook changes, update this skill, the checklist, the author template, and the in-repo copy under `projects/his-global-south/docs/conventions/pr-review/`.

---

## 0. Review intake (fill first)

Record in the report before reviewing:

| Field | Value |
|-------|-------|
| PR # / URL | |
| Base branch | `develop` (default) / other: ___ |
| Head branch / commit | |
| **Review depth** | `full` / `targeted` / `routes-only` |
| **Files changed** | count from `git diff --stat` |
| **Modules touched** | platform, screening, frontdesk, ipd, clinical, … |
| **Hub spec(s)** | path(s) |
| **Spec Approval filled?** | yes / no / n/a |
| **Clean tree for CI?** | yes / no (stash untracked WIP first) |
| **PR description complete?** | uses [his-pr-description.md](../../../docs/templates/his-pr-description.md) — yes / partial / missing → **QUESTION** |

**Large PR gate:** if **>80 files** changed → default depth `targeted`; report must include **Review coverage** and **Out of scope** sections. Recommend split if >150 files unless release merge.

---

## Input

- PR URL or number (e.g. `his-global-south PR #47`)
- Optional: slice spec path in hub (`specs/features/his-global-south/`, `prd/his-global-south/`)
- Optional: review depth override (`full`, `targeted`, `routes-only`)

---

## Workflow

### 1. Fetch PR (in clone)

```bash
cd projects/his-global-south
gh pr view <N> --json number,title,body,headRefName,baseRefName,author,files
gh pr diff <N>
```

**If `gh` unavailable:**

```bash
git fetch origin pull/<N>/head:pr-<N>
git log develop..pr-<N> --oneline
git diff develop...pr-<N> --stat
```

### 2. Route response-schema audit (changed `*.routes.ts` only)

Run on PR branch. Any file listed = **CRITICAL** until each route has `schema.response` for success + errors.

**PowerShell (Windows):**

```powershell
cd projects/his-global-south
$base = "develop"
$pr = "pr-<N>"
git diff "${base}...${pr}" --name-only -- "backend/**/*.routes.ts" | ForEach-Object {
  $c = git show "${pr}:$_" 2>$null
  if ($c -notmatch "response:") { Write-Output "MISSING response: $_" }
}
```

**Bash:**

```bash
git diff develop...pr-<N> --name-only -- 'backend/**/*.routes.ts' | while read -r f; do
  git show "pr-<N>:$f" | rg -q "response:" || echo "MISSING response: $f"
done
```

Also read each changed `*.routes.ts` fully — grep misses per-route gaps inside a file that has some responses.

### 3. Find spec (hub)

- PR body → `specs/features/`, `specs/bugs/`, `prd/his-global-south/`
- Branch `feat/*-slice-N-*` → matching slice spec
- Grep hub `specs/` if unclear

Read spec acceptance criteria before judging correctness.

**Spec gate:** If the PR implements a slice/feature, the hub spec must have **Approval** filled. Missing or draft spec → **WARNING** minimum (CRITICAL if large unapproved scope).

### 4. Review depth tiers

| PR size | Depth | Required work |
|---------|-------|----------------|
| **Small** (<20 files) | `full` | All changed files + CI + greps + module checks |
| **Medium** (20–80) | `targeted` | All `*.routes.ts`, `*.schema.ts`, `*.service.ts`, migrations, + spot-check UI |
| **Large** (>80) | `targeted` | Per-module pass; **must** document reviewed vs not reviewed |

`routes-only`: steps 1–2 + route/schema files only — use for hotfix or follow-up review.

### 5. Load rules (read what the PR touches)

Use `convention-loader` skill paths when touching unfamiliar modules.

| Area | Read |
|------|------|
| Always (all 5 `.mdc`) | `his-implement-before-code.mdc`, `his-pr-review-lessons.mdc`, `his-match-ci-before-done.mdc`, `no-git-without-explicit-approval.mdc`, `no-frontend-heavy-lifting.mdc` |
| Architecture | `docs/architecture/his-global-south.md` |
| Patterns | `docs/conventions/his-global-south-patterns.md`, `docs/conventions/his-global-south-coding-context.md` |
| Frontend | `docs/conventions/react-frontend.md`, `docs/conventions/modular-monolith-fastify-react.md` |
| Backend | `docs/conventions/fastify-backend.md`, `docs/conventions/api-design.md` |
| Security / PHI | `docs/conventions/security.md`, `docs/conventions/hipaa.md`, [ADR 0004](../../../docs/decisions/his-global-south/0004-audit-logging-for-phi-access.md) when PHI routes change |

### 6. Module-specific checks (if PR touches module)

Apply only relevant rows:

| Module | Extra checks |
|--------|----------------|
| **Platform org** | `assertPlatformAdmin` on admin routes; `platform_admin` not in role PUT schema; hospital-setup rate limit; invite token never logged; response schemas on all org routes |
| **Screening** | `profile.id` not Better Auth `user.id` for UUID FKs; platform_admin on write paths; response schemas on definitions + assignments; standard error envelope |
| **Patient / frontdesk** | Identity profile from DB; emergency vs complete-registration; registration AJV Title Case; response schemas (reference pattern) |
| **IPD** | UI `/ipd/*` not `/ipd/v1/*`; API `/api/v1/ipd/*`; admissions response schemas |
| **Emergency triage** | Immutable triage record; priority computed server-side; list API exposes queue fields (`triaged_at`, etc.) |
| **Migrations / seeds** | `COMMENT ON`; no duplicate migration numbers; seeds idempotent; new env vars in `.env.example` / README |

### 7. Read changed files

Read **entire files** under `projects/his-global-south/` for the chosen review depth — not diff-only.

### 8. CI gates — clean tree required

**Untracked local files can break `tsc -b` and invalidate review.** Before CI:

```bash
cd projects/his-global-south
git status   # no unrelated untracked src/ files on PR branch
git stash push -u -m "pre-review"   # if needed
git checkout <pr-branch>
```

| Changed | Command | Fail = CRITICAL |
|---------|---------|-----------------|
| `src/**` | `npm run lint` then `npx tsc -b` | Any TS error |
| `backend/**` | `npm run build` in `backend/` | Backend tsc errors |
| Routes / schemas | Relevant integration tests | 403/500/schema serialization |

When `gh` available: `gh pr checks <N>` — note pass/fail in report.

Restore branch after review: `git checkout -` and `git stash pop` if stashed.

**Do not approve** if author only verified Vite/dev — CI uses `tsc -b`.

### 9. Quick greps (clone root)

**Greps are hints only** — confirm each hit manually. Exclude `*.constants.ts` / `*constants*.ts` for literal searches. `.reduce(` has many legitimate uses.

```bash
cd projects/his-global-south

# Response schemas present (manual: every new route)
rg "schema:" backend --glob "*.routes.ts"
rg "response:" backend --glob "*.routes.ts"

# Bad AJV labels
rg "errorMessage.*_" backend --glob "*.schema.ts"

# Snake_case in React on API data (exclude client.ts transforms)
rg "patient_id|first_name|encounter_type|triage_status" src --glob "*.{tsx,ts}"

# Registration guards
rg "complete-registration|identity!" backend

# Legacy IPD UI paths
rg "'/ipd/v1" src

# Client-side aggregates (heavy lifting) — review each hit
rg "\.filter\([^)]+\)\.length" src --glob "*.{tsx,ts}"

# Hardcoded domain literals (exclude *constants* files manually)
rg "'open'|'walk_in'|'all'" src --glob "*.{tsx,ts}" --glob "!*constants*"
```

---

## Mandatory review checklist

Use this on every PR. Details and examples → [his-pr-review-checklist.md](../../../docs/templates/his-pr-review-checklist.md).

### A. PR #47 bar (BLOCKER/CRITICAL if violated)

- [ ] Every route: `schema.response` for **success and every error status** returned
- [ ] Response schemas in `*.schema.ts`, wired in `*.routes.ts` — not body-only
- [ ] New response fields added to schemas (or integration tests fail serialization)
- [ ] AJV `errorMessage`: **Title Case** (`First Name`) — not `first_name`
- [ ] Schema message tests updated when strings change
- [ ] `complete-registration` only for `registration_mode = emergency` → else `422` `COMPLETION_NOT_PROVISIONAL`
- [ ] Identity profile from DB — no static `config/identity-profiles/*.json`
- [ ] `validateIdentityForWrite`: `identity?.` not `identity!`
- [ ] IPD UI: `/ipd/*` — not `/ipd/v1/*` (unless product explicitly asked)
- [ ] Integration mocks: org `active: true`; pagination includes `total`
- [ ] Barrel tests: **60s** timeout for `@/modules/*` in full suite

### B. Constants, types, wire format

- [ ] Backend literals in `*.constants.ts` + `*_VALUES`; frontend mirrors in `src/<mod>/constants/`
- [ ] No hardcoded closed-set strings in service/schema/UI/queryKeys
- [ ] No raw string compares — use `FOO.BAR` / `isX()`
- [ ] Types in `*.types.ts` — not exported from components/services
- [ ] No `Record<string, unknown>` for API DTOs
- [ ] Mapping in `*.mapping.ts`; narrow DB strings with `toX()`
- [ ] Frontend camelCase; wire snake_case; transform **only** in `src/integrations/api/client.ts`
- [ ] After union changes: no `.toLowerCase()`, `?? ''`, untyped `useState('literal')`

### C. Backend

- [ ] SQL and business logic in `*.service.ts` only
- [ ] Handlers thin: validate → service → respond
- [ ] Auth + org scope on non-public routes (`withOrgAuth`)
- [ ] Enums from `*_VALUES`; UUID params `format: uuid`
- [ ] Drizzle CHECKs from constants; no `${value}` inside `` sql`CHECK` ``
- [ ] Multi-table writes in transactions
- [ ] Migrations include `COMMENT ON`
- [ ] Structured errors `{ error: { code, message, details? } }` — not bare `{ code, message }` or `{ error: 'string' }`
- [ ] Paginated lists: `items`, `page`, `page_size`, `total`, `total_pages`
- [ ] No PHI in logs

### D. Frontend

- [ ] HTTP only via `src/integrations/api/client.ts`
- [ ] Pages thin; data in hooks; React Query for server state
- [ ] **Counts/aggregates/derived fields computed server-side** — not `.filter().length` on full lists
- [ ] List filter sentinels (e.g. `all`) sent to API when backend treats missing as default
- [ ] IPD layout: `src/ipd/` portable root; shared controls in `src/components/<mod>/`

### E. Security, scope, product guards

- [ ] Matches approved slice/PRD with **Approval** filled — no scope creep
- [ ] IPD-only PR does not modify OPD (except additive shared constants)
- [ ] `platform_admin` not grantable from Org setup UI or `PUT /api/platform/users/:id/roles`
- [ ] Pure `platform_admin` users see **Platform nav only** (Hospitals, Screening) unless they also have `super_admin` or org admin access
- [ ] New/changed PHI read routes: audit logging per [ADR 0004](../../../docs/decisions/his-global-south/0004-audit-logging-for-phi-access.md)
- [ ] No passwords/API keys in constants — use env (see `config/env.ts`)
- [ ] `.env.example` / runbook updated for new env vars
- [ ] Public routes (e.g. hospital-setup) have rate limits
- [ ] Queries scoped by org/patient — no IDOR
- [ ] Seed/smoke scripts do not print credentials
- [ ] No secrets in diff

### F. File size limits (Part K)

| File | Max lines |
|------|-----------|
| Page | 100 |
| Feature component | 200 |
| `routes.ts` | 150 |
| `service.ts` | 400 |
| Function | 50 |

Large new files → **WARNING** or split recommendation.

### G. Testing

- [ ] New logic has happy + error path tests
- [ ] Integration tests when routes/schemas/mocks change

---

## Severity rubric

| Level | Meaning | GitHub action |
|-------|---------|---------------|
| **BLOCKER** | Security, data loss, broken feature, missing auth | Request changes + inline comment |
| **CRITICAL** | Significant bug, missing response schemas, CI would fail, convention break | Request changes |
| **WARNING** | Should fix or fast follow | Comment |
| **SUGGESTION** | Optional | Comment |
| **QUESTION** | Unclear intent | Comment |

**Approve** only when no open BLOCKER or CRITICAL items.

Ground every finding: `path:line` + rule source (e.g. “PR #47 bar — response schemas”).

Acknowledge what was done well.

---

## Output

Save report in hub:

```text
reports/code-reviews/pr-<N>-his-global-south-review.md
```

### Report template

```markdown
# PR Review — his-global-south #<N>

| Field | Value |
|-------|-------|
| **Title** | … |
| **Author** | … |
| **Branch** | … → … |
| **Spec** | link or path |
| **Verdict** | APPROVE / REQUEST CHANGES |
| **Review depth** | full / targeted / routes-only |
| **Files changed** | N |
| **CI checked** | lint + tsc -b / backend build / tests / gh checks — pass/fail/not run |

## Review coverage

| Area | Depth | Notes |
|------|-------|-------|
| Backend routes/schemas | full / partial / none | |
| Services / migrations | | |
| Frontend | | |
| Tests | | |

## Out of scope (not reviewed)

- …

## Spec traceability

| Spec / AC | Met? | Evidence |
|-----------|------|----------|
| | | |

## CI evidence

| Command | Result | Notes |
|---------|--------|-------|
| `npm run lint` | | |
| `npx tsc -b` | | |
| `backend` `npm run build` | | |

## Summary
2–4 sentences.

## What went well
- …

## Findings

### BLOCKER
- `path:line` — issue — rule reference

### CRITICAL
…

### WARNING
…

### SUGGESTION / QUESTION
…

## Checklist snapshot
- [ ] Response schemas on all new/changed routes
- [ ] CI gates (tsc -b / backend build)
- [ ] Scope matches spec
- [ ] No frontend heavy lifting on domain data

## Recommended author actions
1. …
```

---

## Post on GitHub (only if user asked)

Report lives in the **hub** repo, not the clone:

```text
<hub-root>/reports/code-reviews/pr-<N>-his-global-south-review.md
```

```bash
cd projects/his-global-south
# From hub root (adjust HUB to your ai-orchestrator-workspace path):
gh pr review <N> --request-changes --body-file "<hub-root>/reports/code-reviews/pr-<N>-his-global-south-review.md"
# or
gh pr review <N> --approve --body "…"
```

Inline comments on BLOCKER/CRITICAL lines. No AI attribution in GitHub text.

---

## Do not

- Commit, push, or merge unless user explicitly asks
- Approve on diff-only skim — read full files
- Approve without response schemas on new routes
- Treat Vitest/dev server as substitute for `npx tsc -b`

---

## Related skills

| Skill | When |
|-------|------|
| `pre-review` | Author self-check before opening PR — use [his-pr-description.md](../../../docs/templates/his-pr-description.md) |
| `his-pr-review` | Re-run after author fixes REQUEST CHANGES |
| `pr-review` | Plan fixes from reviewer comments (author) |
| `pr-review-implement` | Implement approved fix plan |
| `code-review` | Generic monolith review (non-HIS projects) |

For **his-global-south**, prefer **this skill** over generic `code-review`.
