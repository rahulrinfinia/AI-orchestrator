# IPD module (Inpatient Department)

Embedded IPD domain inside `his-global-south`. Slice 0 provides plugin registration and a health endpoint only.

## API prefix

`/api/v1/ipd/*`

## Slice 0

- `GET /api/v1/ipd/health` — module smoke check (no auth; mirrors root `/health`)

Future slices add admissions, capacity, ward, and discharge under this module without touching OPD routes.
