# Intake — Patient registration: nationality & document type (hospital profile)

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature key** | `patient-registration-identity-profile` |
| **Requested by** | Rahul |
| **Date** | 2026-08-20 |
| **Target repo** | `apeiro-care/his-global-south` @ `develop` |
| **Domain** | Front Desk / `patient` + `frontdesk` |

---

## Summary

On **`/patients/register`** (full registration), add **jurisdiction-configurable document types** and **persist identity fields to the database**:

- **Nationality** = hospital org profile country — **auto-set, non-editable**
- **Document type** = dropdown from jurisdiction profile (filtered to hospital country)
- **Document number** = user entry
- **HIE** — **no change** (keep existing Search button + stub API as today; real registry + nationality/doc type in HIE = later slice)

---

## Problem today

- Document type dropdown is **hardcoded** (3 options) in `PatientRegister.tsx`.
- **Nationality** is editable and not reliably **saved to DB** on create/update.
- National ID is stored in `identifiers` JSON only; no dedicated **`identification_type`** column.
- HIE stub exists but is **out of scope** for this feature.

---

## Acceptance criteria (intake)

- [ ] Jurisdiction **identity profile** config (nationalities + document types per country)
- [ ] `GET /api/frontdesk/identity-profile` returns lists for active org jurisdiction
- [ ] Registration Step 1: locked nationality + profile-driven document type + document number
- [ ] DB migration: `nationality`, `identification_type`, `identification_number` on `patients`
- [ ] Create / update / complete-registration persist all three fields
- [ ] Patient detail and APIs return stored identity fields
- [ ] Emergency registration **unchanged**
- [ ] HIE Search **unchanged** v1 (button stays; no `hie-check` param changes)
- [ ] Tests: profile resolution, save/load, registration regression

---

## Out of scope (v1)

- Changes to existing HIE button or `hie-check` API (frozen in this PRD)
- Real Kenya DHA adapter (follow-on `patient-registration-hie` slice)
- Dependents from registry response
- Separate Client Registry landing page
- Editable nationality (foreign nationals need separate product decision / future config)
- IPD, check-in, intake changes

---

## References

- `src/pages/patients/PatientRegister.tsx`
- `backend/src/modules/frontdesk/patients/patients.service.ts`
- `backend/src/modules/patient/pgschema/patients.pgschema.ts`
- `organizations.jurisdiction_code`
- Emergency reg PRD: `prd/his-global-south/ipd-emergency-registration/`

---

## Intake status

**Awaiting Gate G1** on [prd.md](./prd.md).
