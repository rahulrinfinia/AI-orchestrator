# FE API error toast audit (develop-l2 → CE stack)

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Base** | `origin/develop-l2...HEAD` (`chore/billing-schemas-api-errors-phase2`) |
| **Date** | 2026-09-24 |
| **Plan** | [his-global-south-fe-api-error-and-user-toast-phased.md](../../specs/chores/his-global-south-fe-api-error-and-user-toast-phased.md) |

Legend: **A** = Track A (use `showApiErrorToast`) · **B** = Track B (client `userToast` later) · **OK** = already `showApiErrorToast` in API path

---

## A1 — `patientBill/index.tsx`

| Location | Status | Action |
|----------|--------|--------|
| `patchItem` `onError` | **Fixed (A1)** | Was inline toast without error → `showApiErrorToast` |
| `addItemMutation` `onError` | **Fixed (A1)** | Same |
| `payMutation.onError` | **Fixed (A1)** | Was `String(e)` → `showApiErrorToast` |
| `handleGenerateInvoice` catch | OK | Already `showApiErrorToast` |
| `handleApplyInsurance` catch | OK | Already `showApiErrorToast` |
| Success / guards / validation toasts | B | Track B1 — do not move in A1 |

---

## A2 — Payer catalog (API paths in diff)

| File | `showApiErrorToast` | Inline `toast(` | A2 notes |
|------|--------------------:|----------------:|----------|
| `payerCatalog/components/PayerPreAuthHubTab.tsx` | 4 | 3 | Spot-check changed hunks for API `catch` still inline |
| `components/payerCatalog/PlanBenefitsEditor.tsx` | 3 | 2 | Mutations mostly OK; verify client vs API |
| `payerCatalog/AcceptedPlansPage.tsx` | 2 | 3 | Same |
| `payerCatalog/components/NewPayerRegistrationSection.tsx` | 2 | 2 | OK on `onError` with title override |
| `payerCatalog/components/PayerTariffsTab.tsx` | 2 | 6 | Audit save mutations in diff |
| `payerCatalog/components/PayerHospitalRulesTab.tsx` | 2 | 1 | OK pattern on save |
| `payerCatalog/components/PayerCompanyDemographics.tsx` | 2 | 1 | OK |
| `payerCatalog/components/AddChildPlanDialog.tsx` | 2 | 1 | OK |
| `components/payerCatalog/PlanAuthRulesEditor.tsx` | 2 | 1 | OK |

**A2 exit:** Grep each file for `onError: () => toast` or `catch` + destructive inline toast without `showApiErrorToast` in **diff hunks only**.

---

## A3 — Other diff files

| File | API gap | Notes |
|------|---------|--------|
| `preauth/PreAuthTracker.tsx` | Low | Heavy `showApiErrorToast` usage already |
| `encounters/PatientCheckInDialog.tsx` | Low | One `showApiErrorToast`; other toasts are client/flow (B3) |
| `ClinicalStaff.tsx` | Verify | Has `showApiErrorToast`; confirm save path |
| `facilityMaster/index.tsx` | Verify | Has `showApiErrorToast` on mutations |
| `admin/.../VisitBillingPoliciesSection.tsx` | **A3** | `catch` uses inline `(err as Error).message` → `showApiErrorToast` |
| `Appointments.tsx` | **A3** | Check-in fail: `err instanceof Error ? err.message` → `showApiErrorToast` |
| `appointments/AppointmentDetailSheet.tsx` | **A3** | Status update / check-in fail inline destructive |
| `orders/LabResultEntryDrawer.tsx` | Verify | Mixed; confirm diff hunks |
| `orders/LabOrderTracker.tsx` | Low | Mostly `showApiErrorToast` |
| `patientBill/components/*` | — | Out of A1 scope unless new API handlers added in diff |

---

## `MESSAGE_BY_CODE` candidates (optional)

Grep billing/RCM/payer modules in backend diff for new stable `code` strings before adding rows to `src/utils/apiError.ts`. No mandatory new codes identified in this pass — rely on server `message` + status fallbacks unless QA finds generic text.

---

## Track B reminder (inline client toasts)

**42** added `toast(` lines across **19** file groups — migrate in B1–B3 after Track A for same files. See parent plan inventory.

---

## Phase status

| Phase | Status |
|-------|--------|
| UI0 | Done locally (Cancel + visible X) |
| A0 | This document |
| A1 | Done (`patientBill/index.tsx`) |
| A2 | Done — title overrides on generic `showApiErrorToast`; payer mutations already wired |
| A3 | Done — `VisitBillingPoliciesSection`, `Appointments`, `AppointmentDetailSheet`; ClinicalStaff/facilityMaster/lab already OK |
| B0 | Done — `userToast.ts` + tests; `BILLING_*` seed catalog (no call sites yet) |
| B1 | Done — `patientBill/index.tsx` client toasts → `showUserToast` |
| B2 | Done — payer catalog 9 files + `PAYER_*` / `TARIFF_*` catalog keys |
| B3 | Done — check-in, pre-auth tracker, clinical staff, facility, billing policies, appointments, lab diff toasts |
| B3b | Done — lab drawer + tracker (18 legacy toasts → `ORDERS_LAB_*`) |
