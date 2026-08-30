# HIS Global South — PR Review Checklist

Shareable checklist for reviewing pull requests in **`projects/his-global-south/`** (flowMD app clone).  
Consolidated from hub Cursor rules, Claude/Cursor agent docs, and convention docs — **2026-08-28**.

**Default clone path:** `projects/his-global-south/`  
**Hub repo:** `ai-orchestrator-workspace` (plans/specs only; app code lives in the clone)

**Agent skill (Cursor + Claude Code):** [.cursor/skills/his-pr-review/SKILL.md](../../.cursor/skills/his-pr-review/SKILL.md)

---

## Applies to

| Tool | Entry doc | Rules |
|------|-----------|-------|
| Cursor | `AGENTS.md` | `.cursor/rules/*.mdc` (5 files) |
| Claude Code | `CLAUDE.md` | Same `.cursor/rules/*.mdc` |
| Handbook | `docs/conventions/HIS-CODING-RULES-COMPLETE.md` | Parts B–L |

**Author PR template:** [his-pr-description.md](./his-pr-description.md)

---

## 0. Review intake (reviewer — fill first)

| Field | Value |
|-------|-------|
| PR # / URL | |
| Base branch | `develop` / other |
| Review depth | `full` / `targeted` / `routes-only` |
| Files changed | count |
| Modules touched | platform, screening, frontdesk, ipd, triage, … |
| Hub spec(s) + Approval | path; yes / no / n/a |
| Clean tree for CI | stash untracked WIP before `tsc -b` |
| PR description | uses [his-pr-description.md](./his-pr-description.md) |

**Large PR (>80 files):** default `targeted`; report must include **Review coverage**, **Out of scope**, **Spec traceability**, **CI evidence**.

---

## 0.1 Route response-schema audit

On PR branch — changed `backend/**/*.routes.ts` without `response:` → **CRITICAL** until verified per route.

**PowerShell:**

```powershell
cd projects/his-global-south
git diff develop...pr-<N> --name-only -- "backend/**/*.routes.ts" | ForEach-Object {
  $c = git show "pr-<N>:$_" 2>$null
  if ($c -notmatch "response:") { Write-Output "MISSING response: $_" }
}
```

Read each changed routes file fully — file-level grep is not enough.

---

## 0.2 Review depth tiers

| PR size | Depth | Work |
|---------|-------|------|
| <20 files | `full` | All changed files + CI + greps + module checks |
| 20–80 | `targeted` | routes, schemas, services, migrations + UI spot-check |
| >80 | `targeted` | Per-module pass; document reviewed vs skipped |

`routes-only`: intake + route/schema files only.

---

## 0.3 Module-specific checks

| Module | Extra checks |
|--------|----------------|
| **Platform org** | `assertPlatformAdmin`; no `platform_admin` in role PUT; rate limits on public setup; invite tokens not logged; response schemas |
| **Screening** | `profile.id` for UUID FKs; platform_admin on writes; definitions + assignments response schemas |
| **Patient / frontdesk** | DB identity profile; complete-registration guard; AJV Title Case |
| **IPD** | UI `/ipd/*`; API `/api/v1/ipd/*`; admissions response schemas |
| **Emergency triage** | Immutable triage record; server-side priority; queue list fields |
| **Migrations / seeds** | `COMMENT ON`; idempotent seeds; env vars in `.env.example` |

---

## Source references (for maintainers)

When `.cursor/rules/his-*.mdc` change, update **this checklist**, **his-pr-review skill**, and **HIS-CODING-RULES-COMPLETE** together.

| Document | Path |
|----------|------|
| **PR review skill** | `.cursor/skills/his-pr-review/SKILL.md` |
| **Author PR template** | `docs/templates/his-pr-description.md` |
| PR #47 review bar | `.cursor/rules/his-pr-review-lessons.mdc` |
| Implement patterns | `.cursor/rules/his-implement-before-code.mdc` |
| CI gates | `.cursor/rules/his-match-ci-before-done.mdc` |
| Frontend heavy lifting | `.cursor/rules/no-frontend-heavy-lifting.mdc` |
| Git approval | `.cursor/rules/no-git-without-explicit-approval.mdc` |
| Rule handbook | `docs/conventions/HIS-CODING-RULES-COMPLETE.md` |
| Coding context | `docs/conventions/his-global-south-coding-context.md` |
| Pre-review skill | `.cursor/skills/pre-review/SKILL.md` |
| Generic code-review | `.cursor/skills/code-review/SKILL.md` (non-HIS projects) |
| API design | `docs/conventions/api-design.md` |
| Fastify backend | `docs/conventions/fastify-backend.md` |
| React frontend | `docs/conventions/react-frontend.md` |
| Security | `docs/conventions/security.md` |
| PHI audit ADR | `docs/decisions/his-global-south/0004-audit-logging-for-phi-access.md` |
| HIS patterns | `docs/conventions/his-global-south-patterns.md` |

