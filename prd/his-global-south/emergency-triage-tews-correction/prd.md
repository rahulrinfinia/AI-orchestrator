# PRD: Emergency Triage — TEWS scoring correction (clinical sign-off)

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `emergency-triage-tews-correction` |
| **Version** | 1.0 draft |
| **Date** | 2026-08-26 |
| **Status** | Draft — **Gate G1 pending** |
| **Corrects** | `emergency-triage` PRD (2026) §9.3 "TEWS", §BR-3 — see Background |

---

## Background & Problem

The original `emergency-triage` PRD shipped with the TEWS (Triage Early Warning Score) formula deliberately left unspecified:

> **"TEWS formula: Must be provided by clinical lead. Do not invent without sign-off."** (§9.3)

Because a working feature had to ship, `TEWS_SCORING_TABLE` in `backend/src/modules/clinical/emergencyTriage/emergencyTriage.constants.ts` was implemented with placeholder point bands. The code openly flags this:

> *"provisional SATS-based TEWS/Urgent-Signs standard... shipped now per resolved decision, real clinical values pending sign-off; UI must show a 'Provisional' indicator, not present these as final."*
> *(directly above `URGENT_SIGNS_PROVISIONAL`)* **"PROVISIONAL placeholder, not a verified clinical list... flag for clinical review before go-live."**

The clinical lead has now provided the sign-off: the standard **SATS (South African Triage Scale) Adult Triage Score** table and the **CTG (Cape Triage Group) discriminator list**, both attached to this PRD (see Design References). This PRD scopes bringing the implementation in line with that reference.

### What's actually wrong today (verified against the reference)

| Item | Current code | Reference chart | Gap |
|------|--------------|------------------|-----|
| Heart Rate bands | Matches | Matches | None |
| BP Systolic bands | Matches | Matches | None |
| Respiration bands | 7 bands, 12-20 = normal | 5 bands, 9-14 = normal | **Wrong bands** |
| Temperature bands | 3-tier, max 3 pts, 37.6-38.4 already scores 2 | 3-tier, max 2 pts, 35-38.4 all scores 0 | **Wrong bands, wrong max** |
| Mobility bands | max 3 pts (immobile/carried) | max 2 pts (stretcher/immobile) | **Wrong max** |
| AVPU (consciousness) | Not captured, not scored | 4-tier, 0-3 pts, part of total | **Entirely missing** |
| Trauma | Captured on form (`TRAUMA_OPTIONS`), never scored | 2-tier (No/Yes), part of total | **Captured but unused** |
| TEWS → priority | Single cutoff: TEWS ≥ 3 contributes to P3 only, per original BR-3 "first match wins" | 4 bands: TEWS ≥7→Red, 5-6→Orange, 3-4→Yellow, 0-2→Green, independent of other criteria | **Rule change, see below** |
| Very Urgent Signs (23 items) | Matches reference Orange discriminator column closely | — | Minor label check only |
| Urgent Signs (8 items, marked PROVISIONAL in code) | Barely overlaps reference Yellow discriminator column | — | **Replace with reference list** |

### The BR-3 rule change (flagged explicitly, not silent)

Original PRD's BR-3 is "evaluate in order, first match wins" — TEWS only ever pushes to P3. The clinical reference's CTG discriminator chart treats the TEWS row as **an independent path to any color**, on equal footing with presentation/mechanism-of-injury/pain. This PRD proposes changing BR-3 so that **final priority = the worse of (signs-checklist priority, TEWS-band priority)** — meaning TEWS alone can now produce P1 or P2, which it could not before. This is a deliberate, reviewed change to prior-approved behavior, not an oversight fix, and needs its own sign-off at Gate G1 below.

---

## Goals & Success Metrics

| Goal | Metric | Target |
|------|--------|--------|
| TEWS point table matches clinical reference exactly | RR/HR/SBP/Temp/Mobility bands vs. reference chart | 100% match |
| AVPU is captured and scored | New AVPU field on triage form, included in TEWS sum | Present, summed |
| Trauma contributes to the score | `trauma` field feeds TEWS sum (currently captured, unused) | Wired in |
| TEWS can independently drive priority | A patient with TEWS ≥7 and no signs ticked reaches P1 | Verified in test |
| Urgent Signs list matches reference | Yellow discriminator column items | 100% match |
| No regression to Emergency/Very Urgent Sign checklists | Existing P1/P2 sign-driven paths unchanged | 0 regressions |
| "Provisional" UI indicator removed once corrected | Triage form no longer shows provisional warning | Removed |

---

## User Personas

| Persona | Who | Needs |
|---------|-----|--------|
| **ED nurse** | `ed_nurse` | Enter TEWS vitals + AVPU + trauma, trust the computed score/priority is clinically correct |
| **ED doctor** | `ed_doctor` | Trust that a patient shown as P1/P2 genuinely warrants that urgency, whether from signs or vitals alone |
| **Clinical lead** | Sign-off authority | The chart provided is the single source of truth going forward — implementation must match it exactly |

