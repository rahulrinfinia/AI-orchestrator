# PRD: Patient registration — nationality & document type (hospital profile)

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `patient-registration-identity-profile` |
| **Version** | 1.0 draft |
| **Date** | 2026-08-20 |
| **Status** | Draft — **Gate G1 approved** |

---

## Background & Problem

Front desk registers patients at **`/patients/register`**. The full 3-step wizard collects demographics, contact, and coverage. Step 1 already shows **nationality**, **ID type**, and **ID number**, but:

| Issue | Detail |
|-------|--------|
| Nationality UX | Editable; should reflect **hospital country** and be **locked** |
| Document types | Hardcoded list in UI — not configurable per deploy country |
| Database | `nationality` and document type are **not persisted** on `createPatient` today; ID number mainly lives in `identifiers` JSONB |
| HIE | Stub only — **not in scope for this PRD** |

This PRD delivers **config-driven document types**, **locked hospital nationality**, and **reliable DB storage**. **Existing HIE UI and stub API stay as they are today** — real registry connect and sending nationality/doc type to HIE is a **follow-on slice**.

---

## Goals

| Goal | Success |
|------|---------|
| Hospital-scoped nationality | Every registration shows org country as nationality; user cannot change it |
| Configurable document types | Kenya vs UAE lists without UI code changes |
| Durable identity storage | Query/report on nationality, type, number |
| Minimal disruption | Same registration page; steps 2–3 unchanged; emergency path unchanged |

---

## Non-goals (v1)

- Changing existing HIE Search button behaviour or removing it
- Extending `GET /api/frontdesk/patients/hie-check` (nationality / doc type params)
- Kenya DHA / AfyaLink credentials or adapter
- Client Registry as a separate page
- Registering foreign nationals with a different nationality (nationality locked — see §Open decisions)
- IPD bed assignment or check-in flow changes

---

## Locked product decisions (2026-08-20)

| # | Decision |
|---|----------|
| L1 | **Nationality default** = logged-in hospital **`organizations.jurisdiction_code`** (ISO alpha-2, e.g. `KE`). Fallback: `organizations.address.country` mapped to ISO code. |
| L2 | **Nationality is non-editable** on full registration (read-only display / disabled control). |
| L3 | **Document type list** comes from **jurisdiction identity profile** config for the hospital’s jurisdiction. |
| L4 | **Persist** `nationality`, `identification_type`, `identification_number` on **`patients`** table (dedicated columns). |
| L5 | **HIE unchanged v1** — keep existing Search button and `hie-check` stub as-is; no HIE API/param work in this feature. |

---

## Jurisdiction identity profile

### Purpose

Define which **document types** are valid for a deployment jurisdiction. Nationality on the form is **not chosen from this list** — it is **fixed to the hospital** (L1–L2). The profile still drives **document type** options.

### Config location (v1)

```
backend/src/config/identity-profiles/{jurisdiction_code}.json
```

Example files: `KE.json`, `default.json` (fallback).

### Config schema

```json
{
  "jurisdiction_code": "KE",
  "default_nationality": "KE",
  "document_types": [
    {
      "code": "national_id",
      "label": "National ID",
      "hie_identification_type": "National ID"
    },
    {
      "code": "passport",
      "label": "Passport",
      "hie_identification_type": "Passport"
    },
    {
      "code": "alien_id",
      "label": "Alien ID",
      "hie_identification_type": "Alien ID"
    },
    {
      "code": "birth_certificate",
      "label": "Birth Certificate",
      "hie_identification_type": "Birth Certificate"
    }
  ]
}
```

| Field | Use |
|-------|-----|
| `code` | Stored in `patients.identification_type` |
| `label` | Registration dropdown |
| `hie_identification_type` | Reserved for future HIE slice (not used v1) |

`default_nationality` must match hospital jurisdiction for single-country deploys.

### API: expose profile to UI

**`GET /api/frontdesk/identity-profile`**

- Auth: org session (`withOrgAuth`)
- Resolve jurisdiction: `organizations.jurisdiction_code` for `req.auth.organizationId`
- Response:

```json
{
  "jurisdiction_code": "KE",
  "nationality": "KE",
  "nationality_label": "Kenya",
  "nationality_editable": false,
  "document_types": [
    { "code": "national_id", "label": "National ID" }
  ]
}
```

`nationality` on response = **hospital locked value** (from org, not user input).

---

## User flows

### Flow 1 — Full registration (primary)

1. User opens **`/patients/register`** → **Register patient**.
2. App loads identity profile + org nationality.
3. **Step 1 — Identity**
   - **Nationality:** displayed as hospital country (e.g. Kenya) — **disabled, not editable**
   - **Document type:** required dropdown from profile
   - **Document number:** required or optional per hospital policy (default: required when type selected)
   - **HIE Search:** **unchanged** — same button and flow as today (`checkHieRegistry` / stub `hie-check`; still uses existing national ID + DOB behaviour until HIE slice)
   - Remaining demographics: name, DOB, gender (unchanged)
4. **Step 2–3:** contact, emergency contact, coverage — **unchanged**
5. Submit → `registration_mode = full`, `is_registered = true`, identity columns saved

### Flow 2 — Emergency registration

**Unchanged** — [ipd-emergency-registration](../ipd-emergency-registration/prd.md). Tier A skips nationality/doc type v1; complete-registration may collect identity fields later (separate ER-3 scope).

### Flow 3 — Complete registration (provisional → full)

When completing an emergency patient, apply same locked nationality + document type fields and persist to DB.

---

## UI requirements

### Step 1 layout (full registration)

