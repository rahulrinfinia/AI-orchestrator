# Slice adm-1 — IPD Admissions API + DB

**Goal:** Table **`ipd_admissions_request`** + API **`/api/v1/ipd/admissions/requests`** + event handler.

**Naming:** ADR 0009 — `ipd_{module}_{entity}` → module=`admissions`, entity=`request`.

---

## Migration

Create **`public.ipd_admissions_request`** — DDL in [technical-design.md](../../prd/his-global-south/ipd-admissions/technical-design.md).

Files:

- `backend/src/db/migrations/NNN_ipd_admissions_request.sql`
- `backend/src/modules/ipd/pgschema/ipd-admissions-request.pgschema.ts`

**Do NOT** alter `visit_admissions`.

---

## Event handler

`admission.advised` → INSERT `ipd_admissions_request` (idempotent on `visit_admission_id`).

---

## Endpoints

| Method | Path |
|--------|------|
| GET | `/api/v1/ipd/admissions/requests` |
| GET | `/api/v1/ipd/admissions/requests/:id` |
| POST | `/api/v1/ipd/admissions/requests` |
| PATCH | `/api/v1/ipd/admissions/requests/:id` |

---

## Acceptance

- [ ] Table name is **`ipd_admissions_request`** (not `ipd_admissions`)
- [ ] API uses **`/admissions/requests`** path
- [ ] HLD fields: source, pathway, service, urgency, diagnosis_reason, admitting_provider_id
- [ ] Event + walk-in + org isolation tests
- [ ] Zero writes to `visit_admissions` from IPD code
