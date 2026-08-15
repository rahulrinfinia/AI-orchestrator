---
name: test-plan
description: Creates unit and component test plan in specs/tests/unit/ for a module or slice. Use when adding test coverage, after implement, or user asks for test plan.
---

# Test Plan

Output: `specs/tests/unit/<project>/<module-or-slice>.md`

## Stack

- Backend: Vitest in `projects/<project>/backend/`
- Frontend: Vitest + Testing Library in `projects/<project>/`

Read `docs/conventions/modular-monolith-fastify-react.md`.

## Priority (Testing Honeycomb)

| Priority | Target |
|----------|--------|
| HIGH | `service.ts` business logic, route handlers |
| HIGH | React components with user interaction |
| MEDIUM | Zod schemas, form validation |
| LOW | pure mappers |

## Plan includes

- Module paths under `projects/<project>/`
- Testable functions and behaviors (not implementation details)
- Mock strategy (db pool, api client)
- Test file paths
- Cases: happy path, errors, edge cases
- Validation: exact vitest commands

Implement with **test-implement** skill.
