# Plan: Platform admin follow-ons

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Parent feature** | `platform-admin-hospitals` (PAH-1…3 implemented locally) |
| **This epic** | `platform-admin-follow-ons` |
| **Date** | 2026-08-23 |
| **Status** | Draft — **do not implement until Approval on the spec is filled** |
| **Spec** | [specs/features/his-global-south/platform-admin-follow-ons.md](../../../specs/features/his-global-south/platform-admin-follow-ons.md) |

---

## Intent

Give `platform_admin` more **tenant-operator** tools. Do **not** turn them into a hospital `super_admin` and do **not** open patient charts.

Public `/auth` **Register** is **out of this epic** (left as-is).

---

## Locked constraints (every slice)

- `platform_admin` stays seed/SQL-only. Hospital Org setup / Personnel cannot grant it.
- Do **not** retarget SQL `is_platform_admin()` (still means hospital `super_admin` for payer RLS).
- New access is app-layer `assertPlatformAdmin()` only.
- No PHI in platform APIs (no patient names, visits, notes, identifiers).
- Constants + `*_VALUES`, types in `*.types.ts`, mapping in `*.mapping.ts`, Fastify enums from constants.
- Frontend stays under `src/platform/`. Do not modify OPD modules except additive constants if a flag union must be shared.
- Wire JSON snake_case; camelCase only in `src/integrations/api/client.ts`.

---

## What they already have

Create / list / edit any hospital, OPD/IPD flags, first-admin invite (copy link; Nodemailer if SMTP env is set), resend invite until a hospital `super_admin` exists. Sidebar for a platform-only user is **Hospitals** only.

---

## Waves

```text
Wave A — same Hospitals screen (low risk)
  PAF-1  SMTP invite (ops + reliability)
  PAF-2  Invite status + **update / replace hospital admin**
  PAF-3  Suspend / reactivate (enforce `organizations.active`)
  PAF-4  Read-only hospital health (counts, no PHI)

Next in this epic (after Wave A)
  PAF-7  Support view (audited staff directory — no impersonation)

Parked — separate epic, do not implement here
  PAF-6  Shared reference data (Option A vs B) → `platform-reference-ownership`

Later / own branch
  PAF-5  Hide IPD/OPD nav + 403 APIs from org flags
```

Wave A is implemented locally. **PAF-7 is the next slice in this epic** (plan first). **PAF-6 is not part of this work.** PAF-5 stays its own branch when product wants module gating.

---

## PAF-1 — SMTP invite (make mail the default path)

**Already built:** `backend/src/shared/mail.ts`, `SMTP_*` / `MAIL_FROM` in `.env.development`, `admin_invite_sent` on create.

**Do**

- Document a real provider (Gmail app password for local; SES/org SMTP for staging).
- Fail the create/resend **response** honestly (`admin_invite_sent: false` already); add a list column and toast: sent vs copy-link.
- Never log the raw setup URL.
- Optional: `MAIL_FROM` required when `SMTP_HOST` is set (boot warning, not crash).

**Do not:** switch back to Resend; put the hospital password on the create form.

**Done when:** with SMTP filled, create hospital mails the admin; without SMTP, copy-link still works.

---

## PAF-2 — Invite status + update hospital admin

**Today:** list is org columns only. Invite lives in `hospital_admin_invites`. Create captures admin identity; edit hospital does **not**. Resend is blocked once a `super_admin` exists.

### Invite status (list + get)

| Field | Meaning |
|-------|---------|
| `admin_invite_status` | `none` \| `pending` \| `expired` \| `accepted` \| `replacing` |
| `admin_email` / `admin_first_name` / `admin_last_name` | Current admin, or pending invitee if not accepted |
| `admin_invite_expires_at` | When status is `pending` or `replacing` |
| `has_super_admin` | Boolean |

Constants: `ADMIN_INVITE_STATUS` + `*_VALUES` + labels in `org.constants.ts` and `src/platform/constants/hospitals.ts`.

### Update / replace hospital admin (locked rules)

Platform admin **can** change who the hospital admin is. They **cannot** set or reset that person’s password.

| Situation | What Save does |
|-----------|----------------|
| Invite still pending | Change name/email → invalidate old token → new setup link |
| Same email, already accepted | Update **name only** on the profile |
| **New email**, already accepted | Issue a **replacement** invite. **Old `super_admin` stays in charge until the new person completes setup.** Then old admin is demoted to `user` (keeps a login, loses hospital-god). |
| New email already has a login | **409** — same as create (no hijack) |

**UI:** Edit hospital shows the same admin name/email fields as create. Optional copy-link after replace.

**Do not:** let platform type a new password; impersonate the admin; leave the hospital with **zero** `super_admin` during a replace.

