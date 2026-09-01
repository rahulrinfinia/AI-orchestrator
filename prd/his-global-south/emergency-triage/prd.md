# PRD: Emergency Triage Module

| Field | Value |
|-------|-------|
| **Project** | `his-global-south` |
| **Feature key** | `emergency-triage` |
| **Product** | flowMD |
| **Module** | Emergency Triage |
| **Version** | 2.0 |
| **Status** | Ready for build (product) — **G2 technical design in progress**, see [technical-design.md](./technical-design.md) |
| **Reference** | Emergency Triage 1.docx + ER triage screenshots |
| **Author** | Product Engineering |
| **Source file** | `Downloads/flowMD-IPD/01-PRD/Emergency-Triage-PRD-v2.0.md` — brought into hub 2026-08-26, content below unchanged from product's original |

---

## 1. Summary

Add **Emergency Triage** for **emergency encounters only**, integrated into the existing **Encounter** journey. ED nurse triages from the **Encounter patient list**. ED doctor continues on the same encounter after triage is saved. OPD flow and Billing are unchanged.

---

## 2. Problem

Today, flowMD supports emergency registration at front desk and the standard Encounter flow (OPD: Intake → Doctor). There is **no Emergency Triage** step. Clinical staff cannot record ED acuity, priority, disposition, or resuscitation alerts before the doctor sees the patient.

---

## 3. Goals

| Goal | Success measure |
|------|-----------------|
| Triage before ED doctor | 100% emergency encounters have `triage_status = complete` before doctor step |
| Clinical safety | Any Emergency Sign = YES → P1 + resuscitation alert |
| Role separation | OPD users cannot access emergency triage or ED doctor queue |
| Minimal UX change | Reuse existing **Encounter** sidebar — no new top-level menu |

---

## 4. Out of scope

- Billing module (unchanged)
- OPD Intake (unchanged)
- New sidebar menu for triage
- Rebuilding order entry UIs (link to existing modules only)
- Separate ER vitals/HPI screen from reference system (Screen B in legacy EMR)
- IPD auto-admission from disposition (store disposition only)
- New database table for questionnaire/config (`emergency_triage_questionnaire_config` — **do not create**)

---

## 5. Users and roles

| Role | Code | Access |
|------|------|--------|
| Front desk | `registrar` (existing) | Emergency inflow / registration |
| ED / Triage nurse | `ed_nurse` (**new**) | Encounter list (ER) + Emergency Triage form (write) |
| Emergency doctor | `ed_doctor` (**new**) | Encounter list (triaged) + Doctor step + triage summary (read) |
| OPD nurse | `opd_nurse` (existing) | Intake only — **no triage** |
| OPD doctor | `opd_doctor` (existing) | OPD only — **no ED queue** |
| Super Admin | `superadmin` (existing) | Configure HIV/TB questions in existing Questionnaire |

