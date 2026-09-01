# PRD: Emergency patient registration (Front Desk)

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `ipd-emergency-registration` |
| **Version** | 1.0 draft |
| **Date** | 2026-08-20 |
| **Status** | Draft — **Gate G1 pending** |

---

## Background & Problem

Emergency departments often receive **unidentified or unstable patients**. Staff cannot wait for full intake (emergency contact, insurance, national ID).

Today **`/patients/register`** is a **3-step wizard** requiring:

- First name, last name, DOB, gender
- Emergency contact (name, relationship, phone) — **required**
- Coverage (optional step)

There is no **provisional patient** path. IPD architecture expects an **emergency admission pathway** (HLD: `IPD-ADM-002`, `IPD-ADM-003`) but the **front-door registration** step is missing.

### What we are building

Two buttons on the same registration page:

| Button | Mode | Result |
|--------|------|--------|
| **Register patient** | `registration_mode = full` | Today’s full wizard; `is_registered = true` |
| **Emergency register** | `registration_mode = emergency` | Tier A mini-form; `is_registered = false`; complete later |

---

## Goals & Success Metrics

| Goal | Metric | Target |
|------|--------|--------|
| ER can register unknown patient in seconds | Time to create provisional patient | &lt; 30 seconds UI path |
| Normal registration unchanged | Existing E2E / manual regression | No behaviour change on full path |
| Provisional patients identifiable | List/chart shows badge | 100% emergency creates |
| Complete later works | Staff can fill Tier B and set registered | 100% in staging |
| IPD-ready patient ref | Emergency create returns `patient_id` | Usable by IPD admission slice |

---

## User Personas

| Persona | Needs |
|---------|--------|
| **Reception / ER clerk** | Emergency button, minimal fields, fast save |
| **Registration clerk** | Full wizard unchanged; complete provisional records later |
| **Nurse / doctor** | See provisional badge; chart exists for orders/admission |
| **Hospital admin** | Audit trail of emergency vs full registration |

---

## Registration modes (locked)

| Field | Full registration | Emergency registration |
|-------|-------------------|------------------------|
| `registration_mode` | `full` | **`emergency`** |
| `is_registered` | `true` | **`false`** |
| UI | 3-step wizard | Tier A mini-form |
| Tier B fields | Collected now | **Deferred** |

---

## Tier A — Emergency capture now

| Field | DB / API key | Rule |
|-------|--------------|------|
| First name | `first_name` | Default **`Unknown`** (editable) |
| Last name | `last_name` | Default **`Unknown`** or auto **`Unknown-{seq}`** |
| Date of birth | `date_of_birth` | **Estimated** from age OR estimated date; flag `dob_estimated = true` (new column or json meta) |
| Gender | `gender` | Default **`unknown`** (`patients` check allows this) |
| Phone | `phone` | Optional |
| Note | `registration_note` or audit | Optional free text (“MVA”, “unconscious”) |
| Organization | `organization_id` | From session |
| Patient display ID | `patient_id` | Auto-generated (existing) |

**Set on save:**

```text
registration_mode = emergency
is_registered       = false
status              = active
```

**Skipped (Tier B — null / empty):** middle name, national ID, nationality, email, secondary phone, address, admin county/sub-county, emergency contact, coverage.

---

## Tier B — Complete later (same fields as normal registration)

All fields from full registration that were skipped:

### Demographics
`middle_name`, national ID / `identifiers`, nationality, exact `date_of_birth`

### Contact & address
`phone`, `secondary_phone`, `email`, `address`, `admin_county_code`, `admin_sub_county_code`

### Emergency contact
`emergency_contact_name`, `emergency_contact_relationship`, `emergency_contact_phone`

### Coverage
`insurer_id`, `insurer_plan_id`, member number, limits — via `patient_coverage`

**Complete registration** opens the **normal 3-step wizard** pre-filled with current values; on successful submit:

```text
registration_mode = full   (or keep emergency + set completed_at — G2 decision)
is_registered       = true
dob_estimated       = false (if was estimated)
```