Order:

1. Nationality (read-only badge or disabled select showing label e.g. “Kenya”)
2. Document type (select)
3. Document number (text input)
4. First / middle / last name
5. DOB, gender
6. Merge/replace legacy hardcoded ID type block with profile-driven type + number (HIE Search control stays on same row as today)

### Validation

- `identification_type`: required; must be valid code from profile
- `identification_number`: required for types where configured (all types required v1 unless product overrides)
- Nationality on submit must equal org jurisdiction (server-enforced even if UI tampered)

### Patient detail / list

Show nationality label, document type label, and document number on patient overview where demographics appear.

---

## Database & API

### Migration (required)

Add columns to **`public.patients`**:

| Column | Type | Nullable | Notes |
|--------|------|----------|--------|
| `nationality` | `text` | YES | ISO alpha-2; set from org on create |
| `identification_type` | `text` | YES | Profile `code` |
| `identification_number` | `text` | YES | Plain text; index optional |

Update `backend/src/modules/patient/pgschema/patients.pgschema.ts` + SQL migration under `backend/src/db/migrations/`.

**Backward compatibility:**

- Keep `identifiers` JSONB populated for national ID when type is `national_id` (sync on write) so existing dedup/HIE stub paths do not break until HIE slice.
- Existing rows: NULL identity columns until backfill or next edit.

### Create / update patient API

Extend `POST /api/frontdesk/patients` and `PUT /api/frontdesk/patients/:id` body:

| Field | API key |
|-------|---------|
| Nationality | `nationality` — server may **ignore client value** and set from org jurisdiction |
| Document type | `identification_type` |
| Document number | `identification_number` |

Server validation:

- Reject `identification_type` not in active profile
- Force `nationality = org.jurisdiction_code` (or resolved ISO from org)

### Read patient API

Include `nationality`, `identification_type`, `identification_number` in GET patient responses (snake_case JSON).

---

## HIE — no change in this PRD

**Keep as-is today:**

- Registration UI: **Fetch from HIE Registry** / Search button **remains** (same placement and behaviour)
- Frontend: `checkHieRegistry(national_id, dob?)` → `GET /api/frontdesk/patients/hie-check`
- Backend: `getHieRegistryRecord` stub (test ID `99999999`)

**This PRD does not modify HIE** — no new params, no hide/disable, no adapter work.

Follow-on feature `patient-registration-hie` (later) may:

- Pass `identification_type` + `nationality` to HIE
- Use profile `hie_identification_type`
- Wire Kenya DHA when credentials exist

---

## Security

- Server enforces nationality = org jurisdiction (prevent API tampering).
- Document numbers org-scoped via existing RLS on `patients`.
- No new public endpoints without auth.

---

## Acceptance criteria

### AC-1 Profile

- [ ] `KE.json` (and `default.json`) ship with document types in this PRD
- [ ] `GET /api/frontdesk/identity-profile` returns locked nationality + document types for org jurisdiction

### AC-2 Registration UI

- [ ] Nationality shown, **not editable**, matches hospital profile
- [ ] Document type dropdown driven by profile (no hardcoded types in component)
- [ ] HIE Search button still present; existing stub flow unchanged

### AC-3 Database

- [ ] Migration applied; columns exist on `patients`
- [ ] New full registration writes all three identity fields
- [ ] Update / complete-registration writes fields when provided

### AC-4 Regression

- [ ] Emergency register behaviour unchanged
- [ ] Steps 2–3 unchanged
- [ ] Dedup by national ID still works (via `identification_number` and/or `identifiers` sync)

### AC-5 Tests

- [ ] Backend: nationality forced from org; invalid type rejected
- [ ] Frontend: disabled nationality; profile-driven doc types
- [ ] Integration: create patient persists columns

---

## Implementation slices (post G1)

| Slice | Deliverable |
|-------|-------------|
| **PRI-1** | Migration + pgschema + read/write in patient service |
| **PRI-2** | Identity profile JSON + `GET identity-profile` |
| **PRI-3** | Registration Step 1 UI (locked nationality, doc type, number) |
| **PRI-4** | Patient detail/list display + complete-registration |
| **PRI-5** | Tests |

**Future PRI-HIE:** Extend `hie-check` + real DHA adapter (Search button already exists).

---

## Open decisions (G1)

| # | Question | Recommendation |
|---|----------|----------------|
| 1 | Document number required for all types? | **Yes** v1 |
| 2 | Foreign patient at same hospital | **Out of scope** — nationality locked; revisit with `nationality_editable` org flag later |
| 3 | Dedup: match on `identification_number` + `identification_type`? | **Yes** extend dedup query |

---

## References

| Item | Path |
|------|------|
| Registration UI | `projects/his-global-south/src/pages/patients/PatientRegister.tsx` |
| Create patient | `backend/src/modules/frontdesk/patients/patients.service.ts` |
| Patients schema | `backend/src/modules/patient/pgschema/patients.pgschema.ts` |
| Org jurisdiction | `backend/src/modules/platform/pgschema/organizations.pgschema.ts` |
| Jurisdiction env | `backend/src/config/jurisdiction.ts` |
| Emergency PRD | `prd/his-global-south/ipd-emergency-registration/prd.md` |

---

## Gate status

| Gate | Status |
|------|--------|
| G1 Product approve PRD | **Approved** |
| G2 Technical design | **Approved** — [technical-design.md](./technical-design.md) |
| G3 Slice specs | **Approved** — PRI-1..PRI-5 in `specs/features/his-global-south/` |
| G4 Implement in clone | Not started |
