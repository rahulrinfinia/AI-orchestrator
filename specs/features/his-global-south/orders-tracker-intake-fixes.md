# Orders tracker pipeline + visit-scoped intake + consult toolbar

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `orders-tracker-intake-fixes` |
| **Branch** | `feat/dra-radiology-inhouse-approval` (PR #58) |
| **Status** | **Phase 1 + 3 committed** — Phase 2 manual QA pending |
| **Implemented at** | `e981f4f` (Phase 1); `95a59bc` (Phase 3) |
| **Date** | 2026-09-09 |

---

## 1. Problems (plain language)

| # | What users saw | Why it happened |
|---|----------------|-----------------|
| **A** | Lab/radiology orders looked **stuck** after upload + pathologist approve | Screen used **old whole-order status**, not whether **each test was released** |
| **B** | Return patients saw **old visit screening** on consult **Intake** | Screening loaded by **patient only**, not **this visit** |
| **C** | **Load Template** button redundant next to Back/Next | Product decision: use **Care Templates** tab instead |

---

## 2. Solutions (plain language)

| # | Fix in one line |
|---|-----------------|
| **A** | Tracker shows **complete** when **every test line** is approved/released |
| **B** | Intake screening filtered to **current visit only** (`visit_id`) |
| **C** | **Load Template** commented out; **Care Templates** tab remains |

---

## 3. Phase 1 — Implemented ✅

**Commit:** `e981f4f` — *fix(orders,screening,consult): tracker pipelines, visit-scoped intake, hide load template*

### A. Lab & radiology tracker pipeline

| Layer | Change |
|-------|--------|
| **Frontend trackers** | `LabOrderTracker.tsx`, `RadiologyOrderTracker.tsx` — pipeline step from **item release state**, not stale `order.status` |
| **Mappers** | `mappers.ts` — `allItemsReleased` drives list status |
| **Mapping helpers** | `labOrderStatus.mapping.ts`, new `radiologyOrderStatus.mapping.ts` |
| **Backend completion** | `orderCompletion.service.ts` — radiology order completion + delivered marker on notes |

### B. Visit-scoped intake screening

| Layer | Change |
|-------|--------|
| **Backend** | `responses.service.ts` — optional `visit_id` on list/completion; empty when visit-scoped phase has no visit |
| **API** | `responses.schema.ts`, `responses.controller.ts` — `visit_id` query param |
| **Frontend** | `screening.service.ts`, `useScreening.ts`, `queryKeys.ts`, `IntakeTab.tsx`, `ScreeningResponsesSummary.tsx` |

### C. Load Template hidden

| File | Change |
|------|--------|
| `ConsultationStageNav.tsx` | TemplateSelector + handler commented out |
| `consultationWorkspace/index.tsx` | `handleLoadTemplate` commented out |

### Tests already green

```bash
# Frontend — orders + screening
cd projects/his-global-south
npx vitest run src/components/orders/__tests__/ src/clinical/constants/__tests__/

# Backend — screening + DRA
cd backend
npx vitest run src/modules/screening/responses/__tests__/responses.service.test.ts
npm run test:integration -- orders-approval-radiology

# Types + lint
npm run lint && npx tsc -b
```

---

## 4. Phase 2 — Manual QA (do before merge)

**Owner:** Rahul / QA  
**Environment:** preview-l2 or local with seed data

### A. Lab in-house

- [ ] Create in-house lab order → collect → receive → enter results → submit for approval
- [ ] Pathologist approves
- [ ] **Orders tracker** shows **Resulted** (last step)
- [ ] Clinician can see released results

### B. Lab send-out

- [ ] Send-out order through facility assign → sent → report upload → approve
- [ ] Tracker reaches **Completed**
- [ ] Clinician sees released results only after approve

### C. Radiology in-house

- [ ] Order → received → processing → enter report → submit → radiologist approve
- [ ] Tracker reaches **Report verified** / **Delivered**
- [ ] Clinician sees report after release

### D. Return patient — Intake screening

- [ ] Patient with screening from **previous visit** returns for **new visit**
- [ ] Open consult → **Intake** tab
- [ ] **Only this visit’s** screening shows (or empty if none this visit)
- [ ] **No** screening from old visits on Intake

### E. Consult toolbar

- [ ] **Load Template** not visible next to Back/Next
- [ ] **Care Templates** tab still works

### Sign-off

| Role | Name | Date | Pass? |
|------|------|------|-------|
| Author | | | |
| QA | | | |

---

## 5. Phase 3 — Optional polish ✅ implemented

Only do if Phase 2 QA surfaces confusion or you want cleaner radiology data.

### 3a. Intake screening empty states (UX)

**Problem:** If `visitId` is missing, screening shows **nothing** with no message.

**Plan:**

1. `ScreeningResponsesSummary.tsx` — show friendly message when visit-scoped but no `visitId`, and when visit has no screening yet
2. `IntakeTab.tsx` — treat `visitId` as required (from route param)
3. Component tests for both states

**Files:** `ScreeningResponsesSummary.tsx`, `IntakeTab.tsx`, new `ScreeningResponsesSummary.test.tsx`

**Acceptance:**

- Missing visit context → visible message (not blank)
- Visit with no screening → “No intake screening for this visit”
- No API call when visit-scoped and `visitId` absent

### 3b. Radiology Delivered without notes marker (Option A — lean)

**Problem:** `radiology:delivered` appended to order `notes` — works but indirect.

**Plan:**

1. Derive **Delivered** from `allItemsReleased` + completed status in `radiologyOrderStatus.mapping.ts`
2. Remove notes append in `orderCompletion.service.ts`
3. Keep **reading** legacy notes marker for old rows
4. Update mapping + tracker tests

**Files:** `radiologyOrderStatus.mapping.ts`, `orderCompletion.service.ts`, tests

**Acceptance:**

- New radiology orders reach Delivered on tracker after full release **without** writing to notes
- Old orders with notes marker still display correctly

---

## 6. Out of scope

- **Past Visits tab** in consult — separate plan: [consultation-past-visits-tab.md](./consultation-past-visits-tab.md)
- Splitting PR #58 bundled scope (#55, #56, ops)
- Changing Intake to show **all** patient screening history (that was the original bug)

---

## 7. Rollback

If Phase 2 QA fails on tracker or intake:

```bash
cd projects/his-global-south
git revert e981f4f   # or fix forward on same branch
```

Revert only if a **new** regression is found; do not revert visit-scoping (that fixes return-patient bug).

---

## Approval

### Phase 1 (implemented)

- [x] Code merged on branch `feat/dra-radiology-inhouse-approval` at `e981f4f`
- [x] Automated tests pass locally

### Phase 2 (QA)

- [ ] Human approves QA checklist above — fill sign-off table

### Phase 3 (optional polish)

- [x] 3a — intake empty states + `ScreeningResponsesSummary.test.tsx`
- [x] 3b — radiology Delivered from item release; removed notes marker write
- [ ] Human confirms in UI after deploy

**After Phase 2 approval:** merge PR #58 (or request Phase 3 implement-slice if optional items approved).