---

## User workflows

### Workflow 1: Normal registration (unchanged)

1. User opens `/patients/register`.
2. Clicks **Register patient**.
3. Completes 3-step wizard (demographics → contact → coverage).
4. Duplicate check as today.
5. Save → `registration_mode=full`, `is_registered=true`.
6. Navigate to patient chart / list.

### Workflow 2: Emergency registration

1. User opens `/patients/register`.
2. Clicks **Emergency register** — **red button, white text** (see UI requirements below).
3. Sees Tier A mini-form with defaults (`Unknown`, `unknown`, estimated age).
4. Optional: phone, note.
5. Banner: *Insurance and emergency contact can be completed later.*
6. Save → `registration_mode=emergency`, `is_registered=false`.
7. Success options:
   - **Create only** → patient list with **Provisional** badge
   - **Create & continue to IPD** (if `ipd_enabled`) → out of scope v1 UI or thin deep-link placeholder for slice 2+

### Workflow 3: Complete registration (provisional → full)

1. User finds patient with **Provisional** badge (list or chart).
2. Clicks **Complete registration**.
3. Full 3-step wizard; Tier B fields empty; Tier A pre-filled.
4. Staff replaces `Unknown` with real identity when known.
5. Save → `is_registered=true`, mode updated to `full`.
6. Badge removed.

---

## User stories

### US-1: Two registration entry buttons

**As a** reception clerk  
**I want** separate **Register patient** and **Emergency register** buttons  
**So that** I pick the right flow without confusion

**Acceptance criteria:**

- [ ] Both buttons visible on `/patients/register` before wizard steps
- [ ] **Emergency register** button: **red background, white text** — same component system as existing buttons (shadcn `Button`); use `destructive` variant or project emergency token; must read clearly as urgent
- [ ] **Register patient** button: existing primary/default style (unchanged)
- [ ] Normal button opens existing 3-step flow
- [ ] Emergency button opens Tier A mini-form only

**Priority:** Must Have

---

## UI requirements (locked)

| Element | Style |
|---------|--------|
| **Emergency register** | Red background + **white text**; same size/spacing/radius as primary buttons on page |
| **Register patient** | Existing primary/default — no change |
| **Layout** | Side by side at top of `/patients/register`; emergency visually distinct but not breaking app theme |
| **Look & feel** | Reuse existing `Button`, `Card`, typography — no custom one-off styling outside design system |

### Tags / badges for emergency patients (identification)

Emergency-created patients must be **visually obvious** wherever the name appears:

| Where | Tag | Style |
|-------|-----|--------|
| **Patient list** (`/patients`) | **`EMERGENCY`** + optional **`INCOMPLETE`** | `EMERGENCY`: red bg, white text (matches emergency button). Existing amber **INCOMPLETE** may remain when `is_registered=false` |
| **Patient chart header** (`/patients/:id`) | **`Emergency registration`** or **`EMERGENCY`** | Red destructive badge (extend existing **Incomplete Registration** badge — show **Emergency · Incomplete** when `registration_mode=emergency`) |
| **After complete registration** | Tags **removed** | When `is_registered=true` and mode `full` — show normal **Active Profile** only |

**Rule:** `registration_mode === 'emergency'` **and** `is_registered === false` → show emergency tag.  
**CTA on chart:** **Complete registration** button (already exists for incomplete — keep/enhance for emergency).

Optional v1: filter on patient list — **Show emergency only**.

---

### US-2: Emergency Tier A create

**As a** ER clerk  
**I want** to register an unknown patient with minimal fields  
**So that** clinical care and IPD admission can proceed immediately

**Acceptance criteria:**

- [ ] Defaults: first/last `Unknown`, gender `unknown`
- [ ] Estimated age or DOB required (DB NOT NULL on `date_of_birth`)
- [ ] `registration_mode=emergency`, `is_registered=false`
- [ ] Tier B not required on emergency path
- [ ] Returns patient id for downstream IPD

