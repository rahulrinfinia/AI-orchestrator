# Chore: Client toast catalog — `src/utils/userToast.ts`

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Branch** | Same as CE / billing branch, or `chore/user-toast-catalog` after merge |
| **Parent plan** | [his-global-south-fe-api-error-and-user-toast-phased.md](./his-global-south-fe-api-error-and-user-toast-phased.md) — **Track B** only; start after Track A for each file |
| **Scope** | **Only** files with new inline `toast(` vs `origin/develop-l2` (**19 files**, **42** lines) — not whole repo |
| **Motivation** | Same UX quality as `apiError.ts`, but for **non-API** messages (validation, guided flows, success) |
| **Behavior change** | **Copy should stay identical** on first slice; only call-site wiring + SSOT |

## Problem

Pages (starting with `src/pages/patientBill/index.tsx`) mix:

- `showApiErrorToast` for some `catch` blocks
- Inline `toast({ title, description?, variant? })` for guards, success, validation
- Mutation `onError` with fixed strings or `String(e)` (no API helper)

Example guard (not an HTTP error):

- “Add insurance coverage first” + profile navigation

There is **no** stable code → message map for client-side toasts (unlike `MESSAGE_BY_CODE` for API).

## Non-goals

- Replacing or merging into `shared/api-errors` (backend) or `apiError.ts` API catalog
- i18n / translation layer in v1
- Rewriting every `toast({` in the repo in one PR
- Broad redesign of toast styling (see parent plan **UI0** for dismiss/Cancel only — allowed)

## Relationship to `apiError.ts`

| Concern | Module | Input |
|---------|--------|--------|
| Network / `ApiError` | `apiError.ts` | `unknown` error + optional title override |
| Client UX / validation / success | **`userToast.ts`** | **catalog key** (+ optional `description` override / interpolations) |

**Rule for implementers:** If the message comes from **`catch (e)`** after `api.*`, use **`showApiErrorToast`**. If the message is **decided in the UI** before/without that call, use **`showUserToast`**.

Share only the **`ToastFn`** type (duplicate minimal type or export from one module — prefer duplicate 3-line type to avoid circular imports).

---

## Target API — `src/utils/userToast.ts`

### 1. Catalog (static)

```ts
export const USER_TOAST_CATALOG = {
  // … keys with { title, description?, variant: 'default' | 'destructive' }
} as const;

export type UserToastCatalogKey = keyof typeof USER_TOAST_CATALOG;
```

- **Title Case** user-facing strings (match `apiError` / AJV bar where relevant).
- **`variant`:** `destructive` for blocks/errors; `default` for success/info (e.g. insurance guard is **info**, not destructive).

Optional v1 helper for dynamic description:

```ts
export type UserToastInterpolation = Record<string, string | number>;

export const getUserToastPayload = (
  key: UserToastCatalogKey,
  overrides?: { description?: string; interpolation?: UserToastInterpolation },
): { title: string; description?: string; variant: 'default' | 'destructive' };
```

Keep interpolation minimal (e.g. `{ count }`, `{ invoiceNumber }`) — no template engine.

### 2. Show helpers

```ts
type ToastFn = (props: {
  title?: string;
  description?: string;
  variant?: 'destructive' | 'default';
}) => void;

export const showUserToast = (
  toast: ToastFn,
  key: UserToastCatalogKey,
  overrides?: { description?: string; interpolation?: UserToastInterpolation },
): void;

/** Success shorthand — catalog entry must exist with variant default */
export const showUserSuccessToast = (toast: ToastFn, key: UserToastCatalogKey, overrides?): void;
```

Mirror `showApiErrorToast(toast, error, options)` ergonomics.

### 3. Tests — `src/utils/__tests__/userToast.test.ts`

- Every catalog key has non-empty `title`
- Sample keys: destructive vs default variant
- Interpolation replaces `{count}` if used
- `getUserToastPayload` stable snapshot for 2–3 billing keys

---

## Phase B1 scope — `patientBill/index.tsx` only (5 new inline toasts in develop-l2 diff)

**Prerequisite:** Track **A1** complete for same file ([parent plan](./his-global-south-fe-api-error-and-user-toast-phased.md)).

Inventory → catalog keys (proposed names):

