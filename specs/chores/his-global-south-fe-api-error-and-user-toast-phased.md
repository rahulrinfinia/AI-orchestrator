# Phased plan: FE API errors first, then `userToast` (develop-l2 diff only)

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Scope** | Files touched between **`origin/develop-l2`** and **`chore/billing-schemas-api-errors-phase2`** (same stack as CE / payer / patient bill PRs) |
| **Out of scope** | Repo-wide toast/API cleanup; backend `shared/api-errors` (separate chores); uncommitted arrow-fn-only edits |
| **Tracks** | **UI0** — dismiss affordance on every toast · **Track A** — `apiError.ts` / `showApiErrorToast` · **Track B** — `userToast.ts` / `showUserToast` (starts after Track A phases complete for that slice) |

## Diff inventory (baseline)

| Metric | Count |
|--------|------:|
| Files with **new** inline `toast(` | **19** |
| **New** inline `toast(` lines (git `+`) | **42** |
| Files with **new** `showApiErrorToast` | **11** |
| **New** `showApiErrorToast` lines | **23** |

**Rule between tracks**

- **`catch` / mutation `onError` after `api.*`** → Track A only (`showApiErrorToast`, optional `MESSAGE_BY_CODE` in `apiError.ts`).
- **Guards, success, validation before API** → Track B (`showUserToast` + catalog key).
- Do **not** move client guards into `apiError.ts`.

---

# Execution plan

**Base branch:** `develop-l2` (or current CE stack branch, e.g. `chore/billing-schemas-api-errors-phase2`, rebased on `develop-l2` before each PR).

**Naming:** `chore/fe-toast-ui0`, `chore/fe-api-error-a1`, … — one phase per PR unless noted.

| # | Phase | PR title (suggested) | Depends on | Primary touch | Outcome |
|---|--------|----------------------|------------|---------------|---------|
| 0 | **UI0** | `chore(fe): toast Cancel + visible dismiss` | — | `toast.tsx`, `toaster.tsx`, optional `useToast` test | Every toast dismissible via **Cancel** + **X**; copy/timing unchanged |
| 1 | **A0** | `chore(fe): API error toast diff audit` | UI0 optional | Hub report only (no product UI required) | Checklist for A1–A3 + `MESSAGE_BY_CODE` proposals |
| 2 | **A1** | `chore(fe): patient bill API error toasts` | A0 signed off | `patientBill/index.tsx` | No `String(e)` on pay; patch/add use `showApiErrorToast` |
| 3 | **A2** | `chore(fe): payer catalog API error toasts` | A1 merged (independent file-wise OK) | 9 payer catalog components | API failures in diff → `showApiErrorToast` only |
| 4 | **A3** | `chore(fe): check-in/admin/orders API error toasts` | A2 | 9 misc diff files | Track A complete for diff |
| 5 | **B0** | `chore(fe): userToast scaffold` | A3 merged (recommended) | `userToast.ts`, `userToast.test.ts` | Catalog + helpers; **no** call sites |
| 6 | **B1** | `chore(fe): patient bill userToast catalog` | **A1** + B0 | `patientBill/index.tsx` | 5 inline client toasts → `BILLING_*` keys |
| 7 | **B2** | `chore(fe): payer catalog userToast catalog` | **A2** + B0 | Payer tabs/pages (see B2 list) | Largest inline batch → `PAYER_*` / `TARIFF_*` |
| 8 | **B3** | `chore(fe): check-in/preauth userToast catalog` | **A3** + B0 | Remaining diff files | All **42** inline diff toasts via `showUserToast` |
| 9 | **B3b** | `chore(fe): lab orders userToast (drawer + tracker)` | B3 | See [lab B3b spec](./his-global-south-lab-orders-user-toast-b3b.md) | **0** raw `toast({` in both lab files |
| 10 | **Done** | Hub report update | B3b | `reports/chores/his-global-south-fe-api-error-user-toast-rollout.md` | 19-file list + lab fully clean |

**Merge options**

| Preference | Adjust |
|------------|--------|
| Fewer PRs | **A2 + A3** in one PR · **UI0 + B0** in one PR |
| Safer rollback | Keep table as **one phase = one PR** |

**Hard dependencies (do not skip)**

```text
UI0 ──► (any order with A0) ──► A1 ──► B1     same file: patientBill
                          └──► A2 ──► B2     payer cluster
                          └──► A3 ──► B3     rest of diff
B0 before B1, B2, B3 (catalog must exist)
A1 before B1 · A2 before B2 · A3 before B3
```

**Per-PR workflow**

