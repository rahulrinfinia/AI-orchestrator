# PRD: Emergency Triage — workflow completion (role restriction, clinician override, overdue visibility)

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `emergency-triage-workflow-completion` |
| **Version** | 1.0 draft |
| **Date** | 2026-08-26 |
| **Status** | Draft — **Gate G1 pending** |
| **Builds on** | `emergency-triage` PRD, `emergency-triage-tews-correction` PRD (both implemented) |

---

## Background & Problem

While walking through how the Emergency Triage feature should behave against real-world ED practice (SATS/CTG protocol — the same standard behind the TEWS correction), three gaps were identified between what a real emergency department does and what this software currently allows:

1. **Anyone can place orders and medication orders.** `POST /api/clinical/orders`, `POST /api/clinical/orders/:id/results`, and `POST /api/clinical/prescriptions` have no role restriction at all — a receptionist account can technically prescribe medication. Real EDs restrict prescribing to licensed prescribers.
2. **No clinician override on computed triage priority.** SATS/CTG's own reference chart explicitly includes *"Senior health care professional's discretion"* as a row spanning all four colors — real triage protocols expect a senior clinician to be able to override the computed color. This software has no such mechanism; whatever `computeTriagePriority()` returns is final.
3. **No visibility into patients waiting past their target time.** SATS defines a target time-to-treat per color (Red: immediate, Orange: <10 min, Yellow: <60 min, Green: <240 min). Real EDs periodically recheck patients who exceed that window, since condition can deteriorate while waiting. This software never surfaces who's overdue.

A fourth suspected gap — the P1 alert not reaching doctors in real time — was investigated and found to **already be fully implemented** (`useRealtimeSync.ts` shows a toast to `ed_doctor` users on the `emergency_triage.p1_alert` SSE event, and the backend bridge already includes this event type). No work needed there.

---

## Goals & Success Metrics

| Goal | Metric | Target |
|------|--------|--------|
| Only appropriate roles can prescribe | Non-prescriber role attempts `POST /prescriptions` | 403 |
| Only appropriate roles can place/result clinical orders | Non-clinical role attempts orders endpoints | 403 |
| Existing OPD order/prescription flows unaffected | Doctor/nurse/PA/NP roles continue to work unchanged | 0 regressions |
| Senior clinician can override computed priority | `ed_doctor` can change an encounter's effective priority with a logged reason | Implemented, audited |
| Original computed priority is never lost | `emergency_triage_records.priority` stays immutable; override is additive | Verified |
| Overdue patients are visibly flagged | ER — Triaged list shows a visual indicator once wait exceeds the SATS target time for that priority | Implemented |

---

## User Personas

| Persona | Who | Needs |
|---------|-----|--------|
| **ED doctor** | `ed_doctor` | Prescribe, override a triage priority when clinical judgment disagrees with the computed score, see who's overdue |
| **ED nurse** | `ed_nurse` | Place lab/POC orders, enter POC results, see who's overdue so they know who to recheck |
| **Receptionist / biller / admin** | non-clinical roles | Should be blocked from placing orders or prescriptions — no clinical justification for access |

---

## User Workflows

### Workflow 1: Non-clinical user attempts to place an order (blocked)

1. A receptionist (no clinical role) is logged in.
2. They attempt `POST /api/clinical/prescriptions` (e.g. via a stray link or API call).
3. System returns 403 `FORBIDDEN_ROLE`.

### Workflow 2: ED doctor overrides a computed priority

1. Patient triaged, system computes P3 (Yellow) from vitals/signs.
2. ED doctor reviews the patient and clinically judges them more urgent than P3.
3. Doctor opens an override control (Consultation Workspace or ER — Triaged list), selects new priority (e.g. P2) and enters a reason.
4. System records the override: who, when, why, and the new effective priority.
5. Patient re-sorts in "ER — Triaged" under the new priority. Original triage record (`emergency_triage_records.priority = P3`) is untouched — it's what the algorithm actually computed, preserved for audit.

### Workflow 3: Patient waits past their target time