---

## 1. Pre-merge gates (must be green)

**Clean checkout:** unrelated untracked files under `src/` can fail `tsc -b`. Stash WIP, checkout PR branch, run CI, restore after review.

```bash
cd projects/his-global-south
git status
git stash push -u -m "pre-review"   # if needed
git checkout <pr-branch>
```

Run in **`projects/his-global-south/`** before approving:

| You changed | Must run | Fail = do not merge |
|-------------|----------|---------------------|
| `src/**` | `npm run lint` then `npx tsc -b` | Any `TS2322` / `TS2345` / `TS2300` |
| `backend/**` | `npm run build` (from `backend/`) | Backend TypeScript errors |
| Routes / schemas / DB mocks | Relevant integration tests | Schema serialization / 403 / 500 failures |

**Do not accept:**

- “It works in Vite / dev server” without full `npx tsc -b`
- Unit tests only after tightening unions (`Gender`, document types, `*_VALUES`)

**After changing constants or unions**, grep call sites for:

- `.toLowerCase()` on typed unions
- `?? ''` widening to `string`
- `z.string()` where a union is required
- Untyped `useState('literal')`

Narrow with `toX()` helpers in `*.mapping.ts` — do not pass raw `string` into `setValue` or API payloads.

---

## 2. PR #47 bar — do not repeat

These came from PR #47 review fixes and regressions on `feat/platform-admin-hospitals`.

### 2.1 Fastify response schemas (required)

- [ ] Every route defines `schema.response` for **success and every error status** the handler returns
- [ ] Response schemas live in `*.schema.ts` and are wired in `*.routes.ts` — **not body-only validation**
- [ ] New handler fields (e.g. `identification_number`, `eccif_coverage`) are added to response schemas too, or integration tests fail on serialization

### 2.2 AJV human-readable messages

- [ ] Custom `errorMessage` strings use **Title Case labels**, not snake_case keys
- **Good:** `First Name`, `Estimated Age (years)`, `Identification Number cannot be blank when provided`
- **Bad:** `first_name`, `identifier_type`, `birth_date`
- [ ] Update `__tests__/*schema.test.ts` when message strings change

### 2.3 Patient registration business rules

- [ ] `POST .../complete-registration` **only** for provisional patients (`registration_mode = emergency`); others → `422` + `COMPLETION_NOT_PROVISIONAL`
- [ ] `validateIdentityForWrite`: identity optional when **both** type and number are blank; use `identity?.` not `identity!`
- [ ] Document types and nationality from **org identity profile (DB)** — no static `config/identity-profiles/*.json`
- [ ] Emergency create and complete-registration are separate flows; completion promotes provisional → full

### 2.4 IPD UI routes

- [ ] New screens: `/ipd`, `/ipd/admission`, … — **not** `/ipd/v1/*`
- [ ] API unchanged: `/api/v1/ipd/…`
- [ ] Do not re-add `/ipd/v1` legacy redirects unless product explicitly asks

### 2.5 Integration test mocks

When routes use response schemas + org auth:

- [ ] Mock org rows include `active: true` (and `opd_enabled` / `ipd_enabled` as needed), or `rejectSuspendedHospital` returns **403**
- [ ] List/pagination mocks include `total` and correct page shape, or response schema validation returns **500**

### 2.6 Frontend test stability

- [ ] Barrel import tests (`moduleExports`, `moduleBoundaries`): use **60s timeout** when importing `@/modules/*` registries in the full suite

---

## 2a. PR #50 bar — do not repeat

### 2a.1 Module structure

- [ ] No separate top-level "portable root" split (e.g. `src/ipd/` + thin `src/modules/ipd/index.ts` re-export) — implementation lives directly in `src/modules/<name>/`, matching `mch`
- [ ] One `<name>.constants.ts`, one `<name>.types.ts` per module — not split into `constants/index.ts` + `constants/<feature>.ts` for no reason
- [ ] `<name>.constants.ts` and `<name>.types.ts` do not import from each other in both directions — one is a pure leaf, the other imports from it one-directionally

### 2a.2 Route registration

- [ ] No hardcoded API base path repeated on every route in `*.routes.ts` — build from a `<MODULE>_API_BASE` constant
- [ ] No inline handlers in `*.routes.ts`, including trivial ones (e.g. `/health`) — delegate to `*.controller.ts`

### 2a.3 Service file naming

- [ ] A concern split out of a module's service is named `<concern>.service.ts` (module prefix dropped, e.g. `invite.service.ts`) — not `<module>.<concern>.ts` (e.g. `org.invite.ts`)

### 2a.4 Constants — dedup across files

