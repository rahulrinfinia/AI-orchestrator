# HIS Global South — Frontend Coding Rules

Frontend-only reference for **`projects/his-global-south/src/`**.  
Consolidated from hub rules and `docs/conventions/react-frontend.md` — **2026-08-27**.

Share this with colleagues working on React UI, hooks, routes, and client API code.

---

## 1. Core principles

- **Thin pages** — pages compose hooks and components; no business logic in pages
- **Single API client** — all HTTP via `src/integrations/api/client.ts`
- **App uses camelCase** — transform only in the API client
- **Server state** — React Query for API data; local state for UI only
- **Constants in module folders** — not hardcoded in components
- **Accessible by default** — WCAG 2.1 AA target
- **UI primitives** — `@/components/ui/*` only (shadcn-style design system)

Do not call `fetch()` outside `integrations/api/client.ts`.  
Do not store server data in Context or Zustand.

---

## 2. API boundary (mandatory)

**File:** `src/integrations/api/client.ts`

| Direction | Transform |
|-----------|-----------|
| GET responses | `keysToCamel()` — wire snake_case → app camelCase |
| POST/PUT/PATCH JSON bodies | `keysToSnake()` — app camelCase → wire snake_case |

```typescript
// types.ts — always camelCase in TypeScript
export interface Admission {
  id: string;
  patientId: string;
  status: AdmissionStatus;
}

// hooks or api layer — client handles conversion on the wire
const data = await api.get<Admission[]>('/api/v1/ipd/admissions');
```

**Rules:**

- Feature `types.ts` uses **camelCase** property names
- Never read `patient_id`, `first_name`, `triage_status` on API response objects in components
- Never manually snake_case request bodies in random files — go through `api.get` / `api.post` / etc.
- Better Auth session cookie is sent automatically (`credentials: 'include'`)

---

## 3. Directory structure

### App shell (global)

```text
src/
├── main.tsx
├── App.tsx
├── routes/
│   └── appRoutes.tsx              # lazy-loads module routers; ProtectedRoute wrapper
├── pages/                         # thin shells (≤ ~100 lines)
├── components/
│   ├── ui/                        # design system primitives only
│   └── <mod>/                     # reusable domain controls (e.g. components/ipd/)
├── integrations/
│   └── api/client.ts              # ONLY snake_case ↔ camelCase boundary
├── hooks/                         # shared hooks (useAuth, usePermissions, …)
├── lib/                           # queryKeys, utils — not module domain literals
├── modules/<mod>/index.ts         # barrel: export * from '@/ipd' etc.
└── services/                      # API service functions (legacy OPD; new modules prefer <mod>/api/)
```

### Portable module pattern (IPD and new modules — use this)

```text
src/ipd/                           # portable root — copy for new modules
  constants/index.ts               # UI paths + API path constants only
  constants/admissions.ts            # domain literals + UI labels (mirrors backend *_VALUES)
  api/                               # thin API calls
  hooks/                             # React Query hooks + UI orchestration
  types/                             # camelCase DTOs and unions
  pages/                             # feature pages + nested routes.tsx
  routes.tsx                         # IPD sub-router
  index.ts                           # public exports

src/components/ipd/                  # reusable controls shared across IPD pages
  doctorSelect.types.ts              # types stay beside component, or in types/

src/modules/ipd/index.ts             # export * from '@/ipd'
```

**Legacy OPD** may still use `src/pages/*`, `src/services/*`, `src/hooks/queries/*` — when extending OPD, match surrounding files. **New modules** use the portable `src/<mod>/` layout above.

---

## 4. Routing

| Layer | File | Role |
|-------|------|------|
| App shell | `src/routes/appRoutes.tsx` | Mounts `/ipd/*`, `/platform/*`, OPD routes; `React.lazy` imports |
| Module router | `src/ipd/routes.tsx` | `<Routes>` for module |
| Feature router | `src/ipd/pages/<feature>/routes.tsx` | Nested paths when a feature has many screens |

