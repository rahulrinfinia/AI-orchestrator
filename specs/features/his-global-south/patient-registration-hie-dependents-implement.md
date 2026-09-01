# HIE-DEP — RelatedPerson + stub dependents (combined implement spec)

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `patient-registration-hie-dependents` |
| **Branch** | `feat/ipd-emergency-registration` |
| **Status** | Approved — implement 2026-08-21 |

## Approval

- [x] Product: register principal vs dependent after HIE Search
- [x] Tech: FHIR RelatedPerson table `patient_related_persons`; not emergency contact
- [x] Scope: stub `99999999` only; no sandbox

**Approved by:** User  
**Date:** 2026-08-21

## Deliverables

- Migration `004_patient_related_persons.sql`
- Stub HIE returns 2 dependents
- `related_person` on POST patients / complete-registration
- GET patient includes `related_persons`
- UI choice dialog + patient detail section
