# Slice LSO-1 — Lab vendor master (API + super_admin UI)

| Field | Value |
|-------|--------|
| **ID** | LSO-1 |
| **Depends on** | — |
| **Technical design refs** | AD-2, AD-4, AD-9, AD-11, AD-12, AD-15; §5.1, §6, §9 |
| **Tracer** | Login as hospital `super_admin` → **Org setup → Lab vendors** → **Add vendor** (name, code, phone/email, address) → vendor appears in list → `GET /api/platform/lab-vendors` returns it for the org |

---

## Purpose

Thinnest end-to-end path for outsourced lab vendor master. Hospitals can register outside labs without SQL. No order/send-out changes yet — vendors exist in DB and API before clinical workflow uses them in LSO-2.

---

## In scope

### Backend — `backend/src/modules/platform/providerMaster/labVendors/`

- `labVendors.constants.ts` — `LAB_VENDORS_API_BASE`, `CONTRACTED_ORG_TYPE.LABORATORY`, `LAB_VENDOR_ERROR`, default status `active`
- `labVendors.routes.ts` — paths built only from `LAB_VENDORS_API_BASE`; register from `providerMaster.routes.ts`
- `labVendors.controller.ts` — thin handlers; no inline routes
- `labVendors.service.ts` — wraps contracted-org persistence; **`assertSuperAdmin(userId)`** on POST/PUT/PATCH status; list/get org-scoped
- `labVendors.schema.ts` — body, querystring, params, **response + error schemas**; `additionalProperties: false`; Title Case AJV messages; UUID `format` on `:id`
- `labVendors.types.ts` — unions from constants
- `labVendors.mapping.ts` — row → response DTO

**Validation (create/update):**

- Required: `name`, `code` (uppercase trim), address `line1` + `city`
- At least one of `contact_phone` or `contact_email`
- Force `org_type = laboratory` server-side (not client-selectable)
- Default `status = active`, `active = true` on create by super_admin
- Duplicate `code` per org → **409** `duplicate_lab_code`
- Missing contact → **422** `contact_required`

**List response:** `{ items, total, limit, offset }` with SQL count — not client-side length.

### Frontend

- Route: `/org-setup/lab-vendors` (nested under existing org-setup shell); lazy in `appRoutes.tsx`
- Page: `src/pages/orgSetup/LabVendorsPage.tsx` — thin list + create/edit drawer
- Constants: `src/platform/constants/labVendors.ts` (mirror backend)
- Types: `src/platform/types/labVendors.types.ts`
- Service: `src/services/labVendors.service.ts`
- Hook: `src/hooks/queries/useLabVendors.ts` + `queryKeys.labVendors` in `queryKeys.ts`
- Sidebar/tab: visible for org admin navigation; **Add/Edit/Deactivate** only when `isSuperAdmin`
- Form: RHF + Zod from constants; `RouteErrorBoundary` on drawer

### Tests

- Unit: `labVendors.service.test.ts` — validation, super_admin gate, duplicate code
- Schema: `labVendors.schema.test.ts` — Title Case messages; UUID format
- Integration: POST/GET lab-vendors; non–super_admin POST → 403; org mock `active: true`

### Docs

- Update `providerMaster/README.md` (or platform module README) for lab-vendors routes

---

## Out of scope

- Lab order vendor picker (LSO-2)
- `diagnostic_order_items` migration (LSO-2)
- Barcode, PDF, send-out status (LSO-3, LSO-4)
- MOU document upload on vendor (optional — can stub UI; full upload uses existing contracted-org documents API if time permits, not blocking)
- `provider_admin` edit rights (view-only list OK in LSO-1 if list endpoint is shared)
- Deprecating generic `/contracted-organizations` UI (keep; lab-vendors is focused UX)

---

## Endpoints

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/platform/lab-vendors` | `withOrgAuth` |
| POST | `/api/platform/lab-vendors` | `withOrgAuth` + `assertSuperAdmin` |
| GET | `/api/platform/lab-vendors/:id` | `withOrgAuth` |
| PUT | `/api/platform/lab-vendors/:id` | `withOrgAuth` + `assertSuperAdmin` |
| PATCH | `/api/platform/lab-vendors/:id/status` | `withOrgAuth` + `assertSuperAdmin` |

Query params (list): `search`, `active`, `limit`, `offset`.

---

## Acceptance criteria

- [ ] Only `super_admin` can POST/PUT/PATCH vendor writes; others get **403**
- [ ] `platform_admin` (without hospital super_admin) gets **403** on writes
- [ ] Any org-authenticated user can GET list/detail for their org
- [ ] Create requires: name, code, (phone OR email), address line1, city
- [ ] `org_type` always stored as `laboratory`; not accepted from client as other types
- [ ] Duplicate code within org → **409** with safe message
- [ ] New vendors default to **active**
- [ ] Deactivate hides vendor from `?active=true` list (used by LSO-2 dropdown)
- [ ] List returns `{ items, total, limit, offset }`
- [ ] All routes have full Fastify response schemas (success + errors)
- [ ] UI: super_admin can add, edit, deactivate; non–super_admin sees list without write actions
- [ ] `npm run lint` + `npx tsc -b` (frontend); `npm run build` + tests (backend) green
- [ ] TD §9 matrix satisfied for this slice

---

## Approval

| Role | Name | Date | Status |
|------|------|------|--------|
| Product | Rahul | 2026-08-31 | Approved |
| Engineering | Rahul | 2026-08-31 | Approved |

**Implement plan:** [lab-send-out-vendors-lso-1-vendor-master.md](../../../../specs/features/his-global-south/lab-send-out-vendors-lso-1-vendor-master.md)
