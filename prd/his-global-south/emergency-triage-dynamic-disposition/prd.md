# PRD: Emergency Triage — dynamic, per-hospital disposition list

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `emergency-triage-dynamic-disposition` |
| **Version** | 1.0 draft |
| **Date** | 2026-08-27 |
| **Status** | Draft — **Gate G1 pending** |
| **Builds on** | `emergency-triage` PRD, `emergency-triage-workflow-completion` PRD |

---

## Background & Problem

`flowMD` is multi-tenant — many hospitals (`organizations`) share one deployment (confirmed in `platform-admin-hospitals` PRD). Each hospital has its own physical layout.

The Emergency Triage "Disposition from triage" field, however, is a **single hardcoded list shared by every hospital in the system** (`DISPOSITION_CODE`/`DISPOSITION_CODES` in `emergencyTriage.constants.ts`, mirrored in frontend). It was copied verbatim from Appendix A of the original PRD — *"as supplied by product"* for one specific hospital's room layout (ITC Critical Care Room A/B, Surgical Room 9, Room 6, OBS/GYN Room, Isolation, EMC, General Clinic). Every organization using this software sees these exact same 8 rooms today, regardless of whether that's their actual ED layout.

Separately (see `emergency-triage-workflow-completion` PRD discussion): this app already has a real, per-organization **Bed Management** system — `departments` and `units` tables, both scoped by `organization_id` and `facility_id`, already admin-manageable, already used to track real bed inventory (`beds` table, joined to `units`). Checked the current dev data: there's already an "Emergency Department" department with one generic "Emergency Bays" unit (6 beds, EB-1 to EB-6) — proving hospitals *can* model their ED in this system today, just not broken into named rooms, and not connected to the triage disposition field at all.

**Two problems, one root cause:** the disposition list is (a) not per-hospital and (b) not connected to any real room/bed data. Both are solved by the same fix: **make disposition options come from the hospital's own `units` under their Emergency Department, instead of a hardcoded global list.**

---

## Goals & Success Metrics

| Goal | Metric | Target |
|------|--------|--------|
| Each hospital sees its own disposition options | Two different orgs with different ED units see different disposition lists | Verified with 2 orgs |
| Disposition list reflects real, admin-managed data | Adding/renaming/deactivating a unit under a hospital's ED changes what nurses see, without a code deploy | Verified |
| No hospital is left without options | An org with no ED units configured gets a sane fallback, not a broken/empty form | Verified |
| Existing triaged records remain readable | Past `emergency_triage_records.disposition` values (old hardcoded codes) still display correctly even after the switch | Verified |
| Zero regression to the rest of the triage form | Everything else (signs, TEWS, AVPU, priority engine) unaffected | 0 regressions |

---

## User Personas

| Persona | Who | Needs |
|---------|-----|--------|
| **Hospital admin** | `provider_admin` / `super_admin` at one hospital | Define their own ED rooms/bays once, via the existing Bed Management / Facility Master screens — no new admin screen needed if we reuse `units` |
| **ED nurse** | `ed_nurse` | See disposition options that actually match their hospital's real rooms, not someone else's |
| **flowMD platform team** | Building for many hospitals | Ship one system that adapts per hospital, not one hardcoded for the first customer |

---

## Proposed Approach (recommended, pending your call at G1)

**Reuse `units`, don't build a new table.** Concretely:

1. Every hospital has (or gets, via existing Bed Management setup) a `departments` row for their Emergency Department, with one or more `units` rows underneath it representing actual rooms/bays (e.g., "Critical Care Room A," "Isolation," or whatever that hospital actually calls them).
2. The Emergency Triage form's disposition list is fetched live from that org's active `units` under their ED department — instead of the hardcoded `DISPOSITION_CODES` array.
3. `emergency_triage_records.disposition` stores the **unit's `code`** (already a real, stable field on `units`) instead of a fixed enum value — so the column becomes free text (already `text` type — no schema change needed there) rather than a closed hardcoded set.
4. The 8 rooms currently hardcoded become that first hospital's **seed data** (real `units` rows for their org) rather than app-wide code — preserves today's behavior for existing orgs during migration.

This directly fixes both problems at once: per-hospital *and* tied to real room/bed data, satisfying the same reasoning that led to this PRD.

### Why not a simpler, separate new table instead?

A dedicated `emergency_triage_disposition_options` table (org-scoped, but decoupled from Bed Management) would be less work, but would recreate the exact same disconnect this PRD exists to fix — two systems describing the same physical rooms, unlinked. Noted as **Open Question #1** below in case you'd rather ship the simpler version first and connect it to Bed Management later.

---

## User Workflows

### Workflow 1: Hospital admin sets up their ED rooms

1. Admin opens **Facility Master / Bed Management** (existing screens).
2. Under their Emergency Department, adds/edits `units` — e.g., "Resus Bay 1," "Resus Bay 2," "Isolation," "Fast Track" — whatever their hospital actually has.
3. No new screen needed — this reuses the existing unit-management UI.

### Workflow 2: ED nurse completes triage

1. Nurse reaches "Disposition from triage" on the triage form.
2. Sees **their hospital's own** list of rooms (pulled live from that org's ED `units`), not a generic fixed list.
3. Picks one, saves — same as today, just sourced differently.

### Workflow 3: New hospital with no ED units configured yet

1. A newly onboarded hospital hasn't set up any `units` under their Emergency Department yet.
2. Disposition list shows a small number of generic fallback options (e.g., "Emergency Department" as a single catch-all) rather than an empty, broken dropdown — so triage can still be completed.
3. Admin is nudged (banner/notice, not blocking) to configure real rooms later.

---

## User Stories

### US-1: Disposition options are fetched per-organization from real ED units

