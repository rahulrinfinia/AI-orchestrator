---
name: test-plan-contracts
description: Test plan for API contract compliance — response shapes, error codes, auth. For monolith REST surface.
---

# Contract Test Plan

Output: `specs/tests/contracts/<project>.md`

## Focus

- Response JSON matches documented schemas (snake_case)
- 401/403/404/422 behavior
- Pagination/filter query params if applicable

## Implementation

Contract tests in `projects/<project>/backend/` — may use Fastify inject + schema validation.

Implement via **test-implement**.
