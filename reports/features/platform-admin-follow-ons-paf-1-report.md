# PAF-1 — SMTP invite reliability

| Field | Value |
|-------|--------|
| **Plan** | `specs/features/his-global-south/platform-admin-follow-ons-paf-1-smtp.md` |
| **Clone** | `projects/his-global-south/` |
| **Status** | Implemented locally (not committed) |

## Files

- `backend/src/shared/mail.ts` — warn when SMTP_HOST is set but MAIL_FROM or credentials are incomplete
- `src/platform/pages/hospitals/index.tsx` — copy-link vs SMTP note on the list
- `.env.development` already documents Gmail / blank SMTP fallback

## Behaviour

- SMTP filled → invite email; `admin_invite_sent: true` on success
- SMTP blank or send fail → `admin_invite_sent: false` and copy-link UI
- Raw setup URL is not logged
