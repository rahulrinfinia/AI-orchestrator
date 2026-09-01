# Slices — emergency-triage

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `emergency-triage` |
| **Branch** | `feat/emergency-triage` (off `feat/platform-admin-hospitals`) |
| **PRD** | [../prd.md](../prd.md) |
| **Technical design** | [../technical-design.md](../technical-design.md) |
| **G3 status** | **Pending** — fill Approval on each spec before implement |

## Dependency graph

```text
ET-1  Encounter model + roles + emergency inflow flag
  ├── ET-2  ER/doctor queue lists (Encounter sidebar filters + priority sort)
  └── ET-3  Emergency Triage form + priority engine + save API + doctor gate
        ├── ET-4  HIV/TB block (screening engine reuse, triage phase)
        ├── ET-5  Resuscitation alerts + doctor read-only triage summary
        └── ET-6  Order deep links (3)
```

ET-1 is the thinnest tracer — nothing else can be built without `encounter_type = emergency` actually producing `triage_status = pending` and the two new roles existing. ET-2 and ET-3 both depend only on ET-1 and can be built in either order (ET-2 is pure read/list, ET-3 is the write path) — sequenced ET-2 first so there's something to click into before the form exists. ET-4/ET-5/ET-6 all mount inside the ET-3 form and can be sequenced in any order once it exists.

## Slice index

| Slice | Goal | Depends on |
|-------|------|------------|
| [ET-1](./slice-1.md) | Encounter model extension + `ed_nurse`/`ed_doctor` roles + emergency inflow sets `triage_status=pending` | — |
| [ET-2](./slice-2.md) | ER nurse list + ED doctor list, both as filter presets on the existing Encounters queue, priority-sorted | ET-1 |
| [ET-3](./slice-3.md) | Emergency Triage form (core §9.3 sections) + priority engine (BR-3) + save API + doctor gate (BR-4) | ET-1 |
| [ET-4](./slice-4.md) | HIV/TB block — mount `ScreeningAssessments` at the `triage` phase, seed default questions | ET-3 |
| [ET-5](./slice-5.md) | P1 resuscitation alert fan-out (event bus + SSE) + doctor read-only triage summary | ET-3 |
| [ET-6](./slice-6.md) | Order deep links (Nursing/POC Orders, POC Result Entry, Medication Order) with encounter context | ET-3 |

## PRD acceptance-criteria coverage

| AC | Slice |
|----|-------|
| AC-1 Emergency inflow sets `triage_status = pending` | ET-1 |
| AC-2 ED nurse starts triage from Encounter list | ET-2 |
| AC-3 OPD encounter shows Intake, not Emergency Triage | ET-1 (BR-6 gate) |
| AC-4 `ed_nurse` can save full triage form | ET-3 |
| AC-5 `opd_nurse` cannot access emergency triage | ET-1 (role scoping — see technical-design.md §3) |
| AC-6 Any Emergency Sign YES → resuscitation banner + P1 + doctor alert | ET-3 (banner/P1), ET-5 (alert) |
| AC-7 All Emergency Signs NO → full form + P2/P3/P4 per rules | ET-3 |
| AC-8 Disposition required on save | ET-3 |
| AC-9 Doctor step blocked until triage complete | ET-3 (BR-4) |
| AC-10 `ed_doctor` sees triaged patients sorted P1 first | ET-2 |
| AC-11 `opd_doctor` does not see ED triage queue | ET-1 (role scoping) |
| AC-12 HIV/TB questions render from existing published Questionnaire | ET-4 |
| AC-13 Order links open existing modules with encounter context | ET-6 |
| AC-14 Billing unchanged | ET slices: no billing code. **ED auto-billing:** [emergency-billing](../emergency-billing/plan.md) (additive; OPD regression required) |
| AC-15 No new questionnaire/config table created | ET-4 (uses existing `assessment_definitions` etc., see technical-design.md §4) |

## Out of scope (all slices)

Per PRD §4 and technical-design.md — unchanged here:
- Billing module, OPD Intake, IPD auto-admission from disposition
- New sidebar menu, rebuilt order-entry UIs, separate ER vitals/HPI screen
- `emergency_triage_questionnaire_config` or any duplicate questionnaire storage
- `opd_nurse`/`opd_doctor` as literal new roles (technical-design.md §3, resolved)
- `hiv_tb_answers` column on `emergency_triage_records` (technical-design.md §4, resolved)
- Final, clinically-confirmed TEWS formula and Urgent Signs list — ET-3/ET-4 ship the provisional standard from technical-design.md §8.1/§8.2 behind a "Provisional" UI badge; real values are a pre-go-live follow-up, not a slice

## After you approve

Fill the Approval block on **ET-1** first (it's the dependency root), then say: plan ET-1 (or implement ET-1, if you want to skip a separate G4 planning pass for a slice this small). Do not implement any slice until its own Approval block is filled.
