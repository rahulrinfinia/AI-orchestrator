# Slice PAF-7 — Audited hospital support view

| Field | Value |
|-------|--------|
| **Epic** | platform-admin-follow-ons |
| **Depends on** | PAF-4 (health) — implemented locally |
| **Does not include** | PAF-6 (reference catalogues — **separate epic, not this slice**) |
| **Detail spec** | [specs/features/his-global-south/platform-admin-follow-ons-paf-7-support.md](../../../../specs/features/his-global-south/platform-admin-follow-ons-paf-7-support.md) |

## One sentence

FlowMD `platform_admin` can see **this hospital’s staff** (name, email, roles, last login) plus the existing health counts, and every open of that view is **audited**. No patients. No impersonation.

## Why

Health (PAF-4) answers “is the tenant alive?” Support calls need “who do I talk to?” without logging in as hospital `super_admin` or opening Personnel inside that tenant.

## Easy version

Hospital phone kare: “admin login nahi ho raha / staff kaun hai?”

**Banega:** Hospital edit page par ek list — naam, email, role, last login. Sirf FlowMD `platform@flowmd.ai`. Patient nahi. Password/role change nahi. Unke account se login nahi.

**Record:** Har baar list khule, system likhega kaun dekha, kaunsa hospital, kab.

**Nahi banega ab:** PAF-6 (ICD/medicine catalogues). Woh alag kaam hai.

## Approval

- [x] Product: acceptance criteria match Jira / Figma
- [x] Tech: architecture decisions (AD-N) respected
- [x] Scope: no creep beyond this slice file

**Approved by:** user (chat — implement PAF-7)  
**Date:** 2026-08-23
