# PRD: IPD Admissions — ATD (Admission Transfer Desk)

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `ipd-admissions` |
| **Version** | 1.3 draft |
| **Date** | 2026-08-21 |
| **Status** | Draft — **Gate G1 pending** (v1.3 — HLD/ADR table naming) |
| **Branch (base)** | `develop` |
| **Branch (feature)** | `feat/ipd-admissions-atd` |

**Naming (locked):** [ADR 0009](../../../docs/decisions/his-global-south/0009-ipd-naming-and-versioning.md) — DB `ipd_{module}_{entity}` → **`ipd_admissions_request`**

---

## 1. Problem

IPD needs its **own admission data** (not OPD `visit_admissions`). Must align with flowMD HLD **M1 Admissions** and hub naming **`ipd_admissions_*`**.

---

## 2. Solution (MVP)

**ATD** under sidebar **IPD → ATD**.

### IPD table (MVP)

| Table | Module | HLD equivalent |
|-------|--------|----------------|
| **`ipd_admissions_request`** | admissions | M1 `admission_request` |

Future (post-MVP): `ipd_admissions_disposition`, `ipd_admissions_waitlist_entry`, `ipd_capacity_*`.

### API (aligned HLD / OpenAPI)

| Method | Path |
|--------|------|
| GET/POST | `/api/v1/ipd/admissions/requests` |
| GET/PATCH | `/api/v1/ipd/admissions/requests/:id` |

### Reuse

| Asset | Use |
|-------|-----|
| `visit_admissions` | OPD only — **read** via `visit_admission_id` FK |
| `admission.advised` event | Create `ipd_admissions_request` |
| Platform beds API | Physical bed assign |
| Patient register/search | Redirect / search |

### OPD

**Unchanged** — no writes from IPD to OPD tables.

---

## 3. Locked decisions

| ID | Decision |
|----|----------|
| L1 | DB naming: **`ipd_{module}_{entity}`** — MVP entity = **`ipd_admissions_request`** |
| L2 | IPD SoR = **`ipd_admissions_request`** only — never write `visit_admissions` |
| L3 | OPD link: nullable **`visit_admission_id`** FK (unique) |
| L4 | API path: **`/api/v1/ipd/admissions/requests`** (not flat `/admissions`) |
| L5 | Bed assign: platform beds + update **`ipd_admissions_request`** |
| L6 | Status MVP: **`open`** → **`admitted`** \| **`cancelled`** (maps HLD `open` / disposed accept / cancel) |
| L7 | **Advising doctor:** `advising_provider_id` |
| L8 | **Treating doctor:** `admitting_provider_id` (required before bed) |
| L9 | **Source** enum: `opd`, `walk_in`, `direct`, `emergency`, `referral` (HLD-aligned) |
| L10 | Sidebar **ATD**; branch **`feat/ipd-admissions-atd`** from **`develop`** |
| L11 | OPD clinical **unchanged** |

---

## 4. HLD field mapping (M1 admission_request → embedded MVP)

| HLD / LLD (M1) | `ipd_admissions_request` column | MVP |
|----------------|----------------------------------|-----|
| `admission_request_id` | `id` | ✅ |
| `facility_id` / tenant | `organization_id` | ✅ (embedded org scope) |
| `patient_ref` | `patient_id` | ✅ |
| `encounter_id` | `encounter_id` | ✅ |
| `source` | `source` | ✅ |
| `pathway` | `pathway` | ✅ |
| `service` | `service` | ✅ default `general` |
| `urgency` | `urgency` | ✅ routine/urgent/emergency |
| `diagnosis_reason` | `diagnosis_reason` | ✅ |
| `admitting_clinician_id` | `admitting_provider_id` | ✅ treating doctor |
| `requested_location_id` / ward | `ward`, `unit_id` | ✅ |
| `status` | `status` | ✅ open/admitted/cancelled |
| — | `advising_provider_id` | ✅ OPD advise / referring |
| — | `visit_admission_id` | ✅ OPD FK link |
| — | `bed_id`, `admitted_at` | ✅ MVP tracer (full LLD → M2 later) |

---

## 5. User flows

### A — OPD advised

OPD → `visit_admissions` → event → **`ipd_admissions_request`** → ATD list → treating doctor → bed → `admitted`.

### B — Walk-in

POST **`/api/v1/ipd/admissions/requests`** → bed assign.

### C — Cancel

PATCH `status = cancelled`.

---

## 6. Screens

| Route | Backed by |
|-------|-----------|
| `/ipd/v1/admissions` | `ipd_admissions_request` list |
| `/ipd/v1/admissions/new` | POST request |
| `/ipd/v1/admissions/:id` | GET/PATCH request |

---

## 7. Non-goals (MVP)

- `ipd_admissions_disposition` table (single PATCH status for now)
- `ipd_capacity_*` (platform beds reuse)
- OPD UI/schema changes

---

## 8. Slices

adm-0 … adm-5 unchanged; **adm-1** creates **`ipd_admissions_request`**.

---

## 9. References

- HLD M1 / LLD §22.6 `m1_admission.admission_request`
- [his-global-south architecture](../../../docs/architecture/his-global-south.md) §3
- [patterns](../../../docs/conventions/his-global-south-patterns.md)
