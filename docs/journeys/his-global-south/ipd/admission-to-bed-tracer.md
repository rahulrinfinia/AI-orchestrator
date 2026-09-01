# Admission → bed (IPD tracer) — v1.3

> Table: **`ipd_admissions_request`** (`ipd_{module}_{entity}`)  
> API: **`/api/v1/ipd/admissions/requests`**

1. OPD → `visit_admissions` (unchanged)
2. Event → **`INSERT ipd_admissions_request`**
3. ATD list → **`ipd_admissions_request`**
4. Bed assign → platform beds + update **`ipd_admissions_request`**
