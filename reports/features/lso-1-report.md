# LSO-1 — Lab vendor master implementation report

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `lab-send-out-vendors` |
| **Slice** | LSO-1 |
| **Branch** | `feat/lab-send-out-vendors` |
| **Date** | 2026-08-31 |

## Summary

Hospital **super_admin** can create, edit, and deactivate outsourced lab vendors via `/api/platform/lab-vendors` and `/org-setup/lab-vendors`. Org users with org-admin access can browse the vendor list read-only. Vendors are stored in existing `contracted_organizations` with `org_type = laboratory` — no new table or migration.

## Backend (`projects/his-global-south/backend/`)

New module: `src/modules/platform/providerMaster/labVendors/`

| File | Purpose |
|------|---------|
| `labVendors.constants.ts` | API base path, org type/status literals, error codes |
| `labVendors.types.ts` | Wire + service types |
| `labVendors.mapping.ts` | Address normalization, response mapping, insert values |
| `labVendors.schema.ts` | Full Fastify schemas (params, body, query, response + errors) |
| `labVendors.service.ts` | Paginated list, get, create, update, patch status; `assertSuperAdmin` on writes |
| `labVendors.controller.ts` | Thin handlers |
| `labVendors.routes.ts` | Routes from `LAB_VENDORS_API_BASE` |
| `__tests__/labVendors.service.test.ts` | Auth gate, contact validation, insert shape, pagination |
| `__tests__/labVendors.schema.test.ts` | UUID param + Title Case AJV messages |

Modified: `providerMaster.routes.ts` — registers `labVendorsRoutes` first.

### Endpoints

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/platform/lab-vendors` | org | Paginated `{ items, total, limit, offset }`; filters `search`, `active` |
| POST | `/api/platform/lab-vendors` | super_admin | Creates laboratory vendor |
| GET | `/api/platform/lab-vendors/:id` | org | Detail |
| PUT | `/api/platform/lab-vendors/:id` | super_admin | Update |
| PATCH | `/api/platform/lab-vendors/:id/status` | super_admin | Activate/deactivate |

## Frontend (`projects/his-global-south/src/`)

| File | Purpose |
|------|---------|
| `platform/constants/labVendors.ts` | Status labels, API path, active filter sentinels |
| `platform/types/labVendors.types.ts` | camelCase DTOs |
| `services/labVendors.service.ts` | API client |
| `hooks/queries/useLabVendors.ts` | List/detail + mutations |
| `pages/orgSetup/labVendors/LabVendorsPage.tsx` | List + search; write gated by `isSuperAdmin` |
| `pages/orgSetup/labVendors/components/LabVendorSheet.tsx` | Create/edit sheet |
| `pages/orgSetup/labVendors/components/LabVendorsTable.tsx` | Table |
| `pages/orgSetup/labVendors/labVendorForm.ts` | Form helpers |

Modified: `lib/queryKeys.ts`, `routes/appRoutes.tsx`, `components/layout/AppSidebar.tsx`.

Route: `/org-setup/lab-vendors` (org_admin read; super_admin write).

## Validation

```text
backend:  npm run build                          ✓
backend:  npm test -- --run .../labVendors        ✓ (6 tests)
frontend: npm run lint                           ✓ (0 errors)
frontend: npx tsc -b                             ✓
```

## Out of scope (LSO-2+)

- Send-out order vendor assignment
- Barcode generate/print/lookup
- PDF report upload
- Vendor portal

## Manual tracer (recommended)

1. Sign in as **super_admin** → Org setup → **Lab vendors**
2. Add vendor (name, code, phone or email, address line1 + city)
3. Confirm vendor appears in list; search by name/code works
4. Edit vendor; deactivate; filter **Active only** hides inactive row
5. Sign in as non–super_admin org user → list visible, no Add/Edit

## Git

Not committed — awaiting explicit user approval per workspace rules.
