# Slice adm-2 — ATD list + detail UI

**Project:** `his-global-south` | **Feature:** `ipd-admissions` | **Depends on:** adm-1

**Goal:** Listing and detail with **Advising doctor** + **Treating doctor** display/edit.

---

## UI

### List (`/ipd/v1/admissions`)

- Table columns: patient, MRN, **Advising Dr**, **Treating Dr**, ward, priority, reason, status, date
- Filters: status tabs, priority, search (patient name/MRN)
- **New admission** button
- Row click → detail

### Detail (`/ipd/v1/admissions/:id`)

- Patient summary (read-only)
- **Advising doctor** — read-only (from OPD or walk-in referring)
- **Treating doctor** — select/save if `status=advised` and not yet set (PATCH)
- Assign bed **disabled** until treating doctor saved (adm-4)
- Cancel if advised

---

## Acceptance

- [ ] List shows both doctor columns
- [ ] OPD-advised row shows advising doctor name
- [ ] Detail allows set treating doctor via PATCH
- [ ] Cancel works
- [ ] Loading/error states

---

## Files

| File | Action |
|------|--------|
| `src/services/ipd-admissions.service.ts` | Create |
| `src/hooks/queries/useIpdAdmissions.ts` | Create |
| `src/pages/ipd/v1/admissions/components/DoctorSelect.tsx` | Create (reuse staff list API) |
| `src/pages/ipd/v1/admissions/components/AdmissionsListTable.tsx` | Create |
| `src/pages/ipd/v1/admissions/AdmissionDetailPage.tsx` | Create |
| `src/pages/ipd/v1/admissions/index.tsx` | Replace placeholder |
