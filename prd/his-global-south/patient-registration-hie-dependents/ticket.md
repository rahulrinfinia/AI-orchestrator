# Intake — HIE dependent registration (RelatedPerson)

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature key** | `patient-registration-hie-dependents` |
| **Date** | 2026-08-21 |
| **Branch** | `feat/ipd-emergency-registration` |
| **Depends on** | `patient-registration-identity-profile` (PRI-1..5 done) |

## Summary

Extend HIE Search stub to return **main person + dependents**. When registering a **dependent**, persist FHIR **RelatedPerson** link in new `patient_related_persons` table (guardian ID from Search — not emergency contact).

## Acceptance criteria

- [ ] Stub `99999999` returns principal + 2 dependents
- [ ] UI: choose register principal vs dependent after Search
- [ ] `patient_related_persons` table (FHIR RelatedPerson aligned)
- [ ] Create patient with optional `related_person` → inserts RelatedPerson row
- [ ] GET patient returns `related_persons[]`
- [ ] Patient detail shows guardian/parent link
- [ ] Emergency contact unchanged (separate from guardian)
- [ ] Tests

## Out of scope

- Real AfyaLink sandbox
- `related_patient_id` auto-link when guardian registers later (follow-on)