**UI paths (current rule):**

- IPD: `/ipd`, `/ipd/admission`, `/ipd/admission/new`, `/ipd/admission/:id`
- Platform: `/platform/hospitals`, `/platform/screening`, …
- **Do not** use `/ipd/v1/*` on new screens

**API paths (backend — for constants only on frontend):**

- IPD: `/api/v1/ipd/…`
- Version lives on **API**, not on UI routes

**Other routing rules:**

- Protected routes wrap with `ProtectedRoute` (Better Auth session)
- Role-gated pages use `RequireRole` (e.g. `/org-setup`, `/payerCatalog`) — most routes are not role-guarded today
- Lazy-load pages: `lazy(() => import('@/pages/...'))`
- If you rename a URL, add `Navigate` redirects for old paths

---

## 5. Constants

### Placement

| Scope | Location |
|-------|----------|
| Module domain literals | `src/<mod>/constants/<feature>.ts` |
| Paths / API bases only | `src/<mod>/constants/index.ts` |
| Cross-app query keys | `src/lib/queryKeys.ts` |

### Rules

- Mirror backend `*_VALUES` from `backend/src/modules/<mod>/<feature>/<feature>.constants.ts`
- Never hardcode `'open'`, `'walk_in'`, `'all'`, `'age'`, `'date'`, `'definite'`, form option values in components, hooks, or services
- Never compare closed sets with raw strings:

```typescript
// Bad
if (status === 'open') { ... }

// Good
if (status === ADMISSION_STATUS.OPEN) { ... }
if (isOpenAdmission(status)) { ... }
```

- UI-only modes (`age`/`date`, filter sentinel `all`) are still named constants
- Do not put module-only literals in `src/lib/` or global config

### List filters

If the API treats a **missing** filter as a default (e.g. status → `open`), send the sentinel (e.g. `all`) explicitly — do not strip it to `undefined`.

---

## 6. Types

- Unions from constants: `(typeof FOO)[keyof typeof FOO]` — not loose `string`
- Types live in `src/<mod>/types/` or `*.types.ts` — **never export types from a `.tsx` component file**
- No `Record<string, unknown>` for API request/response shapes
- Mapping/narrowing in `*.mapping.ts` — use `toX()` helpers when reading query params or form strings

**After tightening unions** (`Gender`, document types, etc.), grep for:

- `.toLowerCase()` on typed values
- `?? ''` widening to `string`
- `useState('literal')` without a typed constant
- `z.string()` where `z.enum()` / union is required

CI runs **`npx tsc -b`** on the full project — Vite dev alone is not enough.

---

## 7. Data fetching and state

| State type | Tool |
|------------|------|
| Server / API data | **React Query** (`useQuery`, `useMutation`) |
| Form state | **React Hook Form** + **Zod** resolver |
| Auth / org profile | `useAuth()` context |
| Permissions badge | `usePermissions()` |
| Global UI (sidebar) | React Context |
| URL filters / pagination | `searchParams` / React Router |

**Hook pattern:**

```typescript
// src/ipd/hooks/useAdmissions.ts
export function useAdmissions(params: AdmissionListParams) {
  return useQuery({
    queryKey: queryKeys.ipd.admissions(params),
    queryFn: () => listAdmissions(params),
  });
}
```

- Pages call hooks — hooks call `api/` or `services/`
- Invalidate query keys on mutation success
- Every data-fetching component handles **loading** and **error** states

---

## 8. Components and pages

| Rule | Standard |
|------|----------|
| Page components | ≤ ~100 lines |
| Feature components | ≤ ~200 lines |
| Functions | ≤ ~50 lines |
| Props | Typed interfaces; avoid `any` |
| React keys | Stable ids — never array index on mutable lists |
| Layout | `container mx-auto py-6 px-4 space-y-6` |

**Imports in pages:**

