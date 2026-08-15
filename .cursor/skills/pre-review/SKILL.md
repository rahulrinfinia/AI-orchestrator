---
name: pre-review
description: Self-review before opening PR — lint, types, tests, conventions, security checklist. Use after implement-slice before code-review skill.
---

# Pre-Review (self)

Run in `projects/<project>/` on current branch.

## Checklist

- [ ] `pnpm lint` / `pnpm typecheck` clean
- [ ] Tests for changed behavior pass
- [ ] No secrets, console.log debug, or commented-out code
- [ ] Matches `docs/conventions/modular-monolith-fastify-react.md`
- [ ] API snake_case on wire; no `any` without comment
- [ ] Migrations reversible or noted
- [ ] PR description: what, why, how to test

Output brief pass/fail in chat. Fix failures before **code-review** or opening PR.
