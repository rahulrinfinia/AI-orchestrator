# PRI-3 — Registration Step 1 identity UI

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `patient-registration-identity-profile` |
| **Slice** | PRI-3 |
| **Branch** | `feat/ipd-emergency-registration` |
| **Goal** | Locked nationality + profile-driven document type/number on full registration |
| **Depends on** | PRI-1, [PRI-2](./patient-registration-identity-profile-pri-2-identity-profile-api.md) |
| **Technical design** | [technical-design.md](../../../prd/his-global-south/patient-registration-identity-profile/technical-design.md) |
| **Status** | Approved — G3 slices approved 2026-08-20 |

---

## Approval

- [x] Product: Step 1 layout matches PRD; HIE Search unchanged
- [x] Tech: AD-6, AD-7; emergency path untouched (AD-10)
- [x] Scope: no detail/list display (PRI-4)

**Approved by:** User  
**Date:** 2026-08-20

---

## Scope

### Service layer

- `getIdentityProfile()` → `GET /api/frontdesk/identity-profile`
- Extend `Patient` type: `nationality`, `identificationType`, `identificationNumber`
- Extend `RegisterPatientPayload` with identity fields
- Export from `src/modules/clinical/index.ts`

### PatientRegister.tsx (full wizard only)

1. On full registration view mount: fetch identity profile
2. Replace editable nationality combobox with **read-only** display (`nationality_label`)
3. Replace hardcoded ID type select with profile `document_types`
4. Rename/wire document number field → `identificationNumber` (keep HIE Search on same row)
5. Zod: require `identificationType` + `identificationNumber`; remove editable `nationality` from user input (hidden/server-set)
6. Submit sends identity fields; map `identificationNumber` to dedup/HIE as `nationalId` when type is `national_id` (unchanged HIE call shape)
7. **Do not change** emergency view, entry choice, or steps 2–3

### UI order (Step 1)

1. Nationality (read-only)
2. Document type
3. Document number (+ HIE Search button — same behaviour)
4. First/middle/last name, DOB, gender

## Forbidden

- Changes to `checkHieRegistry` / hie-check API
- Emergency registration form
- IPD routes

## Files

```text
src/services/patients.service.ts
src/modules/clinical/index.ts
src/pages/patients/PatientRegister.tsx
src/pages/patients/__tests__/PatientRegister.identity-profile.test.tsx
src/services/__tests__/patients.service.test.ts
```

## Acceptance criteria

- [ ] Nationality displayed, not editable, matches profile response
- [ ] Document type dropdown from API (no hardcoded types in component)
- [ ] Document number required
- [ ] HIE Search button still present and functional (stub)
- [ ] Emergency register path unchanged
- [ ] Steps 2–3 unchanged

## Validation

```powershell
npm --prefix projects/his-global-south run test -- src/pages/patients/__tests__/PatientRegister.identity-profile.test.tsx
npm --prefix projects/his-global-south run lint:frontend
```
