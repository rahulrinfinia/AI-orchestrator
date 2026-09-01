# Testing strategy — modular monolith

Industry-standard testing for Fastify + React monoliths (adapted from Spotify Testing Honeycomb).

## Summary

For a modular monolith, complexity sits at **module boundaries** (API ↔ DB, frontend ↔ API), not deep inside isolated functions. Prioritize:

1. **Integration tests** — largest effort (API + real Postgres)
2. **Component / route tests** — handlers, React components, hooks
3. **Contract tests** — API response shapes and error codes
4. **Unit tests** — complex business logic in `service.ts` only
5. **E2E tests** — minimal smoke on critical journeys

```text
        Traditional Pyramid          Monolith Honeycomb

             /\                         ________
            /E2E\                       /  E2E   \     ← few smoke tests
           /-----\                     |----------|
          /Integr.\      →            |Integration|    ← LARGEST (API+DB)
         /---------\                   |  + Route  |
        /   Unit    \                  |----------|
       /-------------\                  \ Unit +  /
          LARGEST                        Component /
```

## Test layers

| Layer | Scope | Tool | When | Effort |
|-------|-------|------|------|--------|
| **Unit** | Pure logic in `service.ts` | Vitest | Every PR | ~20% |
| **Route/HTTP** | Fastify `inject()` per module | Vitest | Every PR | ~15% |
| **Integration** | API + Postgres | Vitest + Testcontainers | Every PR | ~40% |
| **Contract** | Response schema, error codes | Vitest + Zod | Every PR | ~10% |
| **Component** | React components/hooks | Vitest + Testing Library | Every PR | ~10% |
| **E2E** | Critical user journeys | Playwright | Pre-deploy / nightly | ~5% |

## Backend

### Unit tests (`service.ts`)

Test business rules with mocked DB:

```typescript
vi.mock("../../plugins/db.js", () => ({ pool: { query: vi.fn() } }));

it("rejects duplicate active admission", async () => {
  vi.mocked(pool.query).mockResolvedValueOnce({ rows: [{ id: "existing" }] });
  await expect(createAdmission(input, userId)).rejects.toThrow(AppError);
});
```

### Route tests (`app.inject()`)

```typescript
const app = await buildApp();
const res = await app.inject({
  method: "POST",
  url: "/api/admissions",
  cookies: { session: testSession },
  payload: { patient_id: "...", ward_id: "..." },
});
expect(res.statusCode).toBe(201);
```

### Integration tests

- Spin Postgres via Testcontainers (or docker-compose in CI)
- Run migrations before suite
- Test full flow: HTTP → handler → service → DB → response
- One file per critical domain flow under `backend/src/__tests__/integration/`

### Contract tests

- Assert response JSON matches Zod schema from `schemas.ts`
- Assert error envelope for 401, 403, 422, 404
- See skill: `test-plan-contracts`

## Frontend

### Component tests

- Render with Testing Library
- Mock API hooks or use MSW
- Test: loading, success, error, empty states
- Test accessibility: `getByRole`, keyboard interaction

### Hook tests

- `renderHook` for React Query wrappers
- Verify cache invalidation on mutations

### E2E (Playwright)

Location: `e2e/`

Run on:
- Login → dashboard smoke
- One critical IPD journey per release (e.g. create admission)

Do **not** duplicate all integration coverage in E2E.

## CI gates

Every PR must pass:

```text
backend:  pnpm typecheck && pnpm lint && pnpm test
frontend: pnpm typecheck && pnpm lint && pnpm test
```

Integration tests may use a `test` script profile:

```json
"test:integration": "vitest run --config vitest.integration.config.ts"
```

## What to test (priority)

| Priority | Target |
|----------|--------|
| HIGH | `service.ts` business rules |
| HIGH | Auth + authorization (401, 403) |
| HIGH | Integration flows with Postgres |
| HIGH | React components with user interaction |
| MEDIUM | API contract shapes |
| MEDIUM | Form validation |
| LOW | Pure mappers, trivial getters |

## What NOT to test

- Framework internals (Fastify, React Query)
- Private functions — test via public behavior
- Snapshot-only tests with no assertion value
- Tests that only assert mocks were called

## Test data

- Use factories (`test/factories/admission.ts`) for readable setup
- Never use real PHI in tests
- Seed minimal fixtures in integration setup

## Coverage targets (guidance)

| Area | Target |
|------|--------|
| `service.ts` (domain logic) | 80%+ |
| Route handlers | Critical paths covered |
| React feature components | User-facing flows |
| Overall | Quality over percentage — no gaming |

## Skills

| Skill | Output |
|-------|--------|
| `test-plan` | `specs/tests/unit/` |
| `test-plan-integration` | `specs/tests/integration/` |
| `test-plan-contracts` | `specs/tests/contracts/` |
| `test-implement` | Code in `backend/<name>/` |

## Related

- `docs/conventions/fastify-backend.md` — backend test locations
- `docs/conventions/react-frontend.md` — frontend test patterns
