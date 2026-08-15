---
name: code-review
description: Performs a rigorous code review of a pull request from a cloned project under projects/, checks against the original spec and conventions, writes reports/code-reviews/, and posts GitHub review. Use when reviewing a PR, before merge, or when the user says code-review, review PR, or paste a PR URL.
---

# Code Review

Review PRs from cloned monolith repos (`projects/<name>/`). Save report in **this hub**; PR lives in the app repo.

## Input

PR URL or number + project name (e.g. `flowmd PR #42`).

Run from hub. Use `gh` inside `projects/<name>/` (that folder is the git root).

## Process

### 1. Fetch PR

```bash
cd projects/<name>
gh pr view <N> --json number,title,body,headRefName,baseRefName,author,files
gh pr diff <N>
```

### 2. Find original spec (hub)

- PR body → `specs/features/`, `specs/bugs/`, `specs/chores/`
- Branch `feat/<project>-slice-N-*` → `specs/features/<project>/slice-N-*.md`
- `grep` in `specs/` if needed

### 3. Load context

- Original spec + `prd/<project>/technical-design.md` if relevant
- `docs/conventions/modular-monolith-fastify-react.md`
- `docs/architecture.md`, `docs/services/<project>.md`

### 4. Read full changed files

Read entire files under `projects/<name>/`, not diff only.

### 5. Checklist (every category)

| Category | Check |
|----------|--------|
| **Correctness** | Matches spec AC; edge cases; async/await; SQL correctness |
| **Security** | Auth on routes; org/patient scope; parameterized SQL; no PHI in logs |
| **Performance** | N+1 queries; missing indexes; large payloads |
| **Reliability** | Error `{ code, message }`; no silent catch on user actions |
| **Conventions** | Module layout; file size limits; API snake_case / app camelCase |
| **API design** | Zod + Fastify schemas; Swagger; backward compatible |
| **Data** | Migrations + COMMENT ON; transactions for multi-table writes |
| **Testing** | Tests for new logic; happy + error paths |
| **Scope** | Matches spec only; no creep |

### 6. Severity

| Level | Action |
|-------|--------|
| BLOCKER | Request changes — security, data loss, broken feature |
| CRITICAL | Request changes — significant bug or convention break |
| WARNING | Comment — should fix or fast follow |
| SUGGESTION | Optional |
| QUESTION | Ask author |

### 7. Output

Save: `reports/code-reviews/pr-<N>-<project>-review.md`

Include: PR info, spec link, verdict (APPROVE / REQUEST CHANGES), findings by severity, security checklist, scope vs spec.

### 8. Post on GitHub (if user asked)

```bash
cd projects/<name>
gh pr review <N> --request-changes --body "..."   # if BLOCKER/CRITICAL
gh pr review <N> --approve --body "..."           # if clean
```

Post inline comments on BLOCKER/CRITICAL lines.

## Monolith-specific checks

- SQL only in `backend/src/modules/*/service.ts`
- No `row.snake_case` in React on API data
- Migrations include `COMMENT ON`
- New routes registered in module plugin
- React Query in `features/*/api.ts`, not raw fetch in components

## Notes

- Ground findings in file:line + convention doc
- Acknowledge what was done well
- No AI attribution in GitHub comments
