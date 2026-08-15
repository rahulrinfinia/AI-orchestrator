---
name: plan-slice
description: Creates a detailed implementation plan for one vertical slice in a cloned modular monolith. Use when planning slice implementation, after slice approval, or when user points to prd/.../slices/slice-N.md.
---

# Plan Slice

Input: `prd/<project>/slices/slice-N.md`  
Output: `specs/features/<project>/slice-N-<title>.md`

## Constraints

- Treat technical design AD-N as **immutable**.
- Verify previous slices in **actual code** under `projects/<project>/`.
- Read `docs/conventions/modular-monolith-fastify-react.md`.

## Research (mandatory)

1. Read slice + slices README + technical design.
2. Explore `projects/<project>/` — exact files, patterns, tests.
3. List reusable code; do not duplicate.

## Plan must include

- **Architecture constraints** table (AD-N → this slice)
- **Previous slices context** (what exists in code)
- **Relevant files** — modify / new / reference (paths under `projects/<project>/`)
- **Phases:** foundation (migrations) → backend → frontend → integration
- **Step-by-step tasks** (ordered, exact files)
- **Testing strategy** — unit, integration, regression for prior slices
- **Validation commands** — `eslint`, `tsc`, vitest paths for monolith
- **Acceptance criteria** table with validation method
- **Approval block** from `docs/templates/approval.md` (empty checkboxes)

## Layout reminders

| Layer | Path |
|-------|------|
| API | `backend/src/modules/<domain>/` |
| SQL | `backend/src/db/migrations/` + COMMENT ON |
| UI | `src/features/<domain>/` |
| API client | `src/integrations/api/client.ts` (casing) |

**STOP.** Do not implement until user fills approval section.
