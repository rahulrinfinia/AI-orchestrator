---
name: pr-review
description: Fetches PR review comments and creates a fix plan in specs/pr-reviews/ to address feedback. Use when the user's PR received review comments, before fixing feedback, or says pr-review, address PR comments, or plan PR fixes.
---

# PR Review (plan fixes)

**Author** runs this after reviewers comment on your PR. Creates a plan — does not change code yet.

## Input

PR URL or number + project name (`flowmd`).

## Process

### 1. Fetch comments

```bash
cd backend/<name>
gh pr view <N> --json number,title,body,headRefName,reviews,comments
gh api repos/{owner}/{repo}/pulls/<N>/comments
```

### 2. Find original spec (hub)

Same as `code-review` skill: PR body, branch name, or grep `specs/`.

Read spec + `prd/<project>/technical-design.md` for defend decisions.

### 3. Categorize each comment

| Category | Meaning |
|----------|---------|
| **Fix Required** | Valid issue — change code |
| **Clarification Needed** | Ask reviewer |
| **Will Defend** | Disagree — cite spec/AD-N |
| **Already Addressed** | Fixed in later commit |

### 4. Monolith self-check (even if reviewer missed)

Grep changed files in `backend/<name>/`:

- SQL outside `service.ts`
- `snake_case` on frontend API reads
- Missing auth on new routes
- Missing tests from slice plan
- Constants inside `.tsx` files
- Functions > 50 lines in new code

Add violations as **Fix Required**.

### 5. Write plan

Save: `specs/pr-reviews/pr-<N>-<short-title>.md`

Plan includes:

- PR info table
- Comment count by category
- Original spec context (requirements, AD-N, out of scope)
- **Each comment:** quote, analysis, action, draft reply to reviewer
- Files to modify
- Step-by-step fix tasks
- Validation commands (`cd backend/<name>`, `npm test`, `tsc -b`, vitest paths)
- Defense arguments for Will Defend (reference spec path)

**STOP.** User reviews plan before `pr-review-implement`.

## User command

```text
pr-review flowmd PR #42
```

## Notes

- Be surgical — fix comments only, no scope creep
- Reference spec when defending: "Documented in specs/features/flowmd/slice-2-....md"
- Group related comments into one fix step
