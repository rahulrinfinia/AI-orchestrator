# AI Orchestrator — Claude Code entry

**Default app clone:** `projects/his-global-south/`  
**Hub role:** plans, PRDs, specs, slice status — not application code (except docs).

## Before HIS implement work

1. Read `.cursor/rules/his-implement-before-code.mdc`
2. Read `.cursor/rules/his-pr-review-lessons.mdc` (PR #47 review bar)
3. Read `.cursor/rules/his-match-ci-before-done.mdc`
4. Read `.cursor/rules/no-git-without-explicit-approval.mdc`
5. Read `.cursor/rules/no-frontend-heavy-lifting.mdc` (compute/aggregate server-side, not in the frontend)
6. Architecture: [docs/architecture/his-global-south.md](docs/architecture/his-global-south.md)
7. Patterns: [docs/conventions/his-global-south-patterns.md](docs/conventions/his-global-south-patterns.md)
8. Approved slice spec under `specs/features/his-global-south/` with **Approval** filled

## Where code lives

- Implement in **`projects/his-global-south/`** only — never a parallel tree in the hub.
- Git writes (commit/push/PR) only when the user explicitly asks.

## Validation (same as CI)

| Changed | Run in clone |
|---------|----------------|
| `src/**` | `npm run lint` then `npx tsc -b` |
| `backend/**` | `npm run build` in `backend/` + relevant tests |

Vite, dev server, and unit tests alone are **not** enough before saying done.

## PR review bar (do not regress)

- Fastify **response schemas** on every route — not body-only.
- Human-readable AJV messages (Title Case, not `first_name`).
- Patient complete-registration guarded for emergency/provisional only.
- IPD UI routes: `/ipd/*` — not `/ipd/v1/*`.
- Integration mocks: org `active: true`; pagination includes `total`.

See `.cursor/rules/his-pr-review-lessons.mdc` for full checklist.

## PR review

Use hub skill **[.cursor/skills/his-pr-review/SKILL.md](.cursor/skills/his-pr-review/SKILL.md)** (Cursor + Claude Code — same rules). Checklist: [docs/templates/his-pr-review-checklist.md](docs/templates/his-pr-review-checklist.md).