> **Technical design note (resolved 2026-08-26):** `registrar`, `opd_nurse`, `opd_doctor` do **not** exist as distinct roles in the codebase today. `registrar` → existing `receptionist`; `superadmin` → existing `super_admin`; "OPD nurse/doctor" access is defined as generic `nurse`/`doctor` *without* the new `ed_nurse`/`ed_doctor` roles, rather than as literal new role values. Confirmed by product — see [technical-design.md §3](./technical-design.md#3-role-model-resolves-prd-5).

---

## 6. End-to-end flow

### 6.1 Emergency pathway

```
1. Front desk — emergency registration / inflow
2. System — create encounter:
     encounter_type = emergency
     triage_status = pending
     current_step = triage
3. ED nurse — Sidebar → Encounter → ER patient list → open patient
4. ED nurse — Emergency Triage form → Save
5. System — triage_status = complete, priority set, current_step = doctor
             If P1 → alert ed_doctor
6. ED doctor — Sidebar → Encounter → triaged list (priority sort) → Doctor step
7. Billing — existing module (unchanged)
```

### 6.2 OPD pathway (unchanged)

```
Front desk → Encounter → Intake → Doctor → Billing
(no Emergency Triage step)
```

---

## 7. Nurse entry point — Encounter list

**Start screen:** Existing **Encounter** sidebar item (not a new triage menu).

### 7.1 ED nurse list

**Default filter:**
- `encounter_type = emergency`
- `triage_status = pending`

| Column | Notes |
|--------|-------|
| Encounter No | |
| UMR | |
| Patient name | |
| Age / Gender | |
| Triage status | Pending |
| Time of arrival | |
| Action | Open |

### 7.2 ED doctor list

**Default filter:**
- `encounter_type = emergency`
- `triage_status = complete`
- `current_step = doctor`

| Column | Notes |
|--------|-------|
| Priority | P1–P4 colour badge |
| Encounter No | |
| Patient name | |
| Disposition | From triage |
| Action | Open |

### 7.3 Sort order

1. Priority: P1 → P2 → P3 → P4
2. Same priority: longest wait first (`arrived_at` ascending)

---

## 8. Encounter steps

| Encounter type | Steps |
|----------------|-------|
| `emergency` | **Emergency Triage** → **Doctor** |
| `opd` | **Intake** → **Doctor** (unchanged) |

Billing is **not** an encounter step — accessed via existing Billing module.

### 8.1 Before triage (ED nurse view)

```
● Emergency Triage    (active)
○ Doctor              (locked)
```

### 8.2 After triage (ED doctor view)

```
✓ Emergency Triage    (read-only summary)
● Doctor              (active)
```

---

## 9. Emergency Triage form

**Route (example):** Encounter detail → step `Emergency Triage`

### 9.1 Header (read-only)

- UMR
- Encounter No
- Patient name
- Age / Gender
- **Save** button

### 9.2 Template

| Field | Default |
|-------|---------|
| Template | Emergency Triage Adult |
| Saved Triage | Dropdown — load prior snapshot for this encounter (if any) |

### 9.3 Core sections (fixed in code — reference doc)

These sections are **built into the triage module**. They are **not** driven by Super Admin Questionnaire.

#### Chief complaints
- Free text

#### Emergency Signs (red border)
Six YES/NO dropdowns:

1. Not Breathing
2. Seizure (Current)
3. Burn (Facial / Inhalation)
4. Hypoglycemia (Glucose < 3)
5. Obstructed Airway (Not Breathing)
6. Cardiac Arrest

Checkbox: **NO EMERGENCY SIGN** (all six must be NO when checked)

#### Very Urgent Signs (orange border)
Checkbox list (reference doc):

- Level of consciousness reduced/confused
- Stabbed neck OR chest
- Threatened limb
- Burn circumferential
- Pregnancy and abdominal trauma
- High energy transfer (severe mechanism of injury)
- Hemorrhage - uncontrolled (arterial bleed)
- Dislocation of larger joint (not finger or toe)
- Burn - chemical
- Pregnancy and abdominal pain
- Shortness of breath (acute)
- Seizure - post ictal
- Fracture - compound (with a break in skin)
- Poisoning / Overdose
- Severe pain
- Coughing blood
- Focal Neurology - acute (stroke)
- Burn over 20%
- Diabetic - glucose over 11 & ketonuria
- Chest pain
- Aggression
- Burn - electrical
- Vomiting fresh blood

Checkbox: **No very urgent sign**

#### Urgent Signs (yellow border)
Checkbox section — **clinical sign-off required** for final list before go-live.
Checkbox: **No urgent sign**

#### TEWS (Triage Early Warning Score)

| Input field | Type |
|-------------|------|
| Respiration | Number |
| Heart Rate | Number |
| BP Systolic | Number |
| BP Diastolic | Number |
| SPO2 | Number |
| Temperature | Number |
| LMP | Date |
| Pain Score | Dropdown |
| Mobility | Dropdown |
| Trauma | Dropdown |
| TEWS Score | Calculated (read-only) |

Link: **HPI for Trauma** (if supported in product)

**TEWS formula:** Must be provided by clinical lead. Do not invent without sign-off.

#### Additional investigations

| Field |
|-------|
| RBS |
| Urine |
| ECG |
| POCT |
| Others |

All free text.

#### Disposition from triage (required — radio, one selection)

1. ITC - Critical Care Room A
2. ITC - Critical Care Room B
3. ITC - Surgical Room (Room 9)
4. ITC - Room 6
5. ITC - OBS / GYN Room
6. ITC - Isolation
7. Emergency Medical Centre (EMC)
8. General Clinic

#### Orders and procedures (links only)

Open **existing** flowMD modules — do not embed order UI in triage:

| Link | Requirement |
|------|-------------|
| Nursing and POC Orders | Deep link with encounter context |
| POC Result Entry | Deep link with encounter context |
| Medication Order | Deep link with encounter context |

Exact URLs/routes: **TBD by engineering** (existing order module paths).

### 9.4 HIV / TB section (from existing Super Admin Questionnaire)

**Only this block** is loaded from the **existing Super Admin → Questionnaire** module.

- Reuse existing Questionnaire storage, publish flow, and admin UI
- **Do not** create a new config table
- Super Admin configures HIV/TB questions; published questions render in triage form

**Default reference questions** (seed if Questionnaire empty):

| Question | Type |
|----------|------|
| Interested in HIV | YES / NO |
| Interested in TB | YES / NO |
| TB: Cough ≥2 weeks | YES / NO |
| TB: Night sweats ≥3 weeks | YES / NO |
| TB: Weight loss 2–3 months | YES / NO |
| TB: Fever ≥3 weeks | YES / NO |

Admin may add/edit/disable HIV/TB questions via existing Questionnaire — changes appear on triage form after publish.

---

## 10. Business rules

### BR-1 Resuscitation mode

**When:** Any of the six Emergency Signs = YES

**UI:**
- Red header indicator
- Banner: **Proceed for Resuscitation!**
- Hide: Very Urgent, Urgent, TEWS, Investigations, HIV/TB sections
- Show: Chief complaints, Emergency Signs, Orders links, Disposition, Save

**On save:**
- `priority = P1`
- `resuscitation_required = true`
- Alert all `ed_doctor` users

### BR-2 Full form mode

**When:** All six Emergency Signs = NO

**UI:** Show all sections (9.3 + 9.4)

### BR-3 Priority (evaluate in order — first match wins)

| Priority | Colour | Condition |
|----------|--------|-----------|
| P1 | Red | Any Emergency Sign = YES |
| P2 | Orange | All Emergency Signs NO + any Very Urgent sign checked |
| P3 | Yellow | All Emergency Signs NO + no Very Urgent + (any Urgent sign OR TEWS ≥ threshold) |
| P4 | Green | All Emergency Signs NO + none of above |

TEWS threshold: configurable; requires clinical sign-off.

### BR-4 Doctor gate

Doctor step is **locked** until `triage_status = complete`.

Only `ed_doctor` may access Doctor step on `encounter_type = emergency`.

### BR-5 Triage edit after save

Triage is **locked after Save** in v1.0.

### BR-6 OPD exclusion

Emergency Triage step must not appear when `encounter_type != emergency`.

### BR-7 SOP

Emergency Triage applies **only** to patients on the **emergency registration pathway** — not OPD.

---

## 11. Data model

**Database:** Align with existing flowMD stack (PostgreSQL assumed — confirm with engineering).

### 11.1 Encounter (extend existing table)

| Column | Type | Values |
|--------|------|--------|
| `encounter_type` | VARCHAR | `opd`, `emergency` |
| `triage_status` | VARCHAR | `pending`, `complete` (NULL for OPD) |
| `triage_priority` | VARCHAR | `P1`, `P2`, `P3`, `P4` |
| `triage_disposition` | VARCHAR | Disposition code |
| `resuscitation_required` | BOOLEAN | Default false |
| `current_step` | VARCHAR | `intake`, `triage`, `doctor` |
| `triaged_at` | TIMESTAMPTZ | |
| `triaged_by` | UUID | FK users |
| `arrived_at` | TIMESTAMPTZ | Set at emergency inflow |

### 11.2 `emergency_triage_records` (new)

One record per encounter (1:1).

| Column | Notes |
|--------|-------|
| `id` | UUID PK |
| `encounter_id` | UUID UNIQUE FK |
| `tenant_id`, `facility_id` | |
| `template_code` | Default `emergency_triage_adult` |
| `chief_complaint` | TEXT |
| `not_breathing`, `seizure_current`, `burn_facial_inhalation`, `hypoglycemia`, `obstructed_airway`, `cardiac_arrest` | YES/NO each |
| `no_emergency_sign` | BOOLEAN |
| `very_urgent_signs` | JSONB array |
| `no_very_urgent_sign` | BOOLEAN |
| `urgent_signs` | JSONB array |
| `no_urgent_sign` | BOOLEAN |
| `respiration`, `heart_rate`, `bp_systolic`, `bp_diastolic`, `spo2`, `temperature` | TEWS inputs |
| `lmp_date`, `pain_score`, `mobility`, `trauma` | TEWS inputs |
| `tews_score` | Calculated |
| `investigations` | JSONB `{rbs, urine, ecg, poct, others}` |
| `hiv_tb_answers` | JSONB — answers keyed to Questionnaire field ids |
| `disposition` | VARCHAR required |
| `priority` | P1–P4 |
| `resuscitation_required` | BOOLEAN |
| `created_by`, `created_at`, `updated_at` | Audit |

### 11.3 `emergency_triage_alerts` (new)

| Column | Notes |
|--------|-------|
| `id` | UUID PK |
| `encounter_id` | FK |
| `alert_type` | `RESUSCITATION` |
| `message` | Text |
| `target_role` | `ed_doctor` |
| `created_at` | |

### 11.4 HIV/TB configuration

**Use existing Super Admin Questionnaire tables and APIs.**
Do not create new questionnaire storage.

Engineering must map published Questionnaire entries to triage HIV/TB section (exact table/API names: **TBD — confirm in codebase**).

---

## 12. API requirements

Base: align with existing flowMD API convention.

| Method | Endpoint | Role | Description |
|--------|----------|------|--------------|
| GET | `/encounters` | ed_nurse, ed_doctor | List with filters |
| GET | `/encounters/:id` | authorized | Detail + step state |
| GET | `/encounters/:id/emergency-triage` | ed_nurse, ed_doctor | Load form + answers |
| POST | `/encounters/:id/emergency-triage` | ed_nurse | Save triage |
| GET | `/encounters/:id/emergency-triage/summary` | ed_doctor | Read-only summary |

**HIV/TB questions:** Load via **existing** Questionnaire published API (mapping key TBD in codebase).

**POST save — server must:**
1. Validate `encounter_type = emergency` and role `ed_nurse`
2. Validate all Emergency Signs answered; disposition required
3. Upsert `emergency_triage_records`
4. Apply BR-1, BR-3 priority logic
5. Set encounter `triage_status = complete`, `current_step = doctor`
6. If P1 → insert alert

Priority and resuscitation rules enforced on **backend**, not UI only.

---

## 13. UI requirements

| Requirement | Detail |
|-------------|--------|
| Navigation | Existing Encounter sidebar |
| Section borders | Red / Orange / Yellow per reference |
| Priority badges | P1 Red, P2 Orange, P3 Yellow, P4 Green |
| Resuscitation banner | Match reference screenshot text |

---

## 14. Integration points

| System | Integration |
|--------|-------------|
| Front desk inflow | Sets `encounter_type = emergency`, `triage_status = pending`, `arrived_at` |
| Encounter module | ER list + triage step + doctor gate |
| Existing Questionnaire | HIV/TB questions only |
| Existing order modules | Three deep links |
| Billing | No integration *(clinical triage only — see [emergency-billing PRD](../emergency-billing/prd.md) for ED receipt auto-lines; OPD billing unchanged)* |
| OPD Intake | No integration |

---

## 15. Acceptance criteria

| ID | Criteria |
|----|----------|
| AC-1 | Emergency inflow sets `triage_status = pending` |
| AC-2 | ED nurse starts triage from **Encounter list** (not new menu) |
| AC-3 | OPD encounter shows Intake, not Emergency Triage |
| AC-4 | `ed_nurse` can save full triage form |
| AC-5 | `opd_nurse` cannot access emergency triage |
| AC-6 | Any Emergency Sign YES → resuscitation banner + P1 + doctor alert |
| AC-7 | All Emergency Signs NO → full form + P2/P3/P4 per rules |
| AC-8 | Disposition required on save |
| AC-9 | Doctor step blocked until triage complete |
| AC-10 | `ed_doctor` sees triaged patients sorted P1 first |
| AC-11 | `opd_doctor` does not see ED triage queue |
| AC-12 | HIV/TB questions render from existing published Questionnaire |
| AC-13 | Order links open existing modules with encounter context |
| AC-14 | Billing unchanged *(superseded for **emergency auto-billing** only — see [emergency-billing](../emergency-billing/plan.md); OPD billing untouched)* |
| AC-15 | No new questionnaire/config table created |

---

## 16. Resolved decisions

| Decision | Answer |
|----------|--------|
| Entry point for nurse | **Encounter list** (ER filter) |
| New sidebar? | **No** |
| Full form source | **Fixed in code** (reference doc) |
| Questionnaire usage | **HIV/TB only** |
| New config table? | **No** |
| Phased release? | **No — full form in one release** |
| Edit triage after save? | **No** |
| ED doctor model | **Pool queue** — any `ed_doctor` |
| P1 trigger | **Any one** Emergency Sign = YES |
| Billing | **Unchanged** for OPD; ED auto-billing deferred to [emergency-billing](../emergency-billing/plan.md) |

---

## 17. Open items (engineering / clinical)

| ID | Item | Owner | Status |
|----|------|-------|--------|
| OI-1 | Confirm front desk sets `encounter_type = emergency` | Dev / BA | See [technical-design.md §2](./technical-design.md) |
| OI-2 | Confirm existing Questionnaire API/table names for HIV/TB mapping | Dev | **Resolved** — [technical-design.md §5](./technical-design.md) |
| OI-3 | Confirm existing order module deep link routes | Dev | **Resolved** — [technical-design.md §6](./technical-design.md) |
| OI-4 | TEWS formula sign-off | Clinical | Still open — needs clinical lead |
| OI-5 | Urgent Signs final list sign-off | Clinical | Still open — needs clinical lead |

---

## 18. Build checklist (for dev / AI agent)

1. Extend encounter model (Section 11.1)
2. Create `emergency_triage_records` + alerts tables
3. Add roles `ed_nurse`, `ed_doctor`
4. Front desk hook — emergency inflow flags
5. Encounter list — ER filter, columns, priority sort
6. Emergency Triage form UI — Section 9.3
7. HIV/TB block — load from existing Questionnaire (Section 9.4)
8. Resuscitation mode UI + backend (BR-1)
9. Priority engine backend (BR-3)
10. Save API + doctor gate (BR-4)
11. Doctor triage summary (read-only)
12. Order deep links (3)
13. QA all acceptance criteria (Section 15)

---

## 19. AI agent instruction

Build exactly per this PRD. Do not:
- Add new sidebar for triage
- Make full form Questionnaire-driven
- Create `emergency_triage_questionnaire_config` or duplicate Questionnaire storage
- Modify Billing or OPD Intake
- Rebuild order UIs inside triage
- Allow OPD roles on emergency triage queue

Nurse starts at: **Sidebar → Encounter → ER patient list → Open → Emergency Triage → Save.**

> **Process note (hub):** this project runs a PRD-gate workflow — this instruction is honored via [technical-design.md](./technical-design.md) (G2) and slice plans (G3/G4), each requiring explicit sign-off, rather than building directly off this file. See ticket.md.

---

## Appendix A — Disposition codes

| Code | Label |
|------|-------|
| `ITC_CRITICAL_A` | ITC - Critical Care Room A |
| `ITC_CRITICAL_B` | ITC - Critical Care Room B |
| `ITC_SURGICAL_9` | ITC - Surgical Room (Room 9) |
| `ITC_ROOM_6` | ITC - Room 6 |
| `ITC_OBS_GYN` | ITC - OBS / GYN Room |
| `ITC_ISOLATION` | ITC - Isolation |
| `EMC` | Emergency Medical Centre (EMC) |
| `GENERAL_CLINIC` | General Clinic |

---

*End of PRD v2.0 (as supplied by product; annotations added for hub tracking)*
