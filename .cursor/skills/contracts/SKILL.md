---
name: contracts
description: Documents or validates API contracts for a project. Output docs/contracts/. Use for REST shape, error codes, auth requirements.
---

# Contracts

Output: `docs/contracts/<project>/<resource>.md` or OpenAPI fragment

## Monolith conventions

- JSON wire format: **snake_case** (see conventions doc)
- Standard error envelope from Fastify error handler
- Auth: Better Auth session/cookie on protected routes

## Process

1. Read routes in `projects/<project>/backend/`
2. Document request/response schemas (reference Zod types in code)
3. Note breaking vs non-breaking changes
4. Link to slice that introduced contract

Run **drift** periodically to keep contracts current.
