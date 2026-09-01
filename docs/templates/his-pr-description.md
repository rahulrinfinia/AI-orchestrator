# HIS Global South — PR description template

Copy into the GitHub PR body when opening a pull request for **`projects/his-global-south/`**.

---

## Summary

What changed and why (2–4 sentences).

## Hub spec / slice

- Spec path: `specs/features/his-global-south/…` or `prd/his-global-south/…/slices/slice-N.md`
- Approval: filled / pending / n/a (bugfix/chore)

## Scope

**In scope**

- …

**Out of scope (follow-up PRs)**

- …

## Modules touched

- [ ] Platform admin
- [ ] Screening
- [ ] Patient registration / frontdesk
- [ ] IPD
- [ ] Emergency triage
- [ ] Migrations / seeds
- [ ] Other: ___

## API / data changes

- New or changed endpoints (method + path):
- Migrations: yes / no — list files if yes
- New env vars: yes / no — list keys + `.env.example` updated

## Test plan

- [ ] `npm run lint` + `npx tsc -b` (frontend)
- [ ] `npm run build` in `backend/` (backend)
- [ ] Integration tests: ___ 
- [ ] Manual: ___

## Screenshots / recordings

(If UI changed)

## Risks / rollback

- …

## Checklist (author)

- [ ] Response schemas on all new/changed routes
- [ ] No secrets or credentials in diff
- [ ] Spec Approval filled (if slice work)
- [ ] `.env.example` updated for new env vars

---

*Reviewer: use [.cursor/skills/his-pr-review/SKILL.md](../../.cursor/skills/his-pr-review/SKILL.md) and [his-pr-review-checklist.md](./his-pr-review-checklist.md).*
