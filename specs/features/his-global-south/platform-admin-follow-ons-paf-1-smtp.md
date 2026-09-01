# PAF-1 — SMTP invite reliability

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Clone** | `projects/his-global-south/` |
| **Epic** | [platform-admin-follow-ons](../../../prd/his-global-south/platform-admin-follow-ons/plan.md) |

## Goal

Hospital admin invites mail when SMTP env is set. Without SMTP, create/replace still returns a copyable setup link. Never log the raw URL.

## Do

- Keep Nodemailer + `SMTP_*` / `MAIL_FROM`.
- `admin_invite_sent: false` when mail is not configured or send fails.
- Warn (do not crash) when `SMTP_HOST` is set but `MAIL_FROM` / credentials are incomplete.
- List page tells operators to copy the link when SMTP is blank.

## Do not

- Switch back to Resend.
- Put a password on the hospital create form.

## Approval

- [x] Product: Wave A includes SMTP reliability (user 2026-08-23)
- [x] Tech: warn only; copy-link fallback stays
- [x] Scope: PAF-1 only

**Approved by:** user (chat)  
**Date:** 2026-08-23
