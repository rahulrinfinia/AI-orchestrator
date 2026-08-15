# 0002. Better Auth with session cookies

Date: 2026-08-16
Status: Accepted

## Context

IPD staff access PHI through a browser SPA. We need secure authentication compatible with Fastify + React, HIPAA-aware session handling, and role-based authorization.

## Decision

Use **Better Auth** with **httpOnly session cookies** (not JWT in localStorage).

- Auth plugin in `backend/src/plugins/auth.ts`
- Session validated on protected routes via `preHandler: [app.authenticate]`
- RBAC roles stored in Postgres, checked per endpoint
- Frontend never stores tokens in localStorage

## Consequences

### Positive

- Industry-aligned SPA auth pattern
- httpOnly cookies reduce XSS token theft risk
- Better Auth integrates with Fastify and Postgres

### Negative

- CSRF protection required for cookie-based auth (Better Auth handles per config)
- Mobile/native clients need separate strategy if added later

### Neutral

- Implement in dedicated auth slice (tracer bullet or slice 2)
- Public routes explicitly whitelisted (`/api/health`, auth endpoints)
