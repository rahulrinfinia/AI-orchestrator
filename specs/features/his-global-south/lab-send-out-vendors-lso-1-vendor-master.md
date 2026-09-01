# LSO-1 — Lab vendor master (API + super_admin UI)

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `lab-send-out-vendors` |
| **Slice** | LSO-1 |
| **Branch** | `feat/lab-send-out-vendors` from `develop` |
| **Goal** | Hospital `super_admin` can add/edit/deactivate outsourced lab vendors; org users can list them via API |
| **Depends on** | — |
| **PRD** | [prd.md](../../../prd/his-global-south/lab-send-out-vendors/prd.md) |
| **Technical design** | [technical-design.md](../../../prd/his-global-south/lab-send-out-vendors/technical-design.md) |
| **Slice spec** | [slice-1.md](../../../prd/his-global-south/lab-send-out-vendors/slices/slice-1.md) |
| **Status** | Planned — ready for implement after Approval below |

---

## Approval

- [x] Product: acceptance criteria match PRD US-A1, US-A2
- [x] Tech: AD-2, AD-4, AD-9, AD-11, AD-12, AD-15 respected; TD §9 matrix referenced
- [x] Scope: no order/send-out/barcode/PDF work (LSO-2+)

**Approved by:** Rahul (APPROVE PRD, APPROVE DESIGN, APPROVE SLICES)  
**Date:** 2026-08-31

**Agent rule:** Implement may proceed — all boxes checked and approver named.

---

## Architecture constraints (immutable)

| ID | Constraint | This slice |
|----|------------|------------|
| AD-2 | Reuse `contracted_organizations`; `org_type = laboratory` | No new vendor table |
| AD-4 | `assertSuperAdmin` on vendor writes | Import from `org.service.ts` |
| AD-9 | Full Fastify schemas (params, body, query, response + errors) | New `labVendors.schema.ts` — first platform submodule with response schemas |
| AD-11 | Standard error envelope + domain codes | `LAB_VENDOR_ERROR` in constants |
| AD-12 | Paginated list with SQL `total` | `{ items, total, limit, offset }` |
| AD-15 | `withOrgAuth` + suspended hospital rejection | Same preHandler chain as providerMaster |
| TD §9 | Constants, mapping, types, CI twins | See Validation section |

**Do not:** create standalone LIS module; add `platform_admin` vendor CRUD; change `/api/platform/contracted-organizations` behaviour (keep for general contracted orgs).

---

## Previous slices / current code

Nothing from `lab-send-out-vendors` exists yet. Relevant baseline in `projects/his-global-south/`:

| Area | Exists today | Gap |
|------|--------------|-----|
| Table | `contracted_organizations` pgschema + baseline migration | No LSO-1 migration expected (no new table/columns) |
| API | `GET/POST/PUT/PATCH /api/platform/contracted-organizations` in `providerMaster` | No `/api/platform/lab-vendors`; weak validation; **no response schemas** on providerMaster routes |
| Auth | `assertSuperAdmin` exported from `org.service.ts`; local duplicate in `providerMaster.service.ts` | Lab vendors service imports **exported** helper only |
| UI | `/contracted-organizations` full page (all org types) | No lab-focused `/org-setup/lab-vendors`; no super_admin-only write gate on contracted org UI |
| FE API | `contractedOrgs.service.ts` → array response (no pagination) | New `labVendors.service.ts` → paginated shape |
| queryKeys | `queryKeys.contractedOrgs` | Add `queryKeys.labVendors` |

**Reuse (reference, do not break):**

- `backend/src/modules/platform/providerMaster/providerMaster.service.ts` — `createContractedOrganization`, `listContractedOrganizations`, update/patch patterns
- `src/pages/contractedOrgs/` — sheet/table UX patterns (simplify for laboratory-only)
- `src/pages/admin/` — org-setup shell and access patterns

---

## Relevant files

### New — backend

```text
backend/src/modules/platform/providerMaster/labVendors/
├── labVendors.constants.ts
├── labVendors.routes.ts
├── labVendors.controller.ts
├── labVendors.service.ts
├── labVendors.schema.ts
├── labVendors.types.ts
├── labVendors.mapping.ts
└── __tests__/
    ├── labVendors.service.test.ts
    └── labVendors.schema.test.ts
```

### Modify — backend

```text
backend/src/modules/platform/providerMaster/providerMaster.routes.ts   # register labVendorsRoutes
backend/src/modules/platform/platform.constants.ts                     # CONTRACTED_ORG_TYPE if not present
backend/src/modules/platform/README.md                                 # document lab-vendors routes
```

### New — frontend

```text
src/platform/constants/labVendors.ts
src/platform/types/labVendors.types.ts
src/services/labVendors.service.ts
src/hooks/queries/useLabVendors.ts
src/pages/orgSetup/labVendors/LabVendorsPage.tsx
src/pages/orgSetup/labVendors/components/LabVendorSheet.tsx
src/pages/orgSetup/labVendors/components/LabVendorsTable.tsx
```

