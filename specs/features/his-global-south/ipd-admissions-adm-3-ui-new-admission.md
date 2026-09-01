# Slice adm-3 — New admission (walk-in)

**Project:** `his-global-south` | **Feature:** `ipd-admissions` | **Depends on:** adm-2

**Goal:** New admission with **Treating doctor required** + optional referring doctor.

---

## Flow

1. Patient search (reuse bed/orders search pattern)
2. Not found → `/patients/register?returnTo=/ipd/v1/admissions/new`
3. Form fields:
   - `admission_type`, `ward`, `reason` (required), `priority`, `notes`
   - **`admitting_provider_id` / Treating doctor (required)** — `DoctorSelect`
   - **Referring doctor (optional)** → maps to `advised_by` if selected
4. Submit → `POST /api/v1/ipd/admissions` → redirect to detail

---

## Acceptance

- [ ] Cannot submit without treating doctor
- [ ] Optional referring doctor sent as `advised_by`
- [ ] List shows both doctors after create
- [ ] Register redirect + provisional patients OK

---

## Files

| File | Action |
|------|--------|
| `src/pages/ipd/v1/admissions/NewAdmissionPage.tsx` | Create |
| `src/pages/ipd/v1/admissions/components/PatientSearchCard.tsx` | Create |
| Reuse `DoctorSelect.tsx` from adm-2 |