- [ ] Before assuming a hardcoded string doesn't need a constant, grep the literal **repo-wide** — the same string duplicated across multiple files is the same bug as duplicating it within one file

### 2a.5 Integration test DB mocks — default row completeness

- [ ] A table's **default** (non-overridden) mock row includes every field any real call site destructures from it — a missing field silently becomes `undefined`/`NaN` instead of failing loudly, and can pass every test that overrides the mock while still 500ing for anyone who doesn't
- [ ] When one code path issues several differently-shaped queries against the same table in sequence, use a per-table queued override rather than one static row shape

### 2a.6 AJV messages — don't break existing message-content assertions

- [ ] Grep for tests asserting on the *old* `errorMessage` content before rewriting it — e.g. a `format: uuid` field's message should still contain "UUID" if a test keys off that word

---

## 3. Constants, types, and naming

### 3.1 Constants (one source of truth)

- [ ] Backend domain literals in `backend/src/modules/<mod>/<feature>/<feature>.constants.ts` as `const` objects **and** `*_VALUES` arrays
- [ ] Frontend mirrors in `src/<mod>/constants/<feature>.ts` (paths-only in `src/<mod>/constants/index.ts`)
- [ ] Do **not** put `constants.ts` inside every feature/page folder
- [ ] No hardcoded closed-set strings in service / schema / pgschema / UI / `queryKeys` (e.g. `'open'`, `'walk_in'`, `'all'`, `'age'`, `'date'`, `'definite'`)
- [ ] No raw string compares on closed sets — use `FOO.BAR` / `isX()` helpers from constants
- [ ] Do not dump module literals into `backend/src/config/` or `src/lib/`

### 3.2 Types

- [ ] Unions from constants: `(typeof FOO)[keyof typeof FOO]` — not loose `string`
- [ ] Types in `*.types.ts` / `src/<mod>/types/` — **never export types from a component or service file**
- [ ] No `Record<string, unknown>` for request/response DTOs or API bodies
- [ ] Mapping in `*.mapping.ts`; narrow DB `string` with `toX()` before use; do not re-export mapping from service

### 3.3 Wire format

- [ ] Frontend TypeScript = **camelCase**
- [ ] JSON on the wire + backend = **snake_case**
- [ ] Case conversion **only** in `src/integrations/api/client.ts`
- [ ] No `row.snake_case` property reads in React on API data

---

## 4. API and Drizzle (backend)

- [ ] Fastify `schema` on **body, querystring, params, and response**
- [ ] UUID path params: `format: uuid`
- [ ] Enums from `*_VALUES`; `additionalProperties: false` where applicable
- [ ] Drizzle defaults and CHECK constraints from constants
- [ ] CHECK via `sql.raw` / `textInArrayCheck` — never `${value}` inside `` sql`...` `` (becomes a bind param; Postgres rejects it)
- [ ] Selects use `getTableColumns(table)`; joined rows typed with `InferSelectModel`
- [ ] SQL and business logic in `*.service.ts` only — not in routes/controllers
- [ ] Handlers thin: parse, call service, map response
- [ ] Multi-table writes in a transaction
- [ ] Migrations include `COMMENT ON` for new columns/tables
- [ ] New routes registered in the module plugin / `build-app.ts`

### Error envelope

