# Fastify backend conventions

Apply in `projects/<name>/backend/`. All implementations MUST follow these patterns.

## Function style

Use arrow function syntax (`const foo = async (...) => {...}`) instead of the
`function` keyword (`async function foo(...) {...}`) for new or modified code —
route handlers, service functions, and helpers alike. Exception: hoisting is genuinely
required, or you're editing a small piece of an existing file that's consistently
written with `function` declarations — don't do a drive-by full-file rewrite just to
convert style. Mirrored per-project, e.g.
`projects/his-global-south/docs/conventions/function-style-2026-09-03.md`.

## Principles

- **Functional modules** — no class-based controllers; thin routes, fat `service.ts`
- **Layered flow** — `routes → handlers → service → db`
- **Validate at boundary** — Zod on every request body, query, and params
- **SQL in service only** — parameterized queries; never in routes/handlers
- **Wire format** — JSON responses use **snake_case** keys
- **One domain per module** — e.g. `admissions`, `beds`, `discharge`

## Module structure

```text
backend/src/
├── app.ts                 # register plugins + modules
├── server.ts              # listen
├── plugins/
│   ├── auth.ts            # Better Auth session verification
│   ├── error-handler.ts   # global error envelope
│   └── db.ts              # Postgres pool
└── modules/<domain>/
    ├── index.ts           # Fastify plugin export
    ├── routes.ts          # route registration only (≤150 lines)
    ├── handlers.ts        # parse request, call service, map response
    ├── service.ts         # business logic + SQL (≤400 lines)
    ├── schemas.ts         # Zod schemas
    ├── constants.ts
    ├── types.ts
    ├── __tests__/
    └── README.md
```

## Route registration

```typescript
// modules/admissions/routes.ts
import type { FastifyPluginAsync } from "fastify";
import { createAdmissionHandler, listAdmissionsHandler } from "./handlers.js";
import { createAdmissionSchema, listAdmissionsQuerySchema } from "./schemas.js";

export const admissionRoutes: FastifyPluginAsync = async (app) => {
  app.post("/admissions", {
    schema: { body: createAdmissionSchema },
    preHandler: [app.authenticate],
    handler: createAdmissionHandler,
  });

  app.get("/admissions", {
    schema: { querystring: listAdmissionsQuerySchema },
    preHandler: [app.authenticate],
    handler: listAdmissionsHandler,
  });
};
```

## Handlers

Handlers parse validated input, call service, return data. No SQL, no business rules.

```typescript
// modules/admissions/handlers.ts
import type { FastifyRequest, FastifyReply } from "fastify";
import { createAdmission } from "./service.js";
import type { CreateAdmissionBody } from "./schemas.js";

export async function createAdmissionHandler(
  req: FastifyRequest<{ Body: CreateAdmissionBody }>,
  reply: FastifyReply,
) {
  const userId = req.user.id;
  const admission = await createAdmission(req.body, userId);
  return reply.status(201).send(admission);
}
```

## Service layer

```typescript
// modules/admissions/service.ts
import { pool } from "../../plugins/db.js";
import type { CreateAdmissionBody } from "./schemas.js";

export async function createAdmission(input: CreateAdmissionBody, userId: string) {
  const { rows } = await pool.query(
    `INSERT INTO admissions (patient_id, ward_id, admitted_by, admitted_at)
     VALUES ($1, $2, $3, NOW())
     RETURNING id, patient_id, ward_id, status, admitted_at`,
    [input.patient_id, input.ward_id, userId],
  );
  return rows[0];
}
```

Rules:
- Always `$1, $2…` placeholders — never string interpolation for values
- Return DB rows as snake_case objects (wire format)
- Throw domain errors using `AppError` (see error handling)
- Functions ≤ 50 lines; extract helpers when longer

## Zod schemas

```typescript
// modules/admissions/schemas.ts
import { z } from "zod";

export const createAdmissionSchema = z.object({
  patient_id: z.string().uuid(),
  ward_id: z.string().uuid(),
  notes: z.string().max(2000).optional(),
});

export type CreateAdmissionBody = z.infer<typeof createAdmissionSchema>;

export const listAdmissionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["active", "discharged"]).optional(),
});
```

Wire schemas use **snake_case** field names to match JSON on the wire.

## Error handling

Use a single error envelope (see `docs/conventions/api-design.md`):

```typescript
// plugins/error-handler.ts — pattern
app.setErrorHandler((error, request, reply) => {
  if (error.validation) {
    return reply.status(422).send({
      error: {
        code: "validation_error",
        message: "Request validation failed",
        details: error.validation,
      },
    });
  }
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: {
        code: error.code,
        message: error.message,
      },
    });
  }
  request.log.error(error);
  return reply.status(500).send({
    error: { code: "internal_error", message: "An unexpected error occurred" },
  });
});
```

| Status | When |
|--------|------|
| 400 | Malformed request |
| 401 | Not authenticated |
| 403 | Authenticated but not authorized |
| 404 | Resource not found |
| 409 | Conflict (duplicate, invalid state) |
| 422 | Zod validation failure |
| 500 | Unexpected server error |

Never expose stack traces or PHI in error messages.

## Logging

- Use Fastify built-in logger (`request.log`)
- Log: request id, route, user id (not patient name/PHI), duration
- Do **not** log: request bodies with PHI, passwords, tokens, full SQL with patient data

```typescript
request.log.info({ user_id: userId, admission_id: id }, "admission created");
```

## Auth

- Better Auth session cookie on protected routes
- `preHandler: [app.authenticate]` on every non-public route
- Check role/permission in handler or dedicated `authorize()` helper
- See ADR `docs/decisions/ipd/0002-better-auth-session-auth.md`

## Migrations

Location: `backend/src/db/migrations/`

Naming: `YYYYMMDDHHMMSS_<description>.sql`

```sql
-- 20260816120000_create_admissions.sql
CREATE TABLE admissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  ward_id UUID NOT NULL REFERENCES wards(id),
  status TEXT NOT NULL DEFAULT 'active',
  admitted_by UUID NOT NULL REFERENCES users(id),
  admitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE admissions IS 'In-patient admission records';
COMMENT ON COLUMN admissions.status IS 'active | discharged | transferred';
CREATE INDEX idx_admissions_patient_id ON admissions(patient_id);
CREATE INDEX idx_admissions_status ON admissions(status);
```

Every migration includes `COMMENT ON` for tables and non-obvious columns.

## Database conventions

| Rule | Standard |
|------|----------|
| Primary keys | UUID (`gen_random_uuid()`) |
| Timestamps | `TIMESTAMPTZ`, always UTC |
| Soft delete | `deleted_at TIMESTAMPTZ NULL` when needed |
| Naming | snake_case tables and columns |
| Indexes | Index all FK columns and common filters |
| Audit | `created_at`, `updated_at`; see audit ADR for PHI tables |

## Testing

| Target | Location | Tool |
|--------|----------|------|
| Service logic | `modules/*/__tests__/service.test.ts` | Vitest |
| Route + HTTP | `modules/*/__tests__/routes.test.ts` | Vitest + `app.inject()` |
| Integration | `backend/src/__tests__/integration/` | Vitest + Testcontainers Postgres |

Mock the DB pool in unit tests; use real Postgres in integration tests.

## File limits

| File | Max lines |
|------|-----------|
| routes.ts | 150 |
| service.ts | 400 |
| handlers.ts | 200 |
| Function | 50 |

## Do not

- Put SQL in routes or handlers
- Return camelCase from API handlers
- Use `any` without a comment explaining why
- Skip auth on mutations
- Log PHI or secrets
