---
name: write-technical-design
description: Translates an approved PRD into prd/<project>/technical-design.md with architecture decisions AD-1, endpoints, data flow, and dependency graph. Use after PRD approval and before decompose-slices.
---

# Write Technical Design

## Input

`prd/<project>/prd.md` (approved)

## Process

1. Read PRD workflows and constraints
2. Explore `projects/<name>/` if cloned; else design for modular monolith layout (src/ + backend/)
3. Make system-level decisions only — no file-level implementation plans

## Output

`prd/<project>/technical-design.md` containing:

- References to PRD
- System context diagram (mermaid)
- Architecture decisions **AD-1, AD-2, …** (what was chosen and why)
- Endpoints (method, path, request/response shape)
- Data model / migration overview
- Auth, error, compliance cross-cutting concerns
- Dependency graph and build order
- Open questions (minimize)

## Gate

Ask user **APPROVE DESIGN** before decompose-slices.
