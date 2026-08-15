# React frontend conventions

Apply in `projects/<name>/src/`. All implementations MUST follow these patterns.

## Principles

- **Feature-first** — code lives in `src/features/<domain>/`, not loose in `components/`
- **Thin pages** — pages compose features; no business logic in pages
- **Single API client** — all HTTP via `src/integrations/api/client.ts`
- **App uses camelCase** — transform only in the API client
- **Server state** — React Query for API data; local state for UI only
- **Accessible by default** — WCAG 2.1 AA target

## Directory structure

```text
src/
├── main.tsx
├── App.tsx
├── routes/                    # route definitions only
│   └── index.tsx
├── pages/                     # thin page shells (≤100 lines)
│   └── admissions/
│       └── AdmissionsPage.tsx
├── features/<domain>/
│   ├── index.ts           # Public exports
│   ├── routes.ts          # App + API path constants
│   ├── api.ts             # React Query (↔ routes + handlers)
│   ├── service.ts         # Pure client logic (↔ service.ts)
│   ├── schemas.ts         # Zod (↔ schemas.ts)
│   ├── types.ts
│   ├── constants.ts
│   ├── hooks/             # UI orchestration (↔ handlers)
│   ├── components/
│   └── __tests__/
├── components/ui/             # shared design system primitives
├── integrations/
│   └── api/
│       └── client.ts          # ONLY place for snake_case ↔ camelCase
└── lib/                       # shared utils (formatDate, etc.)
```

## API client (mandatory boundary)

All fetch logic goes through `src/integrations/api/client.ts`:

```typescript
// features/admissions/api.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/integrations/api/client";
import type { Admission } from "./types";

export function useAdmissions(params: { page?: number; status?: string }) {
  return useQuery({
    queryKey: ["admissions", params],
    queryFn: () => apiGet<{ items: Admission[]; total: number }>("/api/admissions", params),
  });
}

export function useCreateAdmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { patientId: string; wardId: string }) =>
      apiPost<Admission>("/api/admissions", {
        patient_id: body.patientId,
        ward_id: body.wardId,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admissions"] }),
  });
}
```

Rules:
- Feature `types.ts` uses **camelCase**
- Convert to snake_case only when building request bodies in `api.ts`
- Never call `fetch()` directly from components

## Component rules

```typescript
// features/admissions/components/AdmissionList.tsx
export function AdmissionList({ wardId }: { wardId: string }) {
  const { data, isLoading, error } = useAdmissions({ wardId });

  if (isLoading) return <LoadingSpinner aria-label="Loading admissions" />;
  if (error) return <ErrorAlert message="Unable to load admissions" />;

  return (
    <ul aria-label="Active admissions">
      {data?.items.map((a) => (
        <li key={a.id}>{a.patientName}</li>
      ))}
    </ul>
  );
}
```

| Rule | Standard |
|------|----------|
| Page components | ≤ 100 lines |
| Feature components | ≤ 200 lines |
| Functions | ≤ 50 lines |
| Props | Typed interfaces; no `any` |
| Loading/error | Every data-fetching component handles both |
| Keys | Stable ids, never array index for dynamic lists |

## Forms

- Use **React Hook Form** + **Zod** resolver
- Validate on client for UX; server is source of truth
- Show field-level errors from 422 API responses

```typescript
const schema = z.object({
  patientId: z.string().uuid("Select a patient"),
  wardId: z.string().uuid("Select a ward"),
});
```

## Routing

- React Router v7 (or current project choice — document in ADR if changed)
- Protected routes wrap with auth guard
- Lazy-load feature pages: `React.lazy(() => import("@/pages/..."))`

## State management

| State type | Tool |
|------------|------|
| Server/API data | React Query |
| Form state | React Hook Form |
| Global UI (theme, sidebar) | React Context or Zustand |
| URL state (filters, pagination) | search params |

Do not store server data in Context or Zustand.

## Accessibility (WCAG 2.1 AA)

- All interactive elements keyboard reachable
- Images: meaningful `alt` or `alt=""` for decorative
- Forms: `<label htmlFor>` or `aria-label` on every input
- Errors: `role="alert"` or `aria-live="polite"`
- Color contrast ≥ 4.5:1 for text
- Focus visible on all focusable elements
- Use semantic HTML (`main`, `nav`, `button` not `div` for clicks)

## Styling

- Use project design system (Tailwind + shared `components/ui/` when added)
- No inline styles except dynamic values
- Mobile-first responsive breakpoints

## Testing

| Target | Tool | Location |
|--------|------|----------|
| Components | Vitest + Testing Library | `features/*/__tests__/` |
| Hooks | `@testing-library/react-hooks` or renderHook | same |
| API hooks | MSW mock | `features/*/__tests__/` |
| E2E | Playwright | `e2e/` |

Test behavior, not implementation:
- ✅ "shows error when API fails"
- ❌ "calls useQuery with correct key"

## Security (frontend)

- Never store PHI in `localStorage` or `sessionStorage`
- Auth session via httpOnly cookie (Better Auth)
- Sanitize user HTML if rendering rich text (DOMPurify)
- No secrets in frontend bundle

## Do not

- Call `fetch` outside `integrations/api/client.ts`
- Put business logic in page components
- Display raw patient identifiers in URLs when avoidable
- Skip loading/error states
- Use array index as React key for mutable lists