**Priority:** Must Have

---

### US-3: Normal registration unchanged

**As a** product owner  
**I want** full registration behaviour preserved  
**So that** OPD intake is not regressed

**Acceptance criteria:**

- [ ] Same required fields and validation as today on full path
- [ ] `registration_mode=full`, `is_registered=true`
- [ ] Duplicate check behaviour unchanged on full path

**Priority:** Must Have

---

### US-4: Complete registration later

**As a** registration clerk  
**I want** to complete a provisional patient when details are available  
**So that** billing and records are accurate

**Acceptance criteria:**

- [ ] Provisional badge on list/chart when `is_registered=false`
- [ ] **Complete registration** opens full wizard with pre-fill
- [ ] After complete: `is_registered=true`, badge gone
- [ ] All Tier B fields savable

**Priority:** Must Have

---

### US-5: Database mode column

**As a** engineer  
**I want** `registration_mode` persisted  
**So that** reporting and UI can distinguish emergency vs full

**Acceptance criteria:**

- [ ] Migration adds `registration_mode` enum/text: `full` | `emergency`
- [ ] Default `full` for existing rows
- [ ] Optional: `dob_estimated` boolean

**Priority:** Must Have

---

## Scope

### In scope

- Migration: `patients.registration_mode` (+ optional `dob_estimated`)
- Backfill existing patients: `registration_mode = full`
- API: extend create patient OR `POST .../patients/emergency` with Tier A contract
- API: complete registration endpoint or reuse update with validation rules
- UI: dual buttons, emergency mini-form, provisional badge, complete registration entry
- Tests: unit + integration for both paths

### Out of scope

- IPD admission create UI/API (slices 2–4) — optional deep-link only
- Automatic duplicate merge for Unknown patients
- Email / SMS to emergency contact
- Changes to IPD tables
- Relaxing check-in rules globally (align separately if needed; check-in already has `override`)

---

## Edge cases

| Case | Expected behaviour |
|------|---------------------|
| Multiple Unknown same day | Auto suffix `Unknown-001`, `Unknown-002` on last name or display alias |
| User switches mid-flow | Cancel returns to button chooser |
| Complete registration with duplicate real patient | Show duplicate warning; staff merges manually (v1) |
| Emergency with known name | Staff can edit defaults before save |
| `ipd_enabled=false` | Hide “Continue to IPD” if added |
| Deceased patient | Cannot complete registration to active visit (existing rules) |

---

## Design references

- UI: `src/pages/patients/PatientRegister.tsx`
- Service: `backend/src/modules/frontdesk/patients/patients.service.ts`
- Schema: `backend/src/modules/patient/pgschema/patients.pgschema.ts`
- IPD journey: `docs/journeys/his-global-south/ipd/admission-to-bed-tracer.md`
- Architecture: additive only — no OPD table rewrites beyond `patients` columns

---

## Dependencies

| Dependency | Notes |
|------------|--------|
| `his-global-south` clone | `projects/his-global-south/` |
| Better Auth session | Existing front desk auth |
| IPD admission (optional next) | Uses `patient_id` from this feature |

---

## Suggested slice split (for G3)

| Slice | Goal |
|-------|------|
| **ER-1** | DB + API emergency create + Tier A |
| **ER-2** | UI two buttons + emergency form + badges |
| **ER-3** | Complete registration flow + tests |

IPD admission handoff = **IPD slice 2–4** (separate).

---

## Approval (Gate G1)

- [ ] Product — Tier A/B split and `registration_mode=emergency` accepted
- [ ] Product — normal path unchanged accepted
- [ ] Tech — slice split acceptable
- [ ] **Approved by:** ___
- [ ] **Date:** YYYY-MM-DD

**Agent rule:** Do not proceed to technical design until all boxes are checked.

---

## Next step after G1 approval

```text
PRD approved for his-global-south ipd-emergency-registration. Proceed to technical design.
```
