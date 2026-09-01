# Additive touches (existing OPD files — minimal edits)

These lines are added to **existing** files in `projects/his-global-south/`. Not full file copies.

---

## `backend/src/build-app.ts`

**Import:**

```typescript
import ipdPlugin from './modules/ipd/index.js';
```

**Register (after pharmacyPlugin):**

```typescript
await fastify.register(ipdPlugin);
```

**Root `/health` modules array:** add `'ipd'`

**Swagger:** add IPD tag; transform rule for `url.startsWith('/api/v1/ipd')`

---

## `src/routes/appRoutes.tsx`

**Lazy import:**

```typescript
const IpdRoutes = lazy(() =>
  import("@/routes/ipdRoutes").then((m) => ({ default: m.IpdRoutes })),
);
```

**Single mount inside authenticated layout:**

```tsx
<Route path="/ipd/v1/*" element={<IpdRoutes />} />
```

---

## `src/components/layout/AppSidebar.tsx`

**Import:** `Hospital` from `lucide-react`

**clinicalItems entry:**

```typescript
{ title: "Inpatient (IPD)", icon: Hospital, url: "/ipd/v1" },
```

---

## `backend/src/__tests__/integration/api.integration.test.ts`

```typescript
it('GET /api/v1/ipd/health', async () => {
  const res = await app.inject({ method: 'GET', url: '/api/v1/ipd/health' });
  expect(res.statusCode).toBe(200);
  const body = res.json() as { status: string; module: string };
  expect(body.status).toBe('ok');
  expect(body.module).toBe('ipd');
});
```
