# Slice adm-4 — Bed assign from ATD

**Project:** `his-global-south` | **Feature:** `ipd-admissions` | **Depends on:** adm-2

**Goal:** Bed assign only when **treating doctor** is set.

---

## Flow

1. Detail: **Assign bed** enabled only if `admitting_provider_id` present
2. If OPD-advised and no treating doctor → prompt to select treating doctor first (PATCH)
3. Bed picker → `POST /api/platform/beds/:id/admit` with `{ patient_id }` only
4. IPD updates **`ipd_admissions_request`**: bed_id, unit_id, status=`admitted`, admitted_at
5. Refresh detail

---

## Acceptance

- [ ] Assign blocked without treating doctor (UI + user message)
- [ ] Assign succeeds when treating doctor set
- [ ] List shows admitted + bed + both doctors

---

## Files

| File | Action |
|------|--------|
| `src/pages/ipd/v1/admissions/components/AssignBedDialog.tsx` | Create |
| `AdmissionDetailPage.tsx` | Gate assign on treating doctor |
