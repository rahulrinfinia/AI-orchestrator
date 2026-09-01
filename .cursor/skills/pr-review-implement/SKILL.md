---
name: pr-review-implement
description: Implements fixes from an approved specs/pr-reviews/ plan, pushes to the existing PR branch, replies to reviewers, and writes reports/pr-reviews/. Use after pr-review plan is ready, or when user says implement PR review fixes.
---

# PR Review Implement

Apply `specs/pr-reviews/pr-*.md` plan. Work in `backend/<name>/`.

## Preconditions

- Plan exists at `specs/pr-reviews/pr-<N>-*.md`
- User confirmed plan (or only Fix Required items are clear)

## Steps

### 1. Load plan + original spec

Read plan and linked `specs/features/` or `specs/bugs/` spec.

### 2. Checkout PR branch

```bash
cd backend/<name>
gh pr checkout <N>
git pull
```

### 3. Implement Fix Required only

- Follow `docs/conventions/modular-monolith-fastify-react.md`
- Skip Will Defend / Clarification until response step
- Minimal diff per comment

### 4. Validate

Run commands from plan, e.g.:

```bash
# his-global-south — same as .github/workflows/ci-develop.yml
npm run lint
npx tsc -b
npm run build   # in backend/
```

### 5. Commit + push

```bash
git add .
git commit -m "fix: address PR #<N> review comments"
git push
```

No AI attribution in commit message.

### 6. Reply on GitHub

For each comment:

- **Fixed:** "Fixed in <sha>. …"
- **Will Defend:** post defense from plan (cite spec)
- **Clarification:** ask question
- **Already addressed:** point to code/commit

```bash
gh pr comment <N> --body "..."
# or reply to inline comment via gh api
```

### 7. Report (hub)

Save: `reports/pr-reviews/pr-<N>-<branch>-report.md`

Summary: fixed / defended / waiting counts, files changed, validation results.

### 8. Request re-review

Ask user if reviewer should be re-requested on GitHub.

## User command

```text
Implement specs/pr-reviews/pr-42-flowmd-slice-1.md
```

## Notes

- Do not commit to hub repo — only `backend/<name>/`
- If fix contradicts approved spec, stop and ask user
- Mark resolved threads on GitHub when done
