# Technical Design: IPD Admissions (ATD) — v1.3

| **PRD** | v1.3 | **Naming** | ADR 0009 `ipd_{module}_{entity}` |

---

## 1. Naming (locked)

| Layer | Admissions module |
|-------|-------------------|
| **DB table** | **`ipd_admissions_request`** |
| **pgschema file** | `ipd-admissions-request.pgschema.ts` |
| **API base** | `/api/v1/ipd/admissions/requests` |
| **UI** | `/ipd/v1/admissions` (ATD) |

Future tables (not MVP): `ipd_admissions_disposition`, `ipd_admissions_waitlist_entry`, `ipd_capacity_bed`, …

---

## 2. Architecture

```text
OPD → visit_admissions → admission.advised
              │
              ▼ read-only copy
        ipd_admissions_request   ← IPD SoR
              │
ATD API ─────► GET/POST/PATCH /api/v1/ipd/admissions/requests
              │
Bed assign ───► platform beds + UPDATE ipd_admissions_request
```

---

## 3. Table DDL — `ipd_admissions_request`

Migration: `NNN_ipd_admissions_request.sql`

```sql
CREATE TABLE IF NOT EXISTS public.ipd_admissions_request (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id),

  -- OPD linkage (read-only reference; IPD never writes visit_admissions)
  visit_admission_id uuid NULL REFERENCES public.visit_admissions(id) ON DELETE SET NULL,
  visit_id uuid NULL REFERENCES public.visits(id) ON DELETE SET NULL,
  encounter_id uuid NULL REFERENCES public.encounters(id) ON DELETE SET NULL,

  -- HLD M1 admission_request fields (embedded subset)
  source text NOT NULL DEFAULT 'walk_in'
    CHECK (source IN ('internal','external','opd','emergency','referral','walk_in','direct')),
  pathway text NOT NULL DEFAULT 'emergency'
    CHECK (pathway IN ('planned','emergency','direct','referral','theatre','maternity','readmission','observation')),
  service text NOT NULL DEFAULT 'general',
  urgency text NOT NULL DEFAULT 'routine'
    CHECK (urgency IN ('routine','urgent','emergency')),
  diagnosis_reason text NOT NULL,
  ward text NULL,
  unit_id uuid NULL REFERENCES public.units(id) ON DELETE SET NULL,
  notes text NULL,

  -- Doctors (profiles)
  advising_provider_id uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  admitting_provider_id uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- IPD workflow (MVP tracer; full disposition table later)
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','admitted','cancelled')),

  -- Bed placement (MVP denormalized; full M2 later)
  bed_id uuid NULL REFERENCES public.beds(id) ON DELETE SET NULL,
  admitted_at timestamptz NULL,
  cancelled_at timestamptz NULL,

  version bigint NOT NULL DEFAULT 1,
  created_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ipd_adm_req_org_status
  ON public.ipd_admissions_request (organization_id, status, created_at DESC);

CREATE INDEX idx_ipd_adm_req_patient
  ON public.ipd_admissions_request (organization_id, patient_id);

CREATE UNIQUE INDEX uq_ipd_adm_req_visit_admission
  ON public.ipd_admissions_request (visit_admission_id)
  WHERE visit_admission_id IS NOT NULL;
```

### Column guide

| Column | HLD / PRD meaning |
|--------|-------------------|
| `source` | `opd` when from OPD advise; `walk_in` / `direct` for ATD |
| `pathway` | LLD admission pathway enum |
| `urgency` | routine / urgent / emergency |
| `diagnosis_reason` | Admit reason (was `reason` in v1.2 draft) |
| `advising_provider_id` | OPD doctor who advised |
| `admitting_provider_id` | IPD treating / admitting clinician (HLD `admitting_clinician_id`) |
| `status` | `open` = in ATD queue; `admitted` = bed assigned |

---

## 4. Event handler

`admission.advised` → INSERT `ipd_admissions_request`:

- Map OPD `visit_admissions.priority` → `urgency` (elective→routine, urgent→urgent, emergency→emergency)
- Map `admission_type` → `pathway` where sensible (default `emergency`)
- `source = 'opd'`, `visit_admission_id` set, `advising_provider_id = advised_by`
- `status = 'open'`

Idempotent on `visit_admission_id`.

---

## 5. API

| Method | Path |
|--------|------|
| GET | `/api/v1/ipd/admissions/requests` |
| GET | `/api/v1/ipd/admissions/requests/:id` |
| POST | `/api/v1/ipd/admissions/requests` |
| PATCH | `/api/v1/ipd/admissions/requests/:id` |

Service reads/writes **`ipd_admissions_request` only**.

---

## 6. Module layout

```text
backend/src/modules/ipd/
├── pgschema/ipd-admissions-request.pgschema.ts
├── handlers.ts
└── admissions/
    ├── admissions.routes.ts    # full paths above
    └── admissions.service.ts
```

---

## 7. Boundaries

| | IPD touches? |
|--|--------------|
| `visit_admissions` | Read only (event + FK) |
| OPD clinical routes | No |
| `ipd_admissions_request` | Yes — create/migrate |

---

## 8. Bed assign (adm-4)

1. `POST /api/platform/beds/:id/admit` `{ patient_id }`
2. `UPDATE ipd_admissions_request SET bed_id, unit_id, status='admitted', admitted_at=now()`
