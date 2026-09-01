# Slice adm-0 — Sidebar + ATD route shell

**Project:** `his-global-south` | **Feature:** `ipd-admissions` | **Base:** `develop` | **Branch:** `feat/ipd-admissions-atd`

**Goal:** Visible IPD navigation with **ATD** entry; routing scaffold only — **no admissions API yet**.

---

## Scope

### In

- `AppSidebar.tsx`: IPD collapsible with sub-items **Overview** + **ATD**
- `appRoutes.tsx`: change `/ipd/v1` → `/ipd/v1/*` mount
- Add `src/routes/ipdRoutes.tsx` + `src/pages/ipd/v1/routes.tsx`
- Add `src/pages/ipd/v1/constants.ts` (`IPD_ATD_PATH`)
- Add `src/pages/ipd/v1/admissions/index.tsx` — placeholder (“Coming in adm-2”)

### Out

- Admissions API
- List/create/assign functionality

---

## Acceptance

- [ ] Sidebar shows **IPD** with chevron; expanded shows **Overview** and **ATD**
- [ ] `/ipd/v1` → existing IPD health dashboard
- [ ] `/ipd/v1/admissions` → ATD placeholder with title “ATD — Admission Transfer Desk”
- [ ] No OPD route changes except single line `/ipd/v1/*` mount

---

## Files (expected)

| File | Action |
|------|--------|
| `src/components/layout/AppSidebar.tsx` | Edit |
| `src/routes/appRoutes.tsx` | Edit |
| `src/routes/ipdRoutes.tsx` | Create |
| `src/pages/ipd/v1/routes.tsx` | Create |
| `src/pages/ipd/v1/constants.ts` | Create |
| `src/pages/ipd/v1/admissions/index.tsx` | Create |

---

## Before coding

```powershell
git fetch origin
git checkout develop
git pull origin develop
git checkout -b feat/ipd-admissions-atd
```

Execute only after **G1 + G2** approved.
