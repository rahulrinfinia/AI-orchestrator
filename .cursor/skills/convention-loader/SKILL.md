---
description: Loads only the coding conventions relevant to specific files before implementation. Use proactively before writing or modifying code in projects/.
---

# Convention Loader

Extract and apply **only** the conventions needed for the current work.

## When to use

- Before **implement-slice**, **bug**, or **chore** coding in `projects/<name>/`
- When touching new file types (migrations, React features, API routes)
- When user asks "what conventions apply here?"

## Input

1. Project name (e.g. `ipd`)
2. Files to create or modify (paths under `projects/<name>/`)
3. Work type: new endpoint, new component, migration, tests, etc.

## Convention sources (read selectively)

| Files touched | Read |
|---------------|------|
| `backend/**` | `docs/conventions/fastify-backend.md` |
| `src/**` | `docs/conventions/react-frontend.md` |
| API routes or client | `docs/conventions/api-design.md` |
| PHI/patient/admission domains | `docs/conventions/hipaa.md` |
| Any code | `docs/conventions/modular-monolith-fastify-react.md` (index) |
| New module or feature | `docs/conventions/his-global-south-patterns.md` (IPD) |
| Tests | `docs/test/testing-strategy.md` |
| Decisions | `docs/decisions/<project>/` — scan for Accepted ADRs |

Also read app Cursor rules in `projects/<name>/.cursor/rules/` if present.

## Output format

Return under **200 lines**:

### Applicable conventions
- Bullet list of rules that apply to this work

### File patterns
- Expected paths and naming

### Code pattern (one example)
- Closest matching example from convention docs

### Testing required
- Which test layer per testing-strategy.md

### ADR constraints
- Any Accepted ADR that blocks or guides this work

### Do NOT
- Relevant anti-patterns only

## Rules

- Read full convention files — do not invent rules
- Omit sections with no relevance
- Do not implement code — conventions only
- Prefer hub docs over memory; app `.cursor/rules/` override for project-specific items

## Integration

**implement-slice** should invoke this skill after reading the plan, before creating a branch.