1. Branch from latest target (`develop-l2` or stacked on prior chore PR).
2. Implement **only** that phase scope (see sections below).
3. Run validation (lint, tsc, tests — see [Validation](#validation-each-pr)).
4. Manual smoke + for UI0 verify **Cancel** / **X**; for A/B compare one error toast wording to pre-PR.
5. Open PR → review → merge → next row in table.

**Implementation checklist (copy for PR descriptions)**

| Phase | Check |
|-------|--------|
| UI0 | [ ] Cancel on toasts without custom `action` [ ] X always visible [ ] Auto-dismiss still works |
| A0 | [ ] Audit doc / checklist [ ] No accidental UI edits |
| A1 | [ ] `payMutation.onError` [ ] patch/add `onError` [ ] Success/guard toasts untouched |
| A2 | [ ] 9 payer files audited in **diff hunks** only |
| A3 | [ ] Check-in, pre-auth, admin, lab/appointment API paths |
| B0 | [ ] `userToast.test.ts` green [ ] Zero call-site changes |
| B1–B3 | [ ] Strings match catalog [ ] No raw `toast({ title:` in scope files [ ] API paths still `showApiErrorToast` |

**Estimated PR count:** 8–10 (0–9 in table; A0 can be docs-only commit on first A1 PR if you skip a separate PR).

---

## Non-regression — pichla kuch break nahi hona chahiye

This program is **refactor-only** on the frontend toast layer. Users should see the **same titles/descriptions and the same flows** as today unless we explicitly fix a bug (none planned).

| Guard | What we do |
|-------|------------|
| **User-visible copy** | Track B: copy-paste exact strings from current inline `toast({…})` into `USER_TOAST_CATALOG` before deleting inline text. Track A: keep existing `title` / `fallback` strings on `showApiErrorToast`. |
| **When toast fires** | Do **not** change `if` conditions, mutation triggers, or navigation (e.g. “Add insurance” still navigates + toasts). Only **how** the toast payload is built changes. |
| **API / backend** | **No** backend changes in Track A/B. No new endpoints, no request/response shape changes. |
| **Success paths** | Success toasts stay **default** variant; errors stay **destructive** — same as today. |
| **Already-correct API toasts** | Hunks that already use `showApiErrorToast` → **touch only if** fixing a clear gap (`String(e)`); otherwise leave as-is. |
| **Scope limit** | Edit **only lines/files in the develop-l2 diff** (or hunks you added). Do not drive-by refactor other pages. |
| **Tests** | Before merge each PR: `npm run lint`, `npx tsc -b`. Track B: unit tests assert catalog text matches legacy strings. Run existing FE tests if file has `__tests__`. |
| **Regression smoke (manual)** | Same checklist every PR: patient bill pay + apply insurance + invoice; one payer save; one check-in — **happy path must still work**. |

**Track A nuance:** `showApiErrorToast` may show a **better** message than `String(e)` on payment fail — that is intentional improvement, not a break. Titles stay the same (“Payment failed”, etc.).

**Rollback:** Each phase is its own PR; revert single PR if QA finds a regression.

---

# UI0 — Dismiss / Cancel on every toast (do first)

**Goal:** When any toast appears, the user can **remove it immediately** without waiting for the 10s auto-dismiss (`TOAST_DURATION` in `useToast.ts`).

**Today:** `Toaster` already renders `ToastClose` (X), but it is **hover-only** (`opacity-0` until `group-hover`). There is no visible **Cancel** label; most call sites do not pass Radix `action`.

**Approach (one PR, app-wide — no per-page edits required for basic behavior):**

| Change | File | Detail |
|--------|------|--------|
| Visible dismiss | `src/components/ui/toast.tsx` | Keep `ToastClose`; make the X **always visible** (or focus-visible), not hover-only — still accessible. |
| **Cancel** action | `src/components/ui/toaster.tsx` | When `action` is not passed, render default `<ToastAction altText="Dismiss notification">Cancel</ToastAction>` (Radix closes toast on click). When a call site **does** pass `action`, keep that action **and** still show `ToastClose` (and optionally Cancel — product choice: **default = Cancel + X only if no custom action**). |
| Helpers (optional) | `src/utils/toastPresentation.ts` | Export shared `ToastFn` type including optional `action`; document that UI0 covers dismiss for catalog/API helpers. **No** need to thread Cancel through every `showApiErrorToast` call if Toaster defaults it. |
| Tests | `src/hooks/__tests__/useToast*.test.ts` or snapshot on `Toaster` | Smoke: toast opens, Cancel click sets `open: false` / removes from stack. |

**Non-regression:** Titles, descriptions, variants, and **when** toasts fire unchanged. Only adds controls. Auto-dismiss timer stays unless product asks to disable it when Cancel is shown.

**PR:** **`UI0`** alone (small, easy revert) **before** A1, or **same PR as B0** if you prefer fewer PRs.

**Manual smoke:** Trigger any error/success toast → click **Cancel** → toast gone; click X → same; wait 10s → still auto-dismisses if not dismissed.

---

# Track A — API error toasts (complete first)

Goal: every **new or changed** API failure path in the diff uses `showApiErrorToast` (no `String(e)`, no generic `onError: () => toast({ title: 'Could not…' })` without reading the error).

Optional: add frontend `MESSAGE_BY_CODE` entries when CE/payer APIs return new stable `code`s (grep backend + integration responses in changed modules).

## A0 — Inventory & catalog gap (no UI file edits yet)

1. List all **added/changed** `try/catch`, `useMutation({ onError })`, `mutateAsync` in diff TS/TSX files.
2. Mark each: ✅ already `showApiErrorToast` · ❌ inline destructive toast · ❌ `String(e)`.
3. Grep new backend error codes in diff (`backend/` + `src/` services) → propose `MESSAGE_BY_CODE` rows in `src/utils/apiError.ts` (Title Case fallbacks).
4. Output checklist in PR description or `reports/chores/fe-api-error-diff-audit.md`.

**Exit:** Signed-off list of files per phase A1–A3.

## A1 — Patient bill (RCM cashier)

**Files:** `src/pages/patientBill/index.tsx` (+ any new helpers under `patientBill/` in diff only).

| Item | Action |
|------|--------|
| `payMutation.onError` | Replace `String(e)` → `showApiErrorToast(toast, e, { title: 'Payment failed', … })` |
| `patchItem` / `addItem` `onError` | Pass `error` into `showApiErrorToast` with existing titles |
| `handleGenerateInvoice` / `handleApplyInsurance` `catch` | Already ✅ — verify titles/fallbacks unchanged |

**Do not** convert success/guard toasts here (Track B).

**Tests:** Manual pay + patch line failure; optional component test if mutation mocks exist.

## A2 — Payer catalog workspace (bulk of new `showApiErrorToast`)

**Files (new apiErr lines in diff):**

| File | New `showApiErrorToast` (diff) | Also new inline `toast(` |
|------|-------------------------------:|-------------------------:|
| `PayerPreAuthHubTab.tsx` | 4 | 3 |
| `PlanBenefitsEditor.tsx` | 3 | 2 |
| `AcceptedPlansPage.tsx` | 2 | 3 |
| `NewPayerRegistrationSection.tsx` | 2 | 2 |
| `PayerTariffsTab.tsx` | 2 | 6 |
| `PayerHospitalRulesTab.tsx` | 2 | 1 |
| `PayerCompanyDemographics.tsx` | 2 | 1 |
| `AddChildPlanDialog.tsx` | 2 | 1 |
| `PlanAuthRulesEditor.tsx` | 2 | 1 |

**Work:** Audit each file — any remaining `catch` / `onError` in **changed hunks** that still use inline error toast → wire `showApiErrorToast`. Align title overrides with current copy.

**Exit:** No API failure path in these hunks uses raw `toast` or `String(error)`.

## A3 — Remaining diff files (lighter API surface)

| File | New inline `toast(` | New `showApiErrorToast` | Notes |
|------|--------------------:|------------------------:|-------|
| `PreAuthTracker.tsx` | 3 | 1 | Finish API paths in changed code |
| `PatientCheckInDialog.tsx` | 4 | 0 | Add `showApiErrorToast` on check-in API failures in diff |
| `ClinicalStaff.tsx` | 2 | 0 | Same for save API |
| `facilityMaster/index.tsx` | 2 | 0 | Same |
| `VisitBillingPoliciesSection.tsx` | 2 | 0 | Same |
| `Appointments.tsx` | 1 | 0 | Same |
| `LabResultEntryDrawer.tsx` | 1 | 0 | Same |
| `LabOrderTracker.tsx` | 1 | 0 | Same |
| `AppointmentDetailSheet.tsx` | 1 | 0 | Same |

**Exit Track A:** Diff-scoped API failures standardized; `npm run lint`, `npx tsc -b`, targeted manual QA on bill + payer catalog + check-in.

**PR suggestion:** One PR **A1**, one **A2**, one **A3** (or A2+A3 if small).

---

# Track B — `userToast.ts` (after Track A for same files)

Detailed catalog shape: see [his-global-south-user-toast-catalog.md](./his-global-south-user-toast-catalog.md) — update scope to **diff files below**, not whole repo.

## B0 — Scaffold

1. Add `src/utils/userToast.ts` + `src/utils/__tests__/userToast.test.ts`.
2. Export `USER_TOAST_CATALOG`, `showUserToast`, optional `{count}` interpolation.
3. No call-site changes yet.

## B1 — Patient bill (5 new inline toasts in diff)

Replace **only** non-API toasts added/changed vs `develop-l2` in `patientBill/index.tsx` (success, guards, eligibility message, validation titles, etc.) with catalog keys prefixed `BILLING_*`.

Keep `showApiErrorToast` from Track A as-is.

## B2 — Payer catalog (largest inline batch)

**Order by toast count in diff:**

1. `PayerTariffsTab.tsx` (6)
2. `PayerPreAuthHubTab.tsx` (3)
3. `AcceptedPlansPage.tsx` (3)
4. `NewPayerRegistrationSection.tsx` (2)
5. `PlanBenefitsEditor.tsx` (2) — client success/validation only
6. `PayerHospitalRulesTab.tsx`, `PayerCompanyDemographics.tsx`, `AddChildPlanDialog.tsx`, `PlanAuthRulesEditor.tsx` (1 each)

Catalog prefix suggestion: `PAYER_*` / `TARIFF_*`.

## B3 — Check-in, pre-auth, admin, orders (rest of diff)

| File | Inline toasts (diff) |
|------|---------------------:|
| `PatientCheckInDialog.tsx` | 4 |
| `PreAuthTracker.tsx` | 3 |
| `ClinicalStaff.tsx` | 2 |
| `facilityMaster/index.tsx` | 2 |
| `VisitBillingPoliciesSection.tsx` | 2 |
| `Appointments.tsx`, lab/appointment components | 1 each |

Prefix: `CHECKIN_*`, `PREAUTH_*`, `ADMIN_*`, `ORDERS_*` as appropriate.

**Exit Track B:** All **42** diff-added inline `toast(` call sites in the 19 files go through `showUserToast` (or documented exception with comment).

**PR suggestion:** **B0** alone, then **B1**, **B2**, **B3** (match A phases 1:1 where possible).

### B3b — Lab orders cleanup (follow-up; not in original 42 count)

B3 left **legacy** inline toasts in lab UI that predated the CE diff. Full closure of the **19-file list**:

| File | Remaining `toast({` | Plan |
|------|--------------------:|------|
| `LabResultEntryDrawer.tsx` | 5 | [his-global-south-lab-orders-user-toast-b3b.md](./his-global-south-lab-orders-user-toast-b3b.md) |
| `LabOrderTracker.tsx` | 13 | same |

**Order:** After **B3** merged → **one PR B3b** (or B3b-1 drawer + B3b-2 tracker if you want smaller reviews).

---

# Sequence (summary)

Same order as [Execution plan](#execution-plan) table:

```text
UI0 → A0 → A1 → A2 → A3 → B0 → B1 → B2 → B3 → hub report
```

---

# Validation (each PR)

```bash
cd projects/his-global-south
npm run lint
npx tsc -b
npm run test -- src/utils/__tests__/userToast.test.ts   # Track B PRs
# If you touched a module with tests, run targeted vitest for that file/dir
```

Manual smoke (required — proves nothing broke):

- [ ] Patient bill: load visit, add charge, collect payment, generate invoice
- [ ] Apply insurance: self-pay → guard toast + profile nav; insured → apply path
- [ ] Payer catalog: open contract, save tariffs or rules (one mutation)
- [ ] Check-in or pre-auth: one happy path on a file changed in that PR

Compare toast **wording** to pre-PR behavior on at least one error (e.g. invalid payment amount).

---

# Related docs

| Doc | Purpose |
|-----|---------|
| [his-global-south-user-toast-catalog.md](./his-global-south-user-toast-catalog.md) | B0–B1 detail (update scope to diff-only) |
| Backend [his-global-south-api-errors-orders-catalog-phase-2.md](./his-global-south-api-errors-orders-catalog-phase-2.md) | Server-side orders catalog (orthogonal) |
| `src/utils/apiError.ts` | Track A implementation target |

---

# Done when (program complete)

- [ ] **UI0:** Every toast shows **Cancel** (and visible dismiss); manual + test pass
- [ ] Track A: all diff-scoped API failures use `showApiErrorToast`; no `String(e)` in changed hunks
- [ ] Track B: all **42** diff-added client toasts use `showUserToast`
- [ ] **B3b:** lab drawer + tracker — **0** inline `toast({` ([spec](./his-global-south-lab-orders-user-toast-b3b.md))
- [ ] `userToast.test.ts` covers every catalog key used in B1–B3
- [ ] Hub report: `reports/chores/his-global-south-fe-api-error-user-toast-rollout.md`

---

## Approval

Approved: 2026-09-24 — UI0 implementation started on `chore/billing-schemas-api-errors-phase2` (or `chore/fe-toast-ui0` when split).