- Prefer `@/modules/ipd` or domain barrels
- Prefer hooks over deep `@/services/*` in page files

**Shared controls:**

- Reusable pickers/inputs → `src/components/<mod>/`
- Types for those controls → `*.types.ts` next to component or in module `types/`

---

## 9. Forms

- React Hook Form + Zod resolver
- Client validation for UX; **server is source of truth**
- Show field-level errors from **422** API responses
- When setting typed enum fields from strings, narrow first (`toGender(value)`) before `setValue`

```typescript
const schema = z.object({
  patientId: z.string().uuid('Select a patient'),
  admissionType: z.enum(ADMISSION_TYPE_VALUES),
});
```

---

## 10. Styling

- Tailwind CSS + `@/components/ui/*` (Button, Dialog, Table, …)
- No inline styles except truly dynamic values
- Mobile-first responsive breakpoints

---

## 11. Accessibility (WCAG 2.1 AA)

- All interactive elements keyboard reachable
- Images: meaningful `alt` or `alt=""` for decorative
- Forms: `<label htmlFor>` or `aria-label` on every input
- Errors: `role="alert"` or `aria-live="polite"`
- Color contrast ≥ 4.5:1 for text
- Visible focus on focusable elements
- Semantic HTML: `button` not `div` for clicks; use `main`, `nav`

---

## 12. Security (frontend)

- Never store PHI in `localStorage` or `sessionStorage`
- Session via Better Auth cookie — do not put tokens in URLs
- No secrets in frontend bundle or `.env` exposed to Vite (`VITE_*` only for non-secret config)
- Sanitize rich HTML with DOMPurify if rendering user content
- Avoid exposing raw patient identifiers in URLs when avoidable

---

## 13. Testing

| Target | Tool | Location |
|--------|------|----------|
| Components | Vitest + Testing Library | colocated `__tests__/` |
| Hooks | `renderHook` | colocated |
| Barrel / module boundaries | Vitest | `src/modules/*/__tests__/` |

**Barrel import tests** (`moduleExports`, `moduleBoundaries`): use **60s timeout** when importing `@/modules/*` under the full test suite.

Test behavior, not implementation:

- ✅ "shows error when API fails"
- ❌ "calls useQuery with correct key"

---

## 14. Validation before merge

In `projects/his-global-south/`:

```bash
npm run lint
npx tsc -b
```

GitHub **Frontend — ESLint + tsc** fails on `tsc -b`, not on `npm run dev` or Vitest alone.

Common failures after refactors:

- `TS2322` / `TS2345` — string passed where union expected
- `TS2300` — duplicate type exports

---

## 15. Frontend anti-patterns (do not)

- `fetch()` outside `client.ts`
- `patient_id` / snake_case on API data in JSX or hooks
- Business logic in page components
- Domain string literals in `.tsx` files
- Types exported from component files
- `any` without a comment
- Skipping loading/error UI
- Array index as React key for dynamic lists
- Stripping filter sentinel `all` to `undefined` when API defaults matter
- Using `/ipd/v1/*` for new IPD screens
- Modifying OPD pages/modules for IPD-only work
- Saying "done" without `npx tsc -b`

---

## 16. Source documents

| Document | Path |
|----------|------|
| React conventions (generic) | `docs/conventions/react-frontend.md` |
| Full stack context | `docs/conventions/his-global-south-coding-context.md` |
| Implement rules (frontend sections) | `.cursor/rules/his-implement-before-code.mdc` |
| CI gates | `.cursor/rules/his-match-ci-before-done.mdc` |
| PR #47 frontend lessons | `.cursor/rules/his-pr-review-lessons.mdc` |
| API client (live code) | `projects/his-global-south/src/integrations/api/client.ts` |
| Sidebar / route guards | `projects/his-global-south/src/components/layout/README.md` |

---

*Frontend-only extract — pair with `his-global-south-coding-context.md` for backend rules.*