Non-2xx responses should follow:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Human-readable summary safe for UI",
    "details": []
  }
}
```

Common codes: `validation_error` (422), `unauthorized` (401), `forbidden` (403), `not_found` (404), `conflict` (409).

### Paginated lists

```json
{
  "items": [],
  "page": 1,
  "page_size": 20,
  "total": 142,
  "total_pages": 8
}
```

---

## 5. Frontend structure

- [ ] All HTTP via `src/integrations/api/client.ts` — no raw `fetch` in components
- [ ] Server state via React Query; UI-only state local
- [ ] Pages thin; data fetching and mutations in hooks
- [ ] Shared reusable controls in `src/components/<mod>/`
- [ ] Feature modules self-contained under `src/modules/<mod>/` — no separate top-level "portable root" split (e.g. `src/ipd/`); reference shape is `mch`
- [ ] List filter sentinel values (e.g. `all`) are **sent** to the API when the service treats missing params as a default

---

## 6. Security and PHI

- [ ] Auth on all non-public routes (Better Auth + org scope)
- [ ] Role/permission checks on mutations
- [ ] SQL parameterized — no string concatenation
- [ ] No PHI in logs or error messages
- [ ] No secrets in the PR — passwords/keys via env (`config/env.ts`), not constants
- [ ] `.env.example` / runbook updated for new env vars
- [ ] Public routes (e.g. hospital-setup) have rate limits
- [ ] Queries scoped by org/patient — no IDOR
- [ ] Seed/smoke scripts do not print credentials
- [ ] Minimum necessary data in API responses
- [ ] Audit logging for PHI access where required — [ADR 0004](../decisions/his-global-south/0004-audit-logging-for-phi-access.md), `docs/conventions/hipaa.md`

---

## 7. Scope and product guards

- [ ] Changes match the approved slice spec / PRD — no scope creep
- [ ] IPD-only work does not modify OPD modules (except shared additive constants, e.g. extending `ADMISSION_TYPE`)
- [ ] `platform_admin` is **not** grantable from hospital Org setup UI or `PUT /api/platform/users/:id/roles`
- [ ] Pure `platform_admin` users should see **Platform** nav only (Hospitals, Screening) — not the full hospital sidebar (unless they also have `super_admin` or org admin access)
- [ ] Hub slice spec has **Approval** filled when PR implements a spec-backed feature

---

## 7.1 File size limits (Part K)

| File | Max lines |
|------|-----------|
| Page | 100 |
| Feature component | 200 |
| `routes.ts` | 150 |
| `service.ts` | 400 |
| Function | 50 |

---

## 8. Full review categories

Use these when reading the PR (read **full changed files**, not diff-only):

| Category | Check |
|----------|--------|
| **Correctness** | Matches spec acceptance criteria; edge cases; async/await; SQL correctness |
| **Security** | Auth; org/patient scope; parameterized SQL; no PHI leakage |
| **Performance** | N+1 queries; missing indexes; oversized payloads |
| **Reliability** | Structured errors; no silent catch on user-facing actions |
| **Conventions** | Module layout; file size; naming |
| **API design** | Schemas; backward compatibility |
| **Data** | Migrations; transactions |
| **Testing** | Happy path + error paths for new logic |
| **Scope** | Spec-only changes |

---

## 9. Severity rubric

| Level | Review action |
|-------|----------------|
| **BLOCKER** | Request changes — security, data loss, broken feature |
| **CRITICAL** | Request changes — significant bug or convention break (e.g. missing response schemas) |
| **WARNING** | Comment — should fix or fast follow |
| **SUGGESTION** | Optional improvement |
| **QUESTION** | Ask the author |

**Approve** only when there are no open BLOCKER or CRITICAL items.

---

## 9.1 Review report sections (large PRs)

Save to `reports/code-reviews/pr-<N>-his-global-south-review.md`. Include:

- **Review coverage** — table of areas + depth (full / partial / none)
- **Out of scope** — what was not reviewed
- **Spec traceability** — AC vs met / evidence
- **CI evidence** — lint, `tsc -b`, backend build, test results

See report template in `.cursor/skills/his-pr-review/SKILL.md`.

---

## 10. Quick grep before approve

Run from `projects/his-global-south/`:

```bash
# Routes missing response schemas (manual review still required)
rg "schema:\s*\{" backend --glob "*.routes.ts"
rg "response:" backend --glob "*.routes.ts"

# Snake_case AJV labels (bad)
rg "errorMessage.*_" backend --glob "*.schema.ts"

# Raw wire keys in UI (bad)
rg "patient_id|first_name|encounter_type" src --glob "*.tsx"

# Registration guard
rg "complete-registration" backend

# Legacy IPD UI paths (bad unless product asked)
rg "'/ipd/v1" src

# Unsafe identity assertion (bad)
rg "identity!" backend
```

---

## 11. Review workflow

1. **Intake** — fill §0 table; pick review depth (§0.2)
2. Fetch PR: `gh pr view <N>`, `gh pr diff <N>` (or `git fetch origin pull/<N>/head:pr-<N>`)
3. **Route audit** — §0.1 on changed `*.routes.ts`
4. Find spec in hub; verify **Approval**
5. Apply **module checks** (§0.3) for touched modules
6. Read changed files per depth tier
7. **CI on clean tree** — §1; `gh pr checks <N>` when available
8. Quick greps (§10)
9. Record findings with `path:line` + rule reference
10. Save report — §9.1 sections for large PRs
11. Post GitHub review (only if user asked); inline comments on BLOCKER/CRITICAL lines

---

## 12. Pre-review self-check (author, before opening PR)

Use [his-pr-description.md](./his-pr-description.md) as the PR body.

- [ ] `npm run lint` + `npx tsc -b` clean (frontend)
- [ ] `npm run build` clean in `backend/` (backend)
- [ ] Tests for changed behavior pass
- [ ] Response schemas on all new/changed routes
- [ ] No secrets, debug `console.log`, or commented-out dead code
- [ ] Spec Approval filled (if slice work)
- [ ] `.env.example` updated for new env vars

---

*Maintainers: when Cursor rules change, update this file, `.cursor/skills/his-pr-review/SKILL.md`, `his-pr-description.md`, and the `.cursor/rules/his-*.mdc` sources together.*
