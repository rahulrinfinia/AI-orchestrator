---
name: architecture-decision
description: Facilitates a new architecture decision — explores options and recommends before writing ADR. Use for stack, auth, data model, or cross-cutting choices.
---

# Architecture Decision (draft)

Output: draft in chat + optional `docs/decisions/<project>/draft-<topic>.md`

## Process

1. Context and problem
2. Constraints (HIPAA, team size, existing stack)
3. Options (≥2) with pros/cons
4. Recommendation
5. Consequences

When user approves → use **architecture-decision-record** to finalize ADR.

Do not implement code until ADR accepted for significant decisions.
