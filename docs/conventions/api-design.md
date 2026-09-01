# API design conventions

REST API standards for modular monolith apps under `projects/<name>/backend/`.

## Base URL and versioning

- Base path: `/api`
- Version prefix when breaking changes needed: `/api/v2/...`
- Prefer non-breaking additive changes; avoid new version unless necessary

## Wire format

| Rule | Standard |
|------|----------|
| JSON keys | **snake_case** |
| Dates | ISO 8601 UTC (`2026-08-16T10:30:00Z`) |
| IDs | UUID strings |
| Booleans | `true` / `false` (not 0/1) |
| Null | Use `null`, omit optional absent fields on input |

Frontend converts to camelCase only in `src/integrations/api/client.ts`.

## Standard error envelope

All non-2xx responses:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Human-readable summary safe for UI",
    "details": []
  }
}
```

| Field | Purpose |
|-------|---------|
| `code` | Machine-readable snake_case constant |
| `message` | Safe to show users; no PHI, no stack traces |
| `details` | Optional — field errors, conflict info |

Common codes:

| code | HTTP |
|------|------|
| `validation_error` | 422 |
| `unauthorized` | 401 |
| `forbidden` | 403 |
| `not_found` | 404 |
| `conflict` | 409 |
| `internal_error` | 500 |

## Success responses

### Single resource

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "patient_id": "...",
  "status": "active",
  "admitted_at": "2026-08-16T10:30:00Z"
}
```

`POST` create → **201** with body. `GET`/`PATCH` → **200**.

### List (paginated)

```json
{
  "items": [],
  "page": 1,
  "page_size": 20,
  "total": 142,
  "total_pages": 8
}
```

Query params (snake_case):

| Param | Type | Default |
|-------|------|---------|
| `page` | int ≥ 1 | 1 |
| `page_size` | int 1–100 | 20 |
| `sort` | field name | created_at |
| `order` | asc \| desc | desc |

### Delete

- Success: **204** No Content
- Soft delete: **200** with updated resource showing `deleted_at`

## HTTP methods

| Method | Use |
|--------|-----|
| GET | Read; idempotent |
| POST | Create or non-idempotent actions |
| PATCH | Partial update |
| PUT | Full replace (rare; prefer PATCH) |
| DELETE | Remove or soft-delete |

## Auth

- **his-global-south / IPD:** Better Auth — [ADR 0008](../decisions/his-global-south/0008-better-auth-session-cookie.md)
- **Generic API clients:** JWT bearer where applicable
- `401` if not authenticated
- `403` if authenticated but insufficient role/permission
- Document required roles in `docs/contracts/<project>/`

## Filtering and search

```
GET /api/admissions?status=active&ward_id=<uuid>&page=1&page_size=20
```

- Filters as query params (snake_case)
- Full-text search: `q` param with documented min length
- Max `page_size`: 100

## Idempotency

For critical creates (payments, admissions), support:

```
Header: Idempotency-Key: <uuid>
```

Store key + result; replay same response within 24h.

## Documentation

- Maintain `docs/contracts/<project>/<resource>.md` in hub
- Include: method, path, auth, request/response examples, error codes
- Run **drift** after API changes

## OWASP API security checklist

- [ ] Auth on all non-public endpoints
- [ ] Authorization check per resource (prevent IDOR)
- [ ] Input validation (Zod) on all inputs
- [ ] Rate limiting on auth and write endpoints
- [ ] CORS restricted to known origins in production
- [ ] No sensitive data in URLs (patient ids in path ok with auth; no tokens)
- [ ] Audit log for PHI read/write (see HIPAA doc)

## Do not

- Return camelCase from API
- Return different error shapes per endpoint
- Use 200 for error conditions
- Expose internal ids sequential integers for public resources (use UUID)
