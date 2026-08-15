# 0003. Path-based deploy split (frontend vs API)

Date: 2026-08-16
Status: Accepted

## Context

IPD is a modular monolith (one git repo) but frontend and API have different runtime requirements: static SPA vs Node/Fastify container.

## Decision

**One repo, two deploy artifacts**, triggered by path filters in CI:

| Path changed | Artifact | Target |
|--------------|----------|--------|
| `src/**`, root frontend config | Static SPA | CDN / Nginx |
| `backend/**` | Fastify container | API service |

Shared changes (both paths) deploy both artifacts.

## Consequences

### Positive

- Independent release cadence for UI vs API
- Matches industry monorepo practice (Vercel + Railway, S3 + ECS, etc.)
- Single PR can still ship coordinated slice

### Negative

- Must maintain API backward compatibility during frontend rollout
- CI must path-filter correctly

### Neutral

- `docker-compose.dev.yml` runs both locally
- See `.github/workflows/ci.yml` in IPD repo
