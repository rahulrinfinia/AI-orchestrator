# FE API error + user toast rollout (develop-l2 diff)

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Plan** | [his-global-south-fe-api-error-and-user-toast-phased.md](../../specs/chores/his-global-south-fe-api-error-and-user-toast-phased.md) |
| **Completed** | 2026-09-24 (local branch) |

## Summary

| Track | Outcome |
|-------|---------|
| **UI0** | Global **Cancel** + visible dismiss on all toasts (`toaster.tsx`, `toast.tsx`) |
| **Track A** | Diff-scoped API failures → `showApiErrorToast` (patient bill, payer, check-in, appointments, admin policies, …) |
| **Track B** | Diff-scoped client toasts → `showUserToast` + `USER_TOAST_CATALOG` in `src/utils/userToast.ts` |

## Key files

- `src/utils/apiError.ts` — unchanged behavior; call sites standardized
- `src/utils/userToast.ts` — `BILLING_*`, `PAYER_*`, `TARIFF_*`, `CHECKIN_*`, `PREAUTH_*`, `ADMIN_*`, `APPOINTMENTS_*`, `LAB_*`, `ORDERS_*` keys
- `src/utils/__tests__/userToast.test.ts`, `src/components/ui/__tests__/toaster.test.ts`

## Audit trail

[fe-api-error-diff-audit.md](./fe-api-error-diff-audit.md)

## Manual smoke (recommended before merge)

- [ ] Patient bill: pay, add charge, invoice, apply insurance (self-pay guard)
- [ ] Payer catalog: save tariffs, create payer, pre-auth hub action
- [ ] Check-in dialog + appointments check-in
- [ ] Toast **Cancel** dismisses notification

## Notes

- **B3b (2026-09-24):** `LabResultEntryDrawer.tsx` and `LabOrderTracker.tsx` — all client toasts use `showUserToast` (`ORDERS_LAB_*`); no raw `toast({` remaining in those files.
