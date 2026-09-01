# Intake — Emergency patient registration (Front Desk)

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature key** | `ipd-emergency-registration` |
| **Requested by** | Rahul |
| **Date** | 2026-08-20 |
| **Target repo** | `apeiro-care/his-global-south` @ `develop` |
| **Domain** | Front Desk / `patient` + `frontdesk` (additive; feeds IPD) |

---

## Summary

On **`/patients/register`**, add **two entry buttons**:

1. **Register patient** — existing full 3-step wizard (unchanged behaviour)
2. **Emergency register** — Tier A mini-form for trauma / unknown identity

Emergency saves the **same `patients` row** with:

- `registration_mode = emergency`
- `is_registered = false`
- Defaults: first/last name **`Unknown`**, gender **`unknown`**, estimated DOB

Tier B fields (coverage, emergency contact, national ID, address, etc.) are **skipped** and completed later via **Complete registration**.

---

## Problem today

- Full registration requires name, DOB, gender, **emergency contact** — too slow for ER.
- No provisional / unknown patient path before IPD emergency admission.
- IPD HLD expects **emergency pathway** (`IPD-ADM-002/003`) but front door quick reg does not exist.

---

## Acceptance criteria (intake)

- [ ] Two buttons on registration page: **Register patient** | **Emergency register**
- [ ] Emergency: Tier A fields only; `registration_mode = emergency`
- [ ] Emergency: `is_registered = false`; provisional badge in UI
- [ ] Normal: `registration_mode = full`; `is_registered = true` (unchanged)
- [ ] **Complete registration** flow for provisional patients (all normal fields, edit later)
- [ ] API supports both modes without breaking existing `POST` patient create
- [ ] Optional handoff button: **Continue to IPD admission** (when `ipd_enabled`) — can be separate slice
- [ ] Tests: emergency create, complete registration, normal path unchanged

---

## Out of scope (v1 PRD)

- IPD admission API/UI (separate IPD slices 2–4)
- Email invite / mail system
- Patient merge/dedup automation for Unknown patients (manual search only v1)
- MCI / mass casualty numbering

---

## References

- Normal registration: `src/pages/patients/PatientRegister.tsx`
- Create patient: `backend/src/modules/frontdesk/patients/patients.service.ts`
- IPD HLD: emergency pathway IPD-ADM-002, IPD-ADM-003
- IPD tracer: `docs/journeys/his-global-south/ipd/admission-to-bed-tracer.md`

---

## Intake status

**Awaiting Gate G1** on [prd.md](./prd.md).