1. Patient triaged as P3 (Yellow, target <60 min to doctor).
2. 75 minutes pass with no doctor pickup (`current_step` still `doctor`, no consultation started).
3. "ER — Triaged" list visually flags this patient as **overdue** (e.g. a badge or highlighted row) so staff know to go recheck them.
4. This is a **visibility** feature only in this PRD — it does not auto-escalate priority or force a new triage submission. Staff decide whether to act (e.g. via Workflow 2's override) based on what they see.

---

## User Stories

### US-1: Restrict prescribing to prescriber-equivalent roles

**As a** system
**I want** only doctor-equivalent roles to create prescriptions
**So that** medication orders can't be placed by non-clinical staff

**Acceptance Criteria:**
- [x] `POST /api/clinical/prescriptions` requires one of: `doctor`, `physician_assistant`, `nurse_practitioner`, `ed_doctor`, `clinician` (legacy alias)
- [x] `PATCH /api/clinical/prescriptions/:id/items` (appending items to an existing prescription) requires the same set
- [x] GET/list prescription endpoints remain unrestricted (viewing is not the same risk as creating)
- [x] Existing OPD doctor/PA/NP flows continue to work unchanged

**Priority:** Must Have

---

### US-2: Restrict order creation and result entry to clinical staff roles

**As a** system
**I want** only clinical staff (not receptionist/biller/admin) to place diagnostic orders or enter results
**So that** only people qualified to interpret the order/result can create one

**Acceptance Criteria:**
- [x] `POST /api/clinical/orders`, `PATCH /api/clinical/orders/:id/items`, `PUT /api/clinical/orders/:id`, `POST /api/clinical/orders/:id/cancel`, `POST /api/clinical/orders/:id/results` require a clinical staff role (doctor, nurse, pharmacist, phlebotomist, lab_tech, radiographer, physician_assistant, nurse_practitioner, ed_nurse, ed_doctor, clinician)
- [x] `ed_nurse`/`ed_doctor` added to the shared `CLINICAL_ROLES` role-guard set (currently missing — an ED-only account has no other route access it should have)
- [x] GET/list order endpoints remain unrestricted
- [x] Existing OPD flows continue to work unchanged

**Priority:** Must Have

---

### US-3: ED doctor can override the computed triage priority

**As an** ED doctor
**I want** to override the system-computed priority with a documented reason
**So that** clinical judgment can correct the algorithm when it disagrees with what I'm seeing

**Acceptance Criteria:**
- [x] New endpoint, `ed_doctor`-only: overrides an encounter's *effective* priority
- [x] Requires a reason (non-empty text) — no silent overrides
- [x] Records who overrode it and when
- [x] The original `emergency_triage_records.priority` (what the algorithm computed) is never modified — override is a separate, additive record
- [x] `resuscitation_required` and the P1 alert path are **not** re-triggered by an override (overrides don't re-run BR-1's alert logic — a P1 override doesn't page anyone the way an actual P1 triage does; this is a deliberate scope boundary, not an oversight)
- [x] "ER — Triaged" list sorts by the *effective* (possibly overridden) priority, not the original computed one — sort already keys off `encounters.triage_priority`, which the override updates directly
- [x] Overridden encounters show both values (computed vs. effective) — override popover displays "currently {effective}", `triage_priority_overridden_from` holds the original for anyone querying/auditing

**Priority:** Must Have

---

### US-4: Overdue patients are visually flagged

**As** ED staff
**I want** to see which triaged patients have waited past their priority's target time
**So that** I know who to go recheck, matching SATS's target-time-to-treat standard

**Acceptance Criteria:**
- [x] Target times per priority: P1 = 0 min (immediate), P2 = 10 min, P3 = 60 min, P4 = 240 min
- [x] "ER — Triaged" list computes elapsed time since `triaged_at` and flags any patient past their target as overdue (visual indicator — badge/color, not a blocking action)
- [x] Computed client-side from existing `triaged_at` + `priority` fields — no new backend state required
- [x] Not in scope: automatic re-triage, forced reassessment, or any new "re-triage" form/submission mechanism — this PRD covers **visibility only**

**Priority:** Must Have

---

## Scope

### In Scope
- Add `requireAnyRole(...)` guards to prescriptions and orders routes (US-1, US-2)
- Add `ED_NURSE`/`ED_DOCTOR` to the shared `CLINICAL_ROLES` role-guard set
- New migration: `encounters` table gains override columns (`triage_priority_overridden_from`, `triage_priority_override_reason`, `triage_priority_overridden_by`, `triage_priority_overridden_at`) — effective priority stored in existing `triage_priority` column, original computed value preserved in `triage_priority_overridden_from` only when an override happens
- New endpoint: `PATCH /api/clinical/encounters/:id/emergency-triage/override-priority`
- Frontend: override control (ED doctor only) on the ER — Triaged list and/or Consultation Workspace; overdue badge on ER — Triaged list
- Tests: role-guard rejection/acceptance per role, override endpoint (happy path, non-doctor rejection, reason-required), overdue-flag computation

### Out of Scope
- Automatic re-triage / forced reassessment workflow (only visibility, per US-4)
- Allowing `ed_nurse` (not just `ed_doctor`) to override priority — scoped to doctor only for this PRD; nurse override left as a follow-up if the team wants it
- Re-triggering the P1 alert/SSE toast on override
- Any change to who can *view* orders/prescriptions/results (only creation/mutation is restricted)
- Retroactively restricting already-placed orders/prescriptions

---

## Edge Cases

| Case | Expected behaviour |
|------|---------------------|
| `ed_doctor` with no plain `doctor` role attempts prescribing | Allowed — `ed_doctor` is explicitly included in the prescriber set |
| Nurse attempts to override priority | 403 — override is doctor-only in this PRD |
| Override submitted with empty reason | 400 validation error |
| Encounter overridden twice | Second override overwrites the override fields (from/reason/by/at); it does not stack a history table in this PRD — only the latest override is tracked |
| Patient triaged as P1 (already most urgent) | Overdue badge never applies (target = 0/immediate; effectively always "at risk" rather than "overdue" — no separate flag needed since P1 is already top-sorted and alerted) |
| Doctor already started consultation (`current_step` no longer `doctor`) | Overdue flag no longer applies — the clock is about "waiting for a doctor," not the whole visit |

---

## Design References

- SATS Adult Triage Score + CTG discriminator chart (screenshots provided by clinical lead, 2026-08-26) — target-time-to-treat row, "Senior health care professional's discretion" row
- Original PRD: [`prd/his-global-south/emergency-triage/prd.md`](../emergency-triage/prd.md)
- TEWS correction PRD: [`prd/his-global-south/emergency-triage-tews-correction/prd.md`](../emergency-triage-tews-correction/prd.md)
- Existing role-guard pattern: `backend/src/middleware/require-roles.ts` (`CLINICAL_ROLES`, `requireAnyRole`)
- Existing SSE alert pattern (already working, reference only): `src/hooks/useRealtimeSync.ts`

---

## Dependencies

| Dependency | Notes |
|------------|--------|
| `his-global-south` on `feat/emergency-triage` | Target clone/branch |
| `encounters` table | New override columns — migration required |
| `require-roles.ts` `CLINICAL_ROLES` set | Extended, not replaced |

---

## Open Questions

| # | Question | Default if unanswered |
|---|----------|------------------------|
| 1 | Should `ed_nurse` also be allowed to override priority (not just `ed_doctor`)? | No — doctor only, matches "senior clinician" framing |
| 2 | Should overriding re-trigger the P1 alert/SSE toast if the new priority is P1? | No — out of scope, avoids duplicate/confusing alert semantics for this PRD |
| 3 | Should override history be kept (multiple overrides over time), not just the latest? | No — latest only, for this PRD |

---

## Approval (Gate G1)

- [x] Product — acceptance criteria match intent
- [x] Tech — no architecture/file decisions in this PRD (those go in technical design)
- [x] **Approved by:** Rahul Ranjan (verbal approval — "i want full fix bro")
- [x] **Date:** 2026-08-26

---

## Next step after G1 approval

Say in Cursor on the hub:

```text
PRD approved for his-global-south emergency-triage-workflow-completion. Proceed to technical design.
```
