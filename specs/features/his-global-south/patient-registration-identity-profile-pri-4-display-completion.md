# PRI-4 — Patient display and complete-registration identity

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `patient-registration-identity-profile` |
| **Slice** | PRI-4 |
| **Branch** | `feat/ipd-emergency-registration` |
| **Goal** | Show identity on chart/list; collect identity on complete-registration |
| **Depends on** | PRI-2, [PRI-3](./patient-registration-identity-profile-pri-3-registration-ui.md) |
| **Technical design** | [technical-design.md](../../../prd/his-global-south/patient-registration-identity-profile/technical-design.md) |
| **Status** | Approved — G3 slices approved 2026-08-20 |

---

## Approval

- [x] Product: demographics show nationality, doc type label, doc number
- [x] Tech: complete-registration uses same identity rules as full create
- [x] Scope: no new API endpoints

**Approved by:** User  
**Date:** 2026-08-20

---

## Scope

### PatientDetail.tsx

- Demographics tab/section: show nationality label (ISO → label helper or from patient.nationality)
- Show document type label (map code via cached profile or inline label lookup)
- Show `identificationNumber`

### PatientList.tsx

- Optional: show doc type/number in row or tooltip (minimal — at least on detail)

### Complete registration (`PatientRegister.tsx` with `?id=`)

- Load identity profile on completion mode
- Show locked nationality + doc type/number fields in Step 1 (same components as PRI-3)
- Submit via `completePatientRegistration` with identity fields
- Prefill existing patient identity values when present

## Out of scope

- HIE changes
- Emergency Tier A
- New backend endpoints (uses PRI-1/2 APIs)

## Files

```text
src/pages/patients/PatientDetail.tsx
src/pages/patients/PatientList.tsx
src/pages/patients/PatientRegister.tsx
src/pages/patients/identity-display.utils.ts  # optional label helpers
```

## Acceptance criteria

- [ ] Patient detail shows nationality, document type, document number
- [ ] Complete-registration wizard applies locked nationality + doc fields
- [ ] Successful completion persists identity columns (via existing complete API)
- [ ] Emergency patients without identity show empty fields until completion

## Validation

Manual: complete emergency patient → identity fields saved on completion.
