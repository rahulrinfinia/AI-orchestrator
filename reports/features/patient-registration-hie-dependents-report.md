# Report — patient-registration-hie-dependents

| Field | Value |
|-------|--------|
| **Plan** | `specs/features/his-global-south/patient-registration-hie-dependents-implement.md` |
| **Branch** | `feat/ipd-emergency-registration` |
| **Status** | Implemented |

## Summary

FHIR RelatedPerson storage + HIE stub dependents + registration UI choice dialog.

## Apply migration

Run `004_patient_related_persons.sql` on dev DB before E2E test.

## Test

Search National ID `99999999` + DOB → choose Jane Doe → register → patient detail shows guardian link.