### Modify — frontend

```text
src/routes/appRoutes.tsx              # lazy route /org-setup/lab-vendors
src/components/layout/AppSidebar.tsx  # Lab vendors link (org admin nav; write gated in page)
src/lib/queryKeys.ts                  # queryKeys.labVendors
src/modules/platform/index.ts         # optional re-export lab vendor service types
```

### Reference only

```text
backend/src/modules/platform/org/org.service.ts                       # assertSuperAdmin
backend/src/modules/frontdesk/patients/patientsRegistration.schema.ts # response schema pattern
backend/src/modules/platform/pgschema/contracted-organizations.pgschema.ts
src/pages/contractedOrgs/index.tsx
src/integrations/api/client.ts
```

---

## Phases

### Phase A — Foundation (constants + types)

**No DB migration** unless implement discovers a missing index — table and CHECKs already exist on `contracted_organizations`.

1. **`labVendors.constants.ts`**
   - `LAB_VENDORS_API_BASE = '/api/platform/lab-vendors'`
   - `CONTRACTED_ORG_TYPE.LABORATORY = 'laboratory'` (or import from shared platform constants if added in `platform.constants.ts`)
   - `CONTRACTED_ORG_STATUS` — mirror pgschema CHECK values (`pending`, `active`, `suspended`, `inactive`)
   - `LAB_VENDOR_ERROR` codes + HTTP mapping helpers
   - `LAB_VENDOR_LIST_DEFAULT_LIMIT = 50`

2. **`labVendors.types.ts`**
   - `LabVendorRow`, `CreateLabVendorBody`, `UpdateLabVendorBody`, `LabVendorListQuery`
   - `LabVendorStatus`, `LabVendorListResponse` — unions from constants, not `string`

3. **`labVendors.mapping.ts`**
   - `toLabVendorResponse(row)` — snake_case wire shape
   - `normalizeAddressWire(body)` — same address key aliases as org/contracted org (`line1` / `line_1` if applicable)
   - `toContractedOrgStatus(status)` — narrow DB strings

4. **Frontend mirrors**
   - `src/platform/constants/labVendors.ts` — `LAB_VENDOR_STATUS`, labels for UI
   - `src/platform/types/labVendors.types.ts` — camelCase DTOs

### Phase B — Backend API

5. **`labVendors.schema.ts`** (copy pattern from `patientsRegistration.schema.ts`)
   - `labVendorIdParamsSchema` — `id: { type: 'string', format: 'uuid' }`
   - `createLabVendorBodySchema` — required fields; `additionalProperties: false`; Title Case `errorMessage`
   - `updateLabVendorBodySchema`, `patchLabVendorStatusBodySchema`
   - `listLabVendorsQuerySchema` — `search`, `active`, `limit`, `offset`
   - Response schemas: `labVendorResponseSchema`, `listLabVendorsResponseSchema`, `errorResponseSchema`
   - Wire **200/201/400/403/404/409/422** on every route that returns them

6. **`labVendors.service.ts`**
   - `listLabVendors(orgId, query)` — filter `org_type = laboratory`; optional `active` filter (include inactive for admin list when `active` omitted); SQL `count(*)` + `limit`/`offset`; return `{ items, total, limit, offset }`
   - `getLabVendor(orgId, id)` — 404 if wrong org or not laboratory type
   - `createLabVendor(userId, orgId, body)`:
     - `assertSuperAdmin(userId)` → 403
     - Validate name, code, contact (phone OR email), address line1 + city
     - Force `org_type = laboratory`, `status = active`, `active = true`
     - Insert via Drizzle; 409 on unique `(organization_id, code)`
   - `updateLabVendor(userId, orgId, id, body)` — super_admin; same validation rules
   - `patchLabVendorStatus(userId, orgId, id, { active, status? })` — deactivate for LSO-2 dropdown behaviour
   - Use `getTableColumns(contracted_organizations)` for selects
   - Structured errors: `{ error: { code, message, details } }` per api-design.md

7. **`labVendors.controller.ts`**
   - Thin handlers: cast `OrgAuthRequest`, call service, map result to status
   - Reuse existing `sendResult` pattern from providerMaster controller if present

8. **`labVendors.routes.ts`**
   - Build paths: `` `${LAB_VENDORS_API_BASE}` ``, `` `${LAB_VENDORS_API_BASE}/:id` ``, `` `${LAB_VENDORS_API_BASE}/:id/status` ``
   - `{ preHandler: [...withOrgAuth] }` on all
   - Wire full `schema` on each route — **no inline handlers**

9. **Register** in `providerMaster.routes.ts`: `await labVendorsRoutes(fastify)` or call registrar from same file

### Phase C — Frontend

10. **`labVendors.service.ts`**
    - `listLabVendors({ search, active, limit, offset })`
    - `getLabVendor(id)`, `createLabVendor(body)`, `updateLabVendor(id, body)`, `patchLabVendorStatus(id, payload)`
    - Types camelCase; client converts wire

