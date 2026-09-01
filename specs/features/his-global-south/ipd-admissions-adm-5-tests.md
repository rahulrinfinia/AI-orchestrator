# Slice adm-5 — Tests + report

**Project:** `his-global-south` | **Feature:** `ipd-admissions` | **Depends on:** adm-1, adm-3, adm-4

**Goal:** Tests including **doctor fields** + implementation report.

---

## Backend tests

- List includes `advising_doctor_name` for OPD-advised fixture
- POST rejects missing `admitting_provider_id`
- PATCH sets treating doctor
- Org isolation

## Frontend tests

- New admission validation — treating doctor required
- Assign bed disabled without treating doctor

## Report

`reports/features/ipd-admissions-report.md` — `ipd_admissions_request` naming + HLD M1 mapping.

---

## Acceptance

- [ ] Tests pass
- [ ] status.yaml all `implemented`
- [ ] Report mentions L8–L12 doctor decisions