| Current inline copy | Proposed key | Variant |
|---------------------|--------------|---------|
| Could not update item | `BILLING_ITEM_UPDATE_FAILED` | destructive |
| Charge added | `BILLING_CHARGE_ADDED` | default |
| Could not add charge | `BILLING_CHARGE_ADD_FAILED` | destructive |
| Payment recorded successfully (+ description) | `BILLING_PAYMENT_RECORDED` | default |
| Payment failed + String(e) | **Remove** — use `showApiErrorToast` in `onError` | destructive |
| Description and unit price are required | `BILLING_CHARGE_FIELDS_REQUIRED` | destructive |
| No receipt selected (+ description) | `BILLING_NO_RECEIPT_SELECTED` | destructive |
| validation.message from `validatePaymentDraft` | Map known messages to keys **or** keep one generic `BILLING_PAYMENT_VALIDATION` + pass `description: validation.message` override | destructive |
| Invoice already exists / Invoice generated (+ invoice number) | `BILLING_INVOICE_EXISTS` / `BILLING_INVOICE_GENERATED` | default |
| Add insurance coverage first (+ description) | `BILLING_ADD_COVERAGE_FIRST` | default |
| Coverage could not be verified (+ check.error) | `BILLING_COVERAGE_VERIFY_FAILED` | destructive; `description` override from API text when present |
| Nothing to switch | `BILLING_NOTHING_TO_SWITCH` | default |
| Insurance applied (+ count) | `BILLING_INSURANCE_APPLIED` | default; interpolation `{ count }` |

**Already correct (keep):**

- `handleGenerateInvoice` / `handleApplyInsurance` `catch` → `showApiErrorToast` with title override.

**Fix in same PR:**

- `payMutation.onError` → `showApiErrorToast(toast, e, { title: 'Payment failed', fallback: '…' })`
- `patchItem` / `addItem` `onError` → `showApiErrorToast` with title override (same as today’s title)

### Optional phase 1b — `validatePaymentDraft`

Either:

- Return `{ ok: false, code: 'BILLING_…' }` from utils and map in UI via `showUserToast`, **or**
- Keep `{ ok: false, message: string }` and use `showUserToast(..., 'BILLING_PAYMENT_VALIDATION', { description: message })`

Prefer **code** in utils only if messages are finite and listed in catalog; else override description.

---

## Phase B2–B3 (later PRs)

See parent plan: payer catalog cluster (6+3+… files), then check-in / preauth / admin / orders diff files.

- Extract **`src/constants/billingUserToasts.ts`** only if catalog exceeds ~40 entries (split catalog object, re-export from `userToast.ts`)
- Document in `docs/conventions/` one paragraph: API vs user toast

---

## File layout (expected)

| File | Change |
|------|--------|
| `src/utils/userToast.ts` | **new** — catalog + helpers |
| `src/utils/__tests__/userToast.test.ts` | **new** |
| `src/pages/patientBill/index.tsx` | Replace inline toasts; fix mutation `onError` |
| `src/pages/patientBill/utils.ts` | Optional validation codes (phase 1b) |

**Do not** touch `apiError.ts` except optional shared `ToastFn` export (skip if duplicated).

---

## Validation

```bash
cd projects/his-global-south
npm run lint
npx tsc -b
npm run test -- src/utils/__tests__/userToast.test.ts
# Manual: patient bill — apply insurance (self-pay toast), pay, add charge, generate invoice
```

---

## Risks

| Risk | Mitigation |
|------|------------|
| Copy drift during migration | Copy-paste exact strings into catalog first; UI test checklist |
| Success toasts lose dynamic invoice number | Use interpolation or `description` override |
| Over-cataloging one-off strings | Phase 1 only patient bill; don’t boil ocean |
| Duplicate with backend error codes | Client keys prefixed `BILLING_` / feature prefix; no collision with API `code` |

---

## Done when (phase 1)

- [ ] `userToast.ts` + unit tests merged
- [ ] `patientBill/index.tsx` has **no** raw `toast({ title: "…"` except via `showUserToast` / `showApiErrorToast`
- [ ] Payment mutation uses `showApiErrorToast` on failure
- [ ] Lint + tsc + tests green

---

## Approval

<!-- Human: uncomment when ready to implement -->

<!-- Approved: YYYY-MM-DD -->