11. **`queryKeys.labVendors`** + **`useLabVendors.ts`**
    - `useLabVendorsList(filters)`, `useLabVendorDetail(id)`, mutations with invalidation

12. **`LabVendorsPage.tsx`** (thin)
    - List table + search; **Add vendor** button only if `isSuperAdmin`
    - Non–super_admin: read-only list (no sheet write mode)

13. **`LabVendorSheet.tsx`**
    - RHF + Zod from constants
    - Fields: name, code, contact name, phone, email, address (line1, city, state, postal), optional registration block collapsed
    - Wrap in `RouteErrorBoundary`
    - Server errors via `showApiErrorToast`

14. **Routing**
    - `appRoutes.tsx`: lazy `LabVendorsPage` at `/org-setup/lab-vendors` (nested under org layout or standalone with same chrome as admin)
    - `AppSidebar.tsx`: add **Lab vendors** under org admin section → `/org-setup/lab-vendors`

15. **Do not** remove or change `/contracted-organizations` — parallel entry points OK

### Phase D — Tests + docs

16. **Unit** — `labVendors.service.test.ts`
    - super_admin gate (403 when false)
    - contact required (422)
    - duplicate code (409)
    - list filters `org_type=laboratory` only

17. **Schema** — `labVendors.schema.test.ts`
    - Invalid UUID on params fails with message containing "UUID"
    - Title Case labels on required field errors

18. **Integration** (if existing platform integration harness)
    - POST/GET lab-vendors as super_admin
    - POST as doctor → 403
    - Org mock `active: true`
    - Add GET routes to openapi-get-sweep if registered

19. **README** — document endpoints in platform/providerMaster README

---

## Step-by-step task checklist (implement order)

| # | Task | File(s) |
|---|------|---------|
| 1 | Constants + types + mapping (BE) | `labVendors.constants.ts`, `.types.ts`, `.mapping.ts` |
| 2 | JSON schemas + response schemas | `labVendors.schema.ts` |
| 3 | Service CRUD + validation | `labVendors.service.ts` |
| 4 | Controller + routes + register | `.controller.ts`, `.routes.ts`, `providerMaster.routes.ts` |
| 5 | Backend unit + schema tests | `__tests__/*` |
| 6 | `npm run build` in backend/ | — |
| 7 | FE constants, types, service | `src/platform/constants/labVendors.ts`, types, `labVendors.service.ts` |
| 8 | queryKeys + hooks | `queryKeys.ts`, `useLabVendors.ts` |
| 9 | Page + components + route + sidebar | `src/pages/orgSetup/labVendors/*`, `appRoutes.tsx`, `AppSidebar.tsx` |
| 10 | `npm run lint` + `npx tsc -b` | frontend root |
| 11 | Manual tracer: super_admin add vendor → list → deactivate → `?active=true` hides | — |
| 12 | Update slice status.yaml → `in_progress` / `implemented` when done | hub `prd/.../slices/status.yaml` |

---

## Testing strategy

| Layer | What to test |
|-------|----------------|
| Unit | Validation, auth gate, duplicate code, laboratory filter |
| Schema | AJV UUID + Title Case messages |
| Integration | POST/GET happy path; 403 non-admin; paginated total |
| Regression | Existing `/contracted-organizations` still works |
| Manual | Tracer from slice spec |

---

## Validation commands

Run in `projects/his-global-south/`:

```bash
# Backend
cd backend && npm run build
npm test -- --run src/modules/platform/providerMaster/labVendors

# Frontend (repo root)
npm run lint
npx tsc -b
```

Optional full sweep after integration tests added:

```bash
cd backend && npm test -- --run src/__tests__/integration/openapi-get-sweep.integration.test.ts
```

---

## Acceptance criteria

| # | Criterion | Validation |
|---|-----------|------------|
| 1 | super_admin can POST/PUT/PATCH; others 403 on writes | Integration / manual |
| 2 | GET list/detail works for any org user | Manual + integration |
| 3 | Required fields enforced (name, code, contact, address) | Unit + schema tests |
| 4 | `org_type` always `laboratory` | Unit test insert values |
| 5 | Duplicate code → 409 | Unit test |
| 6 | List returns `{ items, total, limit, offset }` | Integration |
| 7 | Deactivated vendor excluded from `?active=true` | Manual |
| 8 | All routes have response schemas | Code review + openapi sweep |
| 9 | UI: write actions super_admin only | Manual |
| 10 | TD §9 + CI green | lint + tsc -b + backend build |

---

## Out of scope (reminder)

- LSO-2 order vendor picker and migration
- Barcode, PDF, send-out status
- MOU document upload (optional stretch — not blocking)
- Refactoring providerMaster to add response schemas on contracted-org routes
- Deduplicating `assertSuperAdmin` inside legacy `providerMaster.service.ts` (optional cleanup, not required)

---

## After merge

Update `prd/his-global-south/lab-send-out-vendors/slices/status.yaml` → `lso-1: merged`. Proceed to **plan slice 2 (LSO-2)**.