**Done when:** list shows invite state; platform admin can correct a typo or hand the hospital to a new admin without locking the tenant.

---

## PAF-3 — Suspend / reactivate

**Today:** `active` is on the edit form. Login does **not** check it, so “Inactive” is cosmetic.

**Do**

1. After session + org resolve: if `organizations.active === false` and the user is **not** `platform_admin` → **403** (`hospital_suspended`). Platform admin can still list/edit.
2. On suspend (`PATCH active: false`): invalidate sessions for that org’s users (auth context cache + Better Auth sessions if we have a hook).
3. Hospitals UI: explicit **Suspend** / **Reactivate** with confirm — not only a checkbox buried in edit.
4. Suspended row: badge + disable “copy invite” (invite still exists but they cannot sign in until reactivated).

**Do not:** delete the org or cascade-delete patients.

**Done when:** a suspended hospital’s `admin@…` cannot use the API; platform admin can turn it back on.

---

## PAF-4 — Read-only hospital health

New `GET /api/platform/organizations/:id/health` — `assertPlatformAdmin`, `id` uuid.

**Allowed fields (aggregates only)**

- user_count, role histogram (`super_admin`, `user`, … — counts only)
- has_super_admin (boolean)
- last_session_at (max session `updated_at` for users of that org — no user ids in the list payload unless we add a separate PAF-7)
- opd_enabled, ipd_enabled, active, created_at

**UI:** extra columns or a detail panel on `/platform/hospitals/:id`.

**Forbidden:** patient list, visit list, names, emails of patients, chart data.

**Done when:** platform admin can answer “is this tenant alive?” without opening Personnel.

---

## PAF-5 — Gate IPD / OPD by flags

**Columns already exist** on `organizations` and `/me`. PAH said gating was later.

**Do**

1. Frontend: hide IPD nav when `ipd_enabled === false`; hide OPD clinical/frontdesk groups when `opd_enabled === false`. Platform-only users stay on Hospitals only.
2. Backend: IPD routes return **403** `{ error: 'ipd_disabled' }` when the caller’s org has `ipd_enabled === false` (except `/api/v1/ipd/health` if we want ops probes — decide in slice spec: **403 clinical, health stays 200**).
3. Same pattern for a small OPD set only if product names the modules (do not 403 the entire `/api/platform` — hospitals and `/me` must stay).

**Do not:** change flag defaults; do not let hospital `super_admin` flip flags (platform_admin only — already true on PATCH).

**Done when:** a hospital with IPD off cannot open `/ipd/admission` or call admissions APIs.

**Risk:** this touches IPD + sidebar. Own branch. Do not mix with PAF-1…4.

---

## PAF-6 — Shared reference data (later)

**Today:** Terminology / payer catalog UI is gated as hospital `super_admin` (`PLATFORM_ADMIN_ROLES` / payer sets still mean `super_admin`). Data is already mostly global tables.

**Option A (smaller):** sidebar + `requireAnyRole` also allow `platform_admin` for **read** of terminology/reference GET routes. No writes. No payer contract edits.

**Option B (larger):** platform admin is the **owner** of global catalogues; hospital `super_admin` only **enrols** plans. Needs its own PRD — do not sneak into a hospitals slice.

**Recommendation:** A only, after Wave A. B is a new epic (`platform-reference-ownership`).

---

## PAF-7 — Support view (later, security)

**Not in Wave A.** Impersonating a doctor session is out of scope.

**v1 of this slice (if approved):** `GET /api/platform/organizations/:id/support` — same aggregates as PAF-4 plus **staff directory**: profile name, email, roles, last_login — **hospital staff only**, no patients. Every call writes an audit row (`platform_support_access`: actor, org, at).

**v2 (separate approval):** time-boxed impersonation of a **hospital `super_admin`** only, with banner + audit. Never impersonate clinical roles.

---

## Explicitly out of this epic

- Disable or remove public **Register**
- Grant `platform_admin` from UI
- Platform admin opening patient charts / IPD admissions of a tenant
- Changing SQL `is_platform_admin()`
- Re-adding Resend
- Platform admin setting the hospital admin password

---

## Suggested implement order

1. Wave A (PAF-1…4) — done locally.
2. Approve **[PAF-7 spec](../../../specs/features/his-global-south/platform-admin-follow-ons-paf-7-support.md)** then implement only that slice.
3. **PAF-6** — leave until a separate epic picks Option A vs B.
4. Approve **PAF-5** as its own slice (IPD + nav) when wanted.

---

## Clone / branch

- Code: `projects/his-global-south/`
- Start Wave A from `feat/platform-admin-hospitals` (or `develop` after PAH merges)
- Wave B: `feat/platform-admin-module-gating`
- Never commit/push unless asked
