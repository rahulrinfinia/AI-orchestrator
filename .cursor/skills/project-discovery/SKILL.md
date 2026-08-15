---
name: project-discovery
description: Scans a cloned app in projects/ and writes docs/services/<project>.md — routes, modules, DB tables, env vars. Replaces per-microservice services command for modular monolith.
---

# Project Discovery

Output: `docs/services/<project>.md`

## Steps

1. Confirm clone exists: `projects/<project>/`
2. Scan:
   - `backend/src/routes/` or route registration
   - `backend/src/services/`, `backend/src/db/`
   - `src/` pages, features, API client
   - `package.json` scripts, env examples
3. Document:
   - Purpose of app
   - Directory map
   - API surface (method, path, auth)
   - Key DB entities
   - External integrations
   - How to run locally

Update when major modules added. Run after new project clone or on request.
