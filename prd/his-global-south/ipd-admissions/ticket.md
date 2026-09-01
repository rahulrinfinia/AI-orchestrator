# Intake — IPD Admissions (ATD)

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature key** | `ipd-admissions` |
| **Date** | 2026-08-21 |
| **Branch (base)** | `develop` |
| **Branch (feature)** | `feat/ipd-admissions-atd` |
| **Depends on** | `ipd-slice-0-scaffold` (implemented) |
| **Gate** | **G1 pending** |

## Summary

IPD **ATD** — table **`ipd_admissions_request`** (`ipd_{module}_{entity}` per ADR 0009 / HLD M1). API `/api/v1/ipd/admissions/requests`. OPD unchanged.

## Git workflow (locked)

**Always branch from latest `develop` — not from `feat/ipd-emergency-registration` or other feature branches.**

```powershell
cd projects/his-global-south   # or C:\projects\HISGlobalSouth\his-global-south
git fetch origin
git checkout develop
git pull origin develop
git checkout -b feat/ipd-admissions-atd
```

One feature branch for all adm-0 … adm-5 slices. Merge to `develop` via PR when feature complete.

```text
G1  ticket.md + prd.md + technical-design.md  ← YOU ARE HERE
G2  slice specs adm-0 … adm-5 approved
G3  checkout develop → create feat/ipd-admissions-atd → one slice at a time
G4  PR to develop + report + status.yaml → implemented
```

## Docs

| Doc | Path |
|-----|------|
| PRD | [prd.md](./prd.md) |
| Technical design | [technical-design.md](./technical-design.md) |
| Slice status | [slices/status.yaml](./slices/status.yaml) |