---

## User Workflows

### Workflow 1: Nurse triages a patient with bad vitals but no obvious signs

1. ED nurse opens triage form for a pending-triage encounter.
2. All six Emergency Signs = No. No Very Urgent Signs ticked. No Urgent Signs ticked.
3. Vitals entered: RR 32, HR 135, SBP 65, Temp normal, AVPU = Unresponsive, Mobility = immobile.
4. TEWS totals ≥7 from vitals alone.
5. System resolves priority to **P1** (previously would have resolved to P4 — no signs ticked, TEWS wasn't allowed to drive above P3, and P3 itself requires the *old* threshold of only ≥3 with no colour banding above it).
6. Patient appears at the top of "ER — Triaged," `resuscitation_required` semantics reviewed under Open Questions.

### Workflow 2: Nurse triages a patient with normal vitals and one Urgent Sign

1. All six Emergency Signs = No. No Very Urgent Signs ticked.
2. One Urgent Sign ticked (from the corrected reference list, e.g. "Abdominal pain").
3. Vitals are all normal (TEWS = 0-2 band, Green).
4. System resolves priority to **P3** — Urgent Sign still valid independently of TEWS, same as today.

### Workflow 3: Existing Emergency Sign / Very Urgent Sign flows (regression check)

1. Any Emergency Sign = Yes → P1, unchanged.
2. No Emergency Sign, any Very Urgent Sign = Yes → P2, unchanged.
3. Confirms sign-driven paths are untouched by this correction.

---

## User Stories

### US-1: Correct the TEWS vital-scoring bands

**As an** ED nurse
**I want** the TEWS score calculated using the correct point bands for RR, HR, SBP, Temperature, and Mobility
**So that** the score reflects the actual clinical standard, not a placeholder

**Acceptance Criteria:**
- [x] Respiration bands match reference chart exactly (<9→2, 9-14→0, 15-20→1, 21-29→2, >29→3)
- [x] Temperature bands match reference chart exactly (<35→2, 35-38.4→0, ≥38.5→2; max 2 points)
- [x] Mobility bands match reference chart exactly (walking→0, with help→1, stretcher/immobile→2; max 2 points)
- [x] Heart Rate and BP Systolic bands re-verified unchanged (already correct)

**Priority:** Must Have

---

### US-2: Add AVPU to the triage form and TEWS score

**As an** ED nurse
**I want** to record the patient's AVPU (Alert / Voice / Pain / Unresponsive) level
**So that** reduced consciousness is reflected in the score, not only via a free-text sign checkbox

**Acceptance Criteria:**
- [x] New form field: AVPU, single-select (Alert / Reacts to Voice / Reacts to Pain / Unresponsive)
- [x] Scores 0/1/2/3 respectively, included in `computeTewsScore()` sum
- [x] ~~Required field~~ — **implementation note:** BR-1 hides the entire TEWS section (including AVPU) in resuscitation mode, where only signs + disposition are ever submitted. Making AVPU unconditionally required at the schema level would break that existing, valid submission path. Shipped as optional, same enforcement tier as Mobility/Trauma/other TEWS vitals — not stronger, matching how none of those are hard-required today either.

**Priority:** Must Have

---

### US-3: Wire Trauma into the TEWS score

**As an** ED nurse
**I want** the trauma field I already fill in to actually count toward the score
**So that** the data I enter isn't silently ignored

**Acceptance Criteria:**
- [x] `trauma` field (existing `TRAUMA_OPTIONS`: none/blunt/penetrating/burn) maps to reference chart's binary No/Yes (none → No/0; blunt/penetrating/burn → Yes/1)
- [x] Included in `computeTewsScore()` sum

**Priority:** Must Have

---

### US-4: TEWS score can independently drive priority (BR-3 change)

**As an** ED doctor
**I want** a patient with severely abnormal vitals to be flagged P1/P2 even if no discriminator sign was ticked
**So that** physiological deterioration isn't missed just because it doesn't match a checklist item

**Acceptance Criteria:**
- [x] TEWS ≥7 → contributes P1-equivalent priority
- [x] TEWS 5-6 → contributes P2-equivalent priority
- [x] TEWS 3-4 → contributes P3-equivalent priority (unchanged threshold behavior, now named explicitly)
- [x] TEWS 0-2 → no priority contribution
- [x] Final priority = worse (more urgent) of sign-checklist priority and TEWS-band priority
- [x] Existing sign-checklist-only paths (Workflow 3) produce identical results to before this change

**Priority:** Must Have — **requires explicit Gate G1 sign-off as a BR-3 rule change, not a silent fix**

---

### US-5: Replace Urgent Signs list with the reference Yellow discriminator column

**As a** clinical lead
**I want** the Urgent Signs checklist to match the CTG discriminator list's Yellow column
**So that** it's no longer a provisional placeholder

**Acceptance Criteria:**
- [x] Urgent Signs list replaced with: Haemorrhage – controlled, Dislocation – finger or toe, Fracture – closed, Burn – other, Abdominal pain, Diabetic – glucose over 17 (no ketonuria), Vomiting – persistent, Pregnancy and trauma, Pregnancy and PV bleed
- [x] `URGENT_SIGNS_PROVISIONAL` renamed/repointed to a non-provisional constant; "Provisional" UI indicator removed for this section

**Priority:** Must Have

---

## Scope

### In Scope
- Correct `TEWS_SCORING_TABLE` bands: respiration, temperature, mobility
- Add AVPU as a new scored input (form field + schema + scoring function)
- Wire existing `trauma` field into the TEWS sum
- Replace `URGENT_SIGNS_PROVISIONAL` content with the reference Yellow discriminator list
- Change priority resolution (BR-3) so TEWS bands can independently reach P1/P2, not only P3
- Remove/adjust "Provisional" UI indicator once corrected
- Tests: unit tests for `computeTewsScore()` per corrected band, `computeTriagePriority()` for the new TEWS-driven paths, regression tests for existing sign-driven paths

### Out of Scope
- Re-verifying Very Urgent Signs (23 items) beyond a label spot-check — already confirmed a close match to reference
- Pediatric TEWS chart (this reference is the **adult** chart only; out of scope until a pediatric chart is provided)
- Changing Emergency Signs (P1 checklist) — untouched
- Changing disposition codes, investigations, or any non-TEWS section of the triage form
- Retroactively recalculating priority on already-triaged (locked, BR-5) encounters

---

## Edge Cases

| Case | Expected behaviour |
|------|---------------------|
| All vitals missing, AVPU/trauma provided | TEWS sums only what's provided (existing `computeTewsScore` null-skip behavior preserved) |
| All TEWS inputs missing entirely | `computeTewsScore` returns `null`, contributes no TEWS-band priority (same as today) |
| TEWS ≥7 but all signs No | Priority = P1 from TEWS band alone (new behavior per US-4) |
| Emergency Sign = Yes but TEWS = 0-2 (Green) | Priority = P1 (signs still take precedence when higher than TEWS band) |
| AVPU = Unresponsive but nurse also fails to tick "Level of consciousness reduced/confused" in Very Urgent Signs | AVPU scoring alone can still push TEWS into a priority-driving band — no longer solely dependent on the checkbox |
| `trauma = none` | Scores 0, same as "No" on reference chart |

---

## Design References

- **SATS Adult Triage Score chart** (screenshot provided by clinical lead, 2026-08-26) — RR/HR/SBP/Temp/AVPU/Trauma/Mobility point table
- **CTG discriminator list, adult version** (screenshot provided by clinical lead, 2026-08-26) — TEWS color bands + presentation/mechanism/pain discriminator columns
- Original PRD: [`prd/his-global-south/emergency-triage/prd.md`](../emergency-triage/prd.md) §9.3, §BR-3
- Current implementation: `backend/src/modules/clinical/emergencyTriage/emergencyTriage.constants.ts`, `emergencyTriage.service.ts`

---

## Dependencies

| Dependency | Notes |
|------------|--------|
| `his-global-south` on `feat/emergency-triage` | Target clone/branch — emergency-triage feature already implemented here |
| `emergency_triage_records` table | May need a new `avpu` column (schema change — DB migration required per `schema-comments.mdc`) |
| Existing `computeTewsScore()` / `computeTriagePriority()` | Modified, not replaced |

---

## Open Questions

| # | Question | Default if unanswered |
|---|----------|------------------------|
| 1 | Should `resuscitation_required` (currently `priority === 'P1'`) also be set when P1 comes from TEWS alone, not just an Emergency Sign? | Yes — same flag, same alert (`EMERGENCY_TRIAGE_P1_ALERT`), regardless of which path produced P1 |
| 2 | AVPU field required on every triage submission, or optional like other vitals? | Required — matches Emergency Signs' "must be answered" enforcement, since it's now score-bearing |
| 3 | Does the pediatric TEWS chart exist and is it in scope for a follow-up PRD? | Out of scope here; follow-up PRD if/when provided |
| 4 | DB migration for new `avpu` column — same migration also needed to store TEWS band color/name explicitly, or is `priority` (P1-P4) sufficient? | `priority` (P1-P4) sufficient; no separate color column |

---

## Approval (Gate G1)

- [x] Product — acceptance criteria match intent, especially **US-4's BR-3 rule change**
- [x] Tech — no architecture/file decisions in this PRD (those go in technical design)
- [x] Clinical — reference chart confirmed as final source of truth (adult only)
- [x] **Approved by:** Rahul Ranjan (verbal approval — "yes go ahead")
- [x] **Date:** 2026-08-26

**Agent rule:** Do not proceed to technical design until all boxes are checked.

---

## Next step after G1 approval

Say in Cursor on the hub:

```text
PRD approved for his-global-south emergency-triage-tews-correction. Proceed to technical design.
```
