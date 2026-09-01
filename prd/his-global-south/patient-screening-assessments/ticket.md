# Intake — Patient Screening Assessments (HIV + TB, plug-and-play)

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature key** | `patient-screening-assessments` |
| **Date** | 2026-08-24 |
| **Branch (base)** | `develop` |
| **Branch (feature)** | `feat/patient-screening-assessments` (suggested — not yet created) |
| **Depends on** | none |
| **Gate** | **G1 pending** |

## Source

Management supplied two screenshots of conditional-branching screening forms (HIV risk assessment, TB symptom screening) with the instruction: add these to patient registration now, and be able to assign the same (or future) assessments to other phases — intake, triage — later, without rebuilding per phase.

Extracted content — both forms follow the same shape: one gate question ("Interested in HIV" / "Interested in TB", Yes/No), and if Yes, a fixed list of follow-up questions.

**HIV risk screening:**
1. What is your HIV status? (POSITIVE / NEGATIVE / UNKNOWN) — *if POSITIVE, discontinue assessment*
2. What is the HIV status of your sexual partner(s)? (POSITIVE / NEGATIVE / UNKNOWN)
3. Have you had sex without a condom with a partner(s) of unknown or positive HIV status? (Yes/No)
4. Have you engaged in sex in exchange of money or other favors? (Yes/No)
5. Have you been diagnosed with or treated for an STI? (Yes/No)
6. Have you shared needles while engaging in intravenous drug use? (Yes/No)
7. Have you been forced to have sex against your will or physically assaulted including assault by your sexual partner(s)? (Yes/No)

**TB symptom screening:**
1. Do you have a cough? For how long? (Yes if two weeks or more) (Yes/No)
2. Do you have night sweats? For how long? (Yes if three weeks or more) (Yes/No)
3. Have you lost weight in the past 2-3 months? (Yes/No)
4. Do you have fever or "hot body"? For how long? (Yes if three weeks or more) (Yes/No)

## Why this needs a design step, not a straight page edit

Hardcoding these two forms into the registration page would satisfy the immediate ask but not the "assign to any phase later" requirement — that requires a generic, versioned questionnaire engine (definition JSON schema) plus a separate phase-assignment layer, decoupled from any one page. See [technical-design.md](./technical-design.md).

## Sensitivity note

HIV status, partner status, STI history, IVDU, and sexual-assault questions are sensitive PHI beyond normal clinical data. Submission must emit into the existing `patient_audit_log` (per ADR 0004 — no PHI in the log body itself), not just be stored silently.

## Git workflow (proposed, mirrors ipd-admissions convention)

```powershell
cd projects/his-global-south
git fetch origin
git checkout develop
git pull origin develop
git checkout -b feat/patient-screening-assessments
```

```text
G1  ticket.md + technical-design.md                    ← YOU ARE HERE
G2  slice specs approved
G3  checkout develop → create feat/patient-screening-assessments → one slice at a time
G4  PR to develop + report + status.yaml → implemented
```

## Docs

| Doc | Path |
|-----|------|
| Technical design | [technical-design.md](./technical-design.md) |
| Slice status | [slices/status.yaml](./slices/status.yaml) |
