# Suggestion (not v1): Email invite — hospital admin sets password via mail

| Field | Value |
|-------|--------|
| **Parent feature** | `platform-admin-hospitals` |
| **Type** | Product suggestion — **future slice** |
| **Status** | Idea only — **not approved for implementation** |
| **Date** | 2026-08-20 |

---

## Why this is a suggestion

v1 **platform-admin-hospitals** creates the hospital tenant only. Today the app has **no outbound email** (no SMTP, no invite mail, password reset is stubbed).

This document describes a **better onboarding experience** for a later slice — referenced from the main PRD as a recommendation, not a commitment.

---

## Problem it solves

After Platform Admin creates a hospital:

- v1 gap: someone must still create the first admin with a **password typed in the UI** (or manual SQL) — same as Personnel today.
- Better UX: Platform Admin enters **only the hospital admin’s email** → admin receives mail → **they choose their own password** → login.

Benefits:

- Platform Admin never handles or stores hospital admin passwords
- More secure and familiar (invite-link pattern)
- Works when mail infrastructure is added once for the whole platform

---

## Suggested flow (future)

```text
Platform Admin                          Hospital admin (inbox)
────────────────                        ──────────────────────
1. Create hospital (org + OPD/IPD)
2. Enter first admin email only
   (name optional)
3. Click "Send invite"
        ──────────────────────────────► 4. Email: "Welcome to flowMD"
                                           link expires in 72h
                                        5. Clicks link → set password page
                                        6. Chooses password → account active
                                        7. Login at /auth with email + password
```

---

## Suggested mail system (platform-level, one-time build)

| Component | Suggestion |
|-----------|------------|
| **Provider** | Configurable via env — e.g. SMTP, SendGrid, Resend, AWS SES (decide in technical design) |
| **Better Auth integration** | Wire `sendVerificationEmail` / forgot-password / custom invite hook |
| **Templates** | At minimum: (1) Hospital admin invite, (2) Password reset, (3) Optional email verify |
| **Invite token** | Signed, single-use, stored in `verifications` (Better Auth table already exists) |
| **Expiry** | e.g. 72 hours — configurable |
| **Resend invite** | Platform Admin can resend from Hospitals page |
| **No password in API** | Invite create endpoint accepts email only — never plaintext password |

---

## Suggested data / API (future — not v1)

| Step | Suggestion |
|------|------------|
| After hospital create | `POST /api/platform/organizations/:id/invite-admin` `{ email, first_name?, last_name? }` |
| Mail sent | Link like `{FRONTEND_URL}/auth/set-password?token=...` |
| User completes | Better Auth or custom handler creates `users` + `profiles` + `user_roles` for **that hospital’s** `organization_id` |
| Login | Standard `/auth` email + password |

---

## Relationship to v1 PRD

| v1 (implement now) | This suggestion (later) |
|--------------------|-------------------------|
| Create `organizations` row + all fields + OPD/IPD | Same |
| `platform_admin` role + Hospitals UI | Same |
| First admin: **out of scope** OR optional password-in-UI (Personnel pattern) | First admin: **email invite only** |
| No mail system | **Introduce mail system** |

**Recommendation:** Ship v1 hospital record + platform admin first. Add **email invite onboarding** as **Slice 2** once mail provider is chosen.

---

## Open questions (when this becomes a PRD)

1. Which mail provider for Kenya/UAE deployments (sovereign / in-region)?
2. Invite link: same app URL for all hospitals or subdomain per tenant?
3. Must email be verified before first login?
4. Can Platform Admin invite multiple admins at create time?
5. Local dev: mail catcher (Mailpit) vs skip-mail dev mode?

---

## Not in scope for this suggestion doc

- Implementation details, env vars, code paths
- IPD/clinical notifications
- Patient-facing mail (appointments, engagement)

---

## Reference

- Main PRD: [prd.md](./prd.md) — § Suggested follow-up
- Auth today: `backend/src/plugins/auth.ts` — `requireEmailVerification: false`
- User create today (no mail): Personnel / Clinical Staff → sign-up with password
