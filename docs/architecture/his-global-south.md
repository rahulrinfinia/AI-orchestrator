# his-global-south — Architecture (FlowMD + embedded IPD)

> **Hub project key:** `his-global-south` (matches `repos.yaml` → `projects/his-global-south/`)  
> **Status:** LOCKED for Phase 1 IPD (2026-08-19)  
> **Repo:** `apeiro-care/his-global-south` @ `develop`  
> **Deployment:** Case 1 — OPD + IPD in one app, one Postgres

---

## 1. Repository overview

| Layer | Path in clone |
|-------|----------------|
| Frontend | `src/` — React + Vite |
| Backend | `backend/src/` — Fastify modular monolith |
| OPD modules (frozen for IPD work) | `clinical`, `frontdesk`, `platform`, `rcm`, `pharmacy`, `orchestration`, `patient` |
| IPD module (additive) | `backend/src/modules/ipd/` |
| IPD UI | `src/pages/ipd/v1/`, `src/modules/ipd/`, `src/services/ipd-*.service.ts` |

**Code patterns:** [his-global-south-patterns.md](../conventions/his-global-south-patterns.md)  
**ADRs:** [decisions/his-global-south/](../decisions/his-global-south/)

---

## 2. System context

```text
┌─────────────────────────────────────────────────────────────────┐
│  Browser — one React app, Better Auth session cookie            │
│  OPD UI: /visits, /encounters, /beds                           │
│  IPD UI: /ipd/v1/*                                              │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  his-global-south — single Fastify app                          │
│  OPD plugins (frozen): clinical, frontdesk, platform, rcm, …    │
│  IPD plugin (new): backend/src/modules/ipd/ @ /api/v1/ipd/*     │
│  Events: in-process serverEventBus (orchestration/event-bus.ts) │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    PostgreSQL public.*
                    OPD tables unchanged + new ipd_* tables
```

---

## 3. IPD feature — naming (locked)

| Layer | Pattern | Example |
|-------|---------|---------|
| API | `/api/v1/ipd/{module}/{resource}` | `/api/v1/ipd/admissions/requests` |
| UI | `/ipd/v1/{module}/…` | `/ipd/v1/admissions` |
| DB tables | `ipd_{module}_{entity}` | `ipd_admissions_request` |
| IPD events | `ipd.{domain}.{action}` | `ipd.bed.assigned` |
| OPD events (listen only) | unchanged | `admission.advised` |

See [ADR 0009](../decisions/his-global-south/0009-ipd-naming-and-versioning.md).

---

## 4. IPD domain modules (Phase 1)

| Module | Phase 1 tracer |
|--------|----------------|
| `admissions`, `capacity`, `ward` | Yes |
| `discharge`, `config` | Later slices |
| `movement`, `orders`, … | After MVP |

**Critical constraint:** IPD is **purely additive** — do not modify OPD routes, services, or existing tables.

---

## 5. OPD frozen / IPD reuse

See sections 4–6 in prior embedded doc — unchanged rules:

- **Reuse (read-only):** auth, patients API, optional facilities read, event bus subscribe
- **Do not touch:** `visit_admissions`, `/api/platform/beds/*`, `/beds` UI, clinical emit logic
- **Additive only:** `build-app.ts` register, `modules/ipd/**`, org flag columns, `/ipd/v1` routes

---

## 6. Technology

| Layer | Choice |
|-------|--------|
| ORM | Drizzle pgschema + SQL migrations |
| Auth | Better Auth session cookie |
| Events Phase 1 | In-process `serverEventBus` |

ADRs: [0006](../decisions/his-global-south/0006-embedded-in-his-global-south.md), [0007](../decisions/his-global-south/0007-drizzle-pgschema-data-access.md), [0008](../decisions/his-global-south/0008-better-auth-session-cookie.md).

---

## 7. Org product flags (IPD)

| Column | Default |
|--------|---------|
| `organizations.opd_enabled` | `true` |
| `organizations.ipd_enabled` | `false` |

When `ipd_enabled=false`: IPD APIs → **403**; sidebar hidden.

---

## 8. Orchestrator paths (project-keyed)

| What | Path |
|------|------|
| Slice plans | `specs/features/his-global-south/ipd-slice-*.md` |
| Slice status | `prd/his-global-south/ipd/slices/status.yaml` |
| Feature PRD sources | `prd/his-global-south/ipd/design/sources.md` |
| MVP journey | `docs/journeys/his-global-south/ipd/admission-to-bed-tracer.md` |
| Open decisions | [ipd-open-decisions.md](ipd-open-decisions.md) |

---

## 9. External product docs (link only)

| Doc | Path |
|-----|------|
| HLD v2.3 | `flowMD-IPD/02-HLD/current/FLOWMD-IPD-HLD-v2.3.md` |
| LLD v2.6 | `flowMD-IPD/03-LLD/current/flowMD_IPD_LLD_v2.6.md` |

Hub index: [prd/his-global-south/ipd/design/sources.md](../../prd/his-global-south/ipd/design/sources.md).

---

## 10. Related

| Doc | Purpose |
|-----|---------|
| [flowmd-two-cases-and-plugins.md](flowmd-two-cases-and-plugins.md) | Case 1 locked |
| [his-global-south-patterns.md](../conventions/his-global-south-patterns.md) | Implement patterns |
| [services/his-global-south.md](../services/his-global-south.md) | Code discovery stub |
