# Intake — Emergency Triage Module

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature key** | `emergency-triage` |
| **Date** | 2026-08-26 |
| **Branch (base)** | `feat/platform-admin-hospitals` |
| **Branch (feature)** | `feat/emergency-triage` (already created — today's patient-registration/ECCIF work lives here too) |
| **Depends on** | `patient-screening-assessments` (HIV/TB block reuses that engine's `triage` phase) |
| **Gate** | **G4 complete** — all 6 slices (ET-1 through ET-6) implemented and verified ([slices/status.yaml](./slices/status.yaml)) |

## Source

Product supplied a pre-written PRD (`Emergency-Triage-PRD-v2.0.md`, "Status: Ready for build", found at `C:\Users\RahulRanjan\Downloads\flowMD-IPD\01-PRD\`), referencing an internal doc (`Emergency Triage 1.docx`) and ER triage screenshots. Brought into the hub here per this project's PRD-gate workflow — v2.0 itself was not previously tracked in `prd/his-global-south/`.

## Why a technical design step, not straight to build

The PRD's own §19 says "build exactly per this PRD," but several of its claims don't hold against the actual codebase and need resolving before implementation:

- §5 marks `registrar`, `opd_nurse`, `opd_doctor` as "(existing)" roles — they aren't. The `app_role` enum has generic `doctor`/`nurse`/`receptionist` with no department split.
- §9.4 says HIV/TB reuses an "existing Super Admin Questionnaire" — this maps directly to the **screening assessment engine** already built this session (`backend/src/modules/screening/`), which already has a `triage` phase in its enum. High-confidence reuse, but needs to be stated explicitly so nobody re-builds it.
- §9.1/§11.1 the `encounter_type = 'emergency'` value already exists in the live `encounter_type` Postgres enum — no new enum work needed there, only new columns.
- OI-2 (Questionnaire API names) and OI-3 (order deep-link routes) are answerable now from the codebase rather than left "TBD."

See [technical-design.md](./technical-design.md) for the resolution of each.

## Git workflow

Already on `feat/emergency-triage` (branched from `feat/platform-admin-hospitals`, which already carries IPD admissions + platform admin + screening-engine work). No new branch needed.

```text
G1  PRD supplied by product (v2.0, "Ready for build")           ← done (external)
G2  technical-design.md                                          ← approved 2026-08-26
G3  6 slice specs written (ET-1 .. ET-6)                          ← done 2026-08-26
G4  ET-1 .. ET-6 planned, approved, implemented, verified live   ← done 2026-08-26 — YOU ARE HERE
    Remaining before go-live (not before merge): PR to feat/platform-admin-hospitals,
    clinical sign-off on the provisional TEWS threshold + Urgent Signs list (§8.1/§8.2),
    seeding real ed_nurse/ed_doctor accounts, and browser click-through
    (no browser automation tool was available this session)
```

## Docs

| Doc | Path |
|-----|------|
| PRD (brought into hub) | [prd.md](./prd.md) |
| Technical design | [technical-design.md](./technical-design.md) |
| Slice status | [slices/status.yaml](./slices/status.yaml) |