**As an** ED nurse
**I want** the disposition list to show my hospital's actual rooms
**So that** I'm not sending patients to a fictional room that doesn't exist here

**Acceptance Criteria:**
- [x] New backend endpoint `GET /api/clinical/emergency-triage/disposition-options` returning the calling org's active `units` scoped to their Emergency Department
- [x] Frontend disposition radio list renders these instead of the hardcoded `DISPOSITION_CODES`
- [x] Two different test orgs with different configured units see different lists (live-verified: test org sees 7 seeded rooms, `testhopsital` org query returns zero rows — would correctly fall back)

**Priority:** Must Have

---

### US-2: Fallback when a hospital has no ED units configured

**As a** newly onboarded hospital with no rooms configured yet
**I want** triage to still be completable
**So that** onboarding order doesn't block emergency care

**Acceptance Criteria:**
- [x] If an org has zero active units under their ED department, a single generic fallback option is offered (`EMERGENCY_DEPARTMENT` / "Emergency Department")
- [x] Non-blocking helper text present ("Your hospital's Emergency Department rooms — manage these in Facility Master"), pointing admins to where to configure real rooms

**Priority:** Must Have

---

### US-3: Existing hardcoded disposition data stays readable

**As the** system
**I want** old `emergency_triage_records.disposition` values (saved under the current hardcoded codes) to keep displaying correctly
**So that** historical triage records aren't broken by this migration

**Acceptance Criteria:**
- [x] `disposition` column stays `text` (already was — no data migration forced)
- [x] Old records display their original label — `EmergencyTriageSummary.tsx`'s lookup against the old hardcoded `DISPOSITION_CODES` already had a `?? record.disposition` fallback, so both old codes and new free-text labels resolve correctly with zero changes needed there
- [x] Seeded 6 new named rooms for the test org (Resuscitation Bay 1/2, Critical Care Room A/B, Isolation Room, Fast Track) via real `units` rows, alongside the pre-existing generic "Emergency Bays" unit — 7 total options now live for this org

**Priority:** Must Have

---

## Scope

### In Scope
- New/extended API to fetch an org's ED disposition options from `units`
- Frontend: replace hardcoded `DISPOSITION_CODES` render with live org data
- Seed migration: existing hardcoded 8 rooms become real `departments`/`units` rows for the org(s) currently using them
- Fallback behavior for orgs with no configured units (US-2)
- Tests: multi-org isolation (org A doesn't see org B's rooms), fallback behavior, historical record display

### Out of Scope
- Any change to Bed Management's own screens/CRUD for `units` — reused as-is, not modified
- ~~Linking disposition selection to actual bed *availability*~~ — **delivered same-day as a follow-up**: each room now shows `(available/total beds)`, computed live via a correlated subquery against `beds.status`, red-highlighted at 0 available. Not a hard block on selection — a full room is still selectable, matching real triage practice (patient may need to wait or the room clears before arrival).
- A brand-new admin settings screen — deliberately reusing existing Facility Master / Bed Management UI instead
- Changing anything about TEWS, signs, priority engine, override, or overdue visibility (all separately shipped)

---

## Edge Cases

| Case | Expected behaviour |
|------|---------------------|
| Org has an ED department but zero active units | Fallback option shown (US-2) |
| Org has no ED department at all | Same fallback — treated identically to zero units |
| Admin deactivates a unit that's already referenced by past triage records | Past records keep showing the old label; it just stops appearing as a selectable option going forward |
| Two orgs happen to name a unit the same thing (e.g., both have "Isolation") | No conflict — options are always scoped by `organization_id`, never shared across orgs |
| Admin renames a unit after some triage records already reference its old name | Historical records show whatever `disposition` text was saved at the time (a snapshot, not a live join) — renaming doesn't retroactively change past records |

---

## Design References

- `platform-admin-hospitals` PRD — confirms multi-tenant model or truth
- `emergency-triage` PRD Appendix A — original hardcoded list, becomes seed data
- `emergency-triage-workflow-completion` PRD — where this gap was first raised during testing
- Existing tables: `backend/src/modules/platform/pgschema/departments.pgschema.ts`, `units.pgschema.ts`, `beds.pgschema.ts` — all already `organization_id`-scoped

---

## Dependencies

| Dependency | Notes |
|------------|--------|
| `departments`/`units` tables | Reused, not modified |
| Every org must eventually have an ED department + units configured | Existing orgs get seeded (US-3); new orgs get the fallback (US-2) until an admin sets theirs up |

---

## Open Questions

| # | Question | Default if unanswered |
|---|----------|------------------------|
| 1 | Reuse `units` (recommended, this PRD's approach) or ship a simpler standalone `emergency_triage_disposition_options` table instead, decoupled from Bed Management? | Reuse `units`, per the reasoning above |
| 2 | Should disposition also show live bed *availability* per room (not just the room name)? | No — out of scope, noted as a possible follow-up |
| 3 | Exact fallback option's label/code for orgs with no configured units? | `"Emergency Department"` (generic, matches the department name itself) |
| 4 | Should this also apply to non-emergency dispositions elsewhere in the app, if any exist? | No — scoped to Emergency Triage's disposition field only |

---

## Approval (Gate G1)

- [x] Product — acceptance criteria match intent, especially **Open Question #1's approach** (confirmed: reuse `units`)
- [x] Tech — no architecture/file decisions in this PRD (those go in technical design)
- [x] **Approved by:** Rahul Ranjan ("yes do it")
- [x] **Date:** 2026-08-27

**Agent rule:** Do not proceed to technical design until all boxes are checked.

---

## Next step after G1 approval

Say in Cursor on the hub:

```text
PRD approved for his-global-south emergency-triage-dynamic-disposition. Proceed to technical design.
```
