# PRD: Emergency Triage — SATS Enhancement (Reassessment, POC Lifecycle, Handoff & Disposition)

| Field | Value |
|-------|-------|
| **Project** | `his-global-south` |
| **Feature key** | `emergency-triage-sats-enhancement` |
| **Product** | flowMD |
| **Module** | Emergency Triage |
| **Version** | 1.0 draft |
| **Date** | 2026-08-27 |
| **Status** | Draft — **Gate G1 pending** |
| **Builds on** | `emergency-triage` PRD v2.0 (implemented), `emergency-triage-tews-correction` PRD (implemented), `emergency-triage-workflow-completion` PRD (partial/overlapping), `emergency-triage-dynamic-disposition` PRD (draft) |
| **Author** | Product Engineering (from stakeholder requirements) |

---

## Architectural principle (non-negotiable)

**Never overwrite the original triage assessment.**

Initial triage, senior clinical override, and every subsequent reassessment must remain **distinguishable events** with their own timestamps, users, clinical inputs, computed priorities, and audit history. The system must preserve what was known at each point in time — not a single mutable priority field.

---

## 1. Summary

Extend the **existing Emergency Triage** implementation to align with Kenya SATS / Emergency Medicine Kenya Foundation practice: **reassessment while waiting**, **POC/additional-investigation lifecycle during triage and consultation**, **capability-based permissions**, **explicit handoff/acceptance for resuscitation**, **computed vs current priority**, **priority history**, **clinical timestamps**, and **separate triage destination from final encounter disposition**.

This PRD **enhances** the current architecture; it does **not** redesign emergency registration, initial triage form, TEWS/signs calculation, doctor SOAP consultation, or OPD flows from scratch.

---

## 2. Background & problem

### 2.1 What exists today (keep)

The following is **already implemented** and working at a basic level:

```
Patient Registration
        ↓
Emergency Encounter
        ↓
Nurse Emergency Triage
        ↓
TEWS + Signs
        ↓
Priority calculated
        ↓
Triage completed
        ↓
Doctor Queue
        ↓
Doctor opens same consultation workspace
        ↓
Doctor Clinical Assessment
        ↓
Finalize
```

Specifically implemented and **must not be rebuilt**:

- Emergency registration mode and emergency encounter creation
- Nurse emergency triage form (Emergency / Very Urgent / Urgent signs, TEWS, HIV/TB emergency-triage phase)
- Computed colour / P1–P4 priority (sign checklist + TEWS, worse-of rule per TEWS correction)
- Emergency resuscitation mode for P1
- Initial care-area / disposition selection at triage (Bed Management units under ED)
- Triage submission; ER nurse queue; ER doctor queue; priority-based ordering
- SATS target-time overdue badge (P1 immediate, P2 10 min, P3 60 min, P4 240 min)
- Same consultation workspace for doctor; read-only Emergency Triage tab
- Doctor SOAP workflow; doctor orders/prescriptions; patient-locked POC/order popup
- Priority override audit mechanism (`triage_priority_overridden_from`, `triage_priority_overridden_reason`, `triage_priority_overridden_by`, `triage_priority_overridden_at`)

### 2.2 Gaps vs required ED practice

Kenya's Emergency Medicine Kenya Foundation and SATS implementation describe an integrated ED workflow where:

1. Patients **waiting** in the ED may be **reassessed** — condition can change; priority may or may not change.
2. **Overdue** (target time exceeded) should trigger **reassessment required**, not automatic priority escalation.
3. **Additional investigations / POC** (e.g. blood glucose, pregnancy test) are part of triage — not exclusively a doctor activity.
4. POC results may **clinically influence priority** when relevant rules apply — with human review, not blind automation.
5. **POC result-entry UI** for lab/POC orders does not yet exist end-to-end.
6. **Senior clinical discretion** should be a **capability**, not assumed from `ed_doctor` title alone.
7. **Handoff/acceptance** for P1/resuscitation is not explicitly tracked.
8. **Triage destination** (initial care area) and **final encounter disposition** are conflated in the product model.
9. **Computed priority** vs **current effective priority** and a **priority history timeline** are not first-class.
10. After initial triage, the patient effectively **leaves the nurse workflow** — no structured path back for reassessment.

---

## 3. Goals & success metrics

| Goal | Success measure |
|------|-----------------|
| Reassessment without mutating initial triage | Each reassessment is a new auditable event; initial triage record unchanged | 100% of reassessments append history |
| Overdue drives reassessment, not auto-escalation | Target time exceeded → "Reassessment required"; priority unchanged until clinician reassesses | No automatic priority bump on overdue alone |
| POC lifecycle complete | Order → performed → result entered → available → reviewed | End-to-end for nursing POC during triage |
| POC during triage and consultation | Same POC infrastructure serves nurse (triage) and doctor (consultation) paths | One order/result model, two entry contexts |
| Capability-based permissions | Override, reassess, POC enter, handoff gated by capabilities — not role title alone | Unauthorized users receive 403 |
| Handoff accountability | System can answer "Who received this emergency patient?" | P1 handoff fields populated when applicable |
| Destination vs disposition clarity | Triage destination ≠ final disposition; both stored and displayed | Doctor finalize captures final disposition separately |
| Clinical timing metrics | Time-to-triage, time waiting, time-to-clinician, total ED time calculable | Timestamps on encounter/triage events |
| Doctor visibility | Doctor workspace shows initial triage, current priority, history, POC, handoff | Read-only panels complete |
| Zero regression | Existing initial triage, TEWS, queues, SOAP, HIV/TB phase unchanged | 0 regressions on in-scope keep list |

---

## 4. Personas

| Persona | Typical role | Needs |
|---------|--------------|-------|
| **ED triage nurse** | `ed_nurse` | Initial triage, reassessment, POC order/result during triage, see overdue/reassessment queue |
| **ED doctor** | `ed_doctor` | Clinical assessment, reassessment when authorized, POC during consultation, finalize with final disposition |
| **Senior clinician** | e.g. CNP, medical officer with override capability | Override computed priority with reason; may reassess |
| **Resuscitation team member** | Authorized clinician | Accept handoff for P1/resuscitation patients |
| **Front desk** | `receptionist` | Emergency registration only — no triage write |
| **Hospital admin** | `super_admin` / org admin | Configure destinations (Bed Management units), final disposition options |

---

## 5. Required end-to-end workflow

### 5.1 Target workflow

```
Patient Registration
        ↓
Emergency Encounter
        ↓
Initial Emergency Triage
        ↓
Priority Calculation (P1–P4)
        ↓
Triage completed
        ↓
Doctor / Emergency Care Queue
        ↓
Clinical Assessment
        ↓
Treatment
        ↓
Reassessment when required
        ↓
Final Disposition
        ↓
Encounter Completed
```

### 5.2 Priority branching after initial triage

```
              Initial Triage
                   ↓
              Priority P1–P4
                   ↓
             ┌─────┴─────┐
             ↓           ↓
            P1        P2 / P3 / P4
             ↓           ↓
       Resuscitation   Waiting
             ↓           ↓
          Handoff    Reassessment (when due / overdue / clinical need)
             ↓           ↓
             └─────┬─────┘
                   ↓
        Doctor / Clinical Assessment
                   ↓
              Treatment / Orders
                   ↓
           Final Disposition
```

### 5.3 Reassessment loop (core new concept)

```
Initial Triage → P3 (Yellow) → Waiting
        ↓
Reassessment Due / Overdue / Clinical trigger
        ↓
Authorized clinician opens Reassessment
        ↓
New vitals / clinical signs / TEWS
        ↓
New computed priority (may equal or differ from current)
        ↓
Current priority updated only per rules (reassessment outcome / override)
```

**Example history (must be displayable):**

| Time | Event | Priority | By | Notes |
|------|-------|----------|-----|-------|
| 10:05 | Initial triage | P3 | Nurse A | TEWS 3 |
| 10:15 | Senior clinical override | P3 → P2 | Dr B | Clinical judgment |
| 11:05 | Reassessment #1 | P2 → P1 | Nurse C | Deterioration |

---

## 6. Encounter state machine (product model)

```
                    ┌─────────────────┐
                    │ Emergency       │
                    │ Registration    │
                    └────────┬────────┘
                             ↓
                    ┌─────────────────┐
                    │ Encounter       │
                    │ TRIAGE_PENDING  │
                    └────────┬────────┘
                             ↓
                    ┌─────────────────┐
                    │ Initial Triage  │
                    └────────┬────────┘
                             ↓
                    Priority P1–P4
                             │
              ┌──────────────┼──────────────┐
              ↓              ↓              ↓
             P1          P2/P3/P4    Additional investigation
              ↓              ↓              ↓
        Resuscitation     Waiting        POC order
              ↓              │              ↓
          Handoff             │         Result available
              ↓              │              ↓
              └──────┬───────┘       Clinical review
                     │              (priority may change)
                     ↓
              Doctor / Clinical Assessment
                     │
                     ↓
              Reassessment (repeatable)
                     │
                     ↓
              Treatment / Orders
                     ↓
              Final Disposition
                     ↓
              Encounter Completed
```

**Extend (do not replace) existing fields:**

| Current | Action |
|---------|--------|
| `encounterType = emergency` | KEEP |
| `triageStatus = pending` | KEEP |
| `triageStatus = complete` | KEEP — initial triage complete; reassessment is additive |
| `currentStep = intake` | KEEP where applicable |
| `currentStep = doctor` | KEEP — extend with waiting / reassessment / handoff sub-states |
| Emergency signs / Very Urgent / Urgent / TEWS | KEEP on initial triage |
| Computed priority on initial triage | KEEP — immutable |
| Priority override audit fields | KEEP — extend to capability model |
| Bed Management destination at triage | KEEP — rename/model as **triage destination** |
| Doctor SOAP / finalize | KEEP |
| HIV/TB `emergency_triage` phase | LEAVE AS-IS |
| Adult-only TEWS | LEAVE AS-IS (no paediatric extension in this PRD) |
| OPD consultation architecture | LEAVE AS-IS |

---

## 7. Functional requirements

### 7.1 Initial triage — KEEP (no rebuild)

**As implemented today:**

- `ed_nurse` (or role with `EMERGENCY_TRIAGE_CREATE` / `EMERGENCY_TRIAGE_SUBMIT`) completes Emergency Triage form
- Sections: Emergency Signs, Very Urgent Signs, Urgent Signs, TEWS, HIV/TB, Triage Destination
- Calculation: Emergency + Very Urgent + Urgent + TEWS → **computed priority** (P1–P4)
- On submit: `triageStatus = complete`, encounter advances toward doctor queue

**Acceptance:** Existing initial triage behavior unchanged except terminology (disposition → triage destination) and new fields/timestamps added alongside.

---

### 7.2 Emergency reassessment / re-triage — NEW

**Requirement:** After initial triage, the patient must be capable of **reassessment while waiting** (or during care). Reassessment creates a **new event** — the original triage is never edited.

**Data concept:** `triage_reassessments` (or equivalent event store) with at minimum:

| Field | Description |
|-------|-------------|
| `id` | Unique reassessment event id |
| `encounterId` | Parent emergency encounter |
| `sequenceNumber` | 1, 2, 3… per encounter |
| `previousPriority` | Current priority before this event |
| `computedPriority` | Priority computed from this reassessment's signs/TEWS |
| `newPriority` / effective | Priority after reassessment rules (may include override within same flow) |
| `tewsScore` | TEWS from this reassessment |
| `vitals` | Snapshot of vitals inputs |
| `clinicalSigns` | Emergency / very urgent / urgent selections |
| `reason` | e.g. deterioration, routine recheck, overdue, POC-driven |
| `performedBy` | User who performed reassessment |
| `performedAt` | Timestamp |

**Capabilities:** `EMERGENCY_TRIAGE_REASSESS` — assigned to `ed_nurse`, `ed_doctor`, and other authorized clinicians — **not** nurse-only.

**Acceptance criteria:**

- AC-7.2.1: Submitting reassessment appends a new history row; initial triage record is unchanged.
- AC-7.2.2: Reassessment form reuses the same clinical sections as initial triage (signs, TEWS) with a clear "Reassessment" context label.
- AC-7.2.3: User without `EMERGENCY_TRIAGE_REASSESS` receives 403.
- AC-7.2.4: Priority after reassessment may remain unchanged (e.g. P3 → P3) — valid outcome.
- AC-7.2.5: Doctor consultation workspace shows reassessment history read-only.

---

### 7.3 Overdue → reassessment required — CHANGE

**Current:** SATS target times displayed; overdue badge shown. Good — keep.

**Required change:** When target time is exceeded:

```
Target time exceeded → OVERDUE → REASSESSMENT REQUIRED
        ↓
Nurse / authorized clinician reassesses
        ↓
New clinical information
        ↓
Priority may or may not change
```

**Do not:** Automatically change priority when overdue alone.

**Valid outcomes:**

- P3 → 60 min exceeded → Overdue → Reassess → **Still P3**
- P3 → Overdue → Reassess → TEWS increased → **P2**

**Acceptance criteria:**

- AC-7.3.1: Overdue badge remains based on SATS targets (P1 immediate, P2 10 min, P3 60 min, P4 240 min).
- AC-7.3.2: Overdue patients show **Reassessment required** indicator (distinct from overdue badge if both apply).
- AC-7.3.3: No background job or timer auto-updates priority without clinician action.
- AC-7.3.4: Completing reassessment clears "reassessment required" for that cycle until next overdue/due trigger.

---

### 7.4 POC / additional investigation lifecycle — NEW (complete)

**Required lifecycle:**

```
Investigation required → Order → Performed → Result entered → Result available → Result reviewed → May influence clinical priority
```

SATS includes additional investigation in triage; Kenya implementation mentions blood glucose, pregnancy testing, etc.

**Timestamps and actors (required on each POC order/result):**

| Field | Description |
|-------|-------------|
| `orderedBy` / `orderedAt` | Who ordered, when |
| `performedBy` / `performedAt` | Who performed test (if distinct) |
| `resultedBy` / `resultedAt` | Who entered result |
| Result value | Structured or validated entry — not silent overwrite by unrelated user |

**Two legitimate paths — same infrastructure:**

| Path | Actor | Context |
|------|-------|---------|
| **A — Triage POC** | Nurse (triage) | During / after initial triage or reassessment |
| **B — Doctor POC** | Doctor | During consultation workspace |

**Do not:** Create two separate POC systems.

**Acceptance criteria:**

- AC-7.4.1: Nurse with `EMERGENCY_POC_ORDER` and `EMERGENCY_POC_RESULT_ENTER` can order and enter POC results during triage/reassessment.
- AC-7.4.2: Doctor with `EMERGENCY_POC_ORDER` can order during consultation; results viewable with `EMERGENCY_POC_RESULT_VIEW`.
- AC-7.4.3: Result-entry UI exists: Pending Results → Enter Result → Submit → Status = Available.
- AC-7.4.4: Audit trail preserves ordered/performed/resulted actors and timestamps.
- AC-7.4.5: One user cannot silently overwrite another user's entered result without audit (correction/amendment flow if needed — see open questions).

---

### 7.5 POC result can influence priority — NEW (rule-based + clinical review)

**Example:**

```
Triage → reduced consciousness → POC glucose ordered → Result 2.4 mmol/L
        → hypoglycaemia identified → priority change / emergency action
```

**Principle:** Not every POC result auto-changes priority. Flow:

```
Result → Relevant clinical rule? → YES → Recalculate / prompt clinical review → Priority may change via reassessment or override
```

**Acceptance criteria:**

- AC-7.5.1: Clinically configured rules (e.g. critical glucose threshold) can flag "review priority" — not silent auto-escalation without user acknowledgment.
- AC-7.5.2: Priority change from POC flows through reassessment or override event — appears in priority history.
- AC-7.5.3: Non-triage-relevant results do not trigger priority prompts.

---

### 7.6 Senior clinical discretion / override — CHANGE (capability model)

**Current:** `ed_doctor` can override priority; audit fields exist. Keep audit approach.

**Required change:**

- Capability: `EMERGENCY_TRIAGE_OVERRIDE` — not tied to `ed_doctor` title alone
- Authorized roles may include senior nurse practitioner, medical officer, etc. (org-configurable mapping)
- Override is a **clinical event**, not silent field mutation

**Lifecycle:**

```
Computed Priority P3 → Clinical Override → Current Priority P2

Store:
  computedPriority = P3  (unchanged)
  currentPriority = P2
  override: from=P3, to=P2, reason, by, at
```

If reassessment follows: full history preserved (P3 → override P2 → reassessment P1).

**Acceptance criteria:**

- AC-7.6.1: Override requires `EMERGENCY_TRIAGE_OVERRIDE` capability.
- AC-7.6.2: Override requires mandatory reason text.
- AC-7.6.3: Original computed priority on initial triage record never mutated.
- AC-7.6.4: Override appears as distinct entry in priority history timeline.

---

### 7.7 Handoff / acceptance — NEW

For P1 / resuscitation and integrated triage-resuscitation-stabilization practice:

```
Triage → P1 → Resuscitation → Emergency team notified → Clinician accepts patient → Encounter in progress
```

**Fields (minimum):**

| Field | Description |
|-------|-------------|
| `handoffAt` | When handoff initiated |
| `handedOffBy` | User initiating handoff |
| `receivedBy` | Clinician who accepted |
| `receivedAt` | Acceptance timestamp |
| `destination` | Resuscitation / care area |

**Capabilities:** `EMERGENCY_TRIAGE_HANDOFF`, `EMERGENCY_TRIAGE_ACCEPT`

**Acceptance criteria:**

- AC-7.7.1: P1 triage completion can trigger handoff workflow (alongside existing P1 alert).
- AC-7.7.2: System can report who received the patient and when.
- AC-7.7.3: Handoff visible read-only in doctor consultation workspace.

---

### 7.8 Triage destination vs final disposition — CHANGE

**Current:** Disposition dropdown at triage (Bed Management units under ED). **Keep feature**, change terminology and model.

| Concept | When | Example |
|---------|------|---------|
| **Triage destination** (initial care area) | At triage | P1 → Resuscitation bay |
| **Final encounter disposition** | Doctor completes assessment | Admit ICU, Discharge, Transfer, Observation |

**Acceptance criteria:**

- AC-7.8.1: Triage form labels destination as "Initial care area" / "Triage destination" — not "final disposition".
- AC-7.8.2: Doctor finalize captures **final disposition** separately (Discharge, Admit, Transfer, Observation, ICU, other configured options).
- AC-7.8.3: Both values stored, displayed, and reportable independently.

---

### 7.9 Clinical timestamps — NEW

**Minimum timestamp set:**

| Timestamp | Description |
|-----------|-------------|
| `arrivalAt` | Patient arrival / registration time |
| `triageStartedAt` | First triage form opened / started |
| `triageCompletedAt` | Initial triage submitted |
| `doctorQueueAt` | Entered doctor / clinical queue |
| `firstClinicianSeenAt` | First clinician contact documented |
| `assessmentStartedAt` | Doctor assessment started |
| `encounterCompletedAt` | Encounter finalized / disposition complete |

**Derived metrics (reporting / UI):**

- Time to triage
- Time waiting for doctor
- Time to clinician
- Total ED time
- Target breached? (vs SATS target for current priority)

**Acceptance criteria:**

- AC-7.9.1: Timestamps populated automatically where system-detectable; manual backfill not required for MVP.
- AC-7.9.2: Overdue calculation uses consistent clock source (triageCompletedAt or doctorQueueAt — see open questions).

---

### 7.10 Computed priority vs current priority — NEW (explicit model)

Replace implicit single `priority` with explicit pair on encounter (or triage summary):

| Field | Meaning |
|-------|---------|
| `computedPriority` | Result of latest clinical calculation (initial triage or latest reassessment) |
| `currentPriority` | Effective priority for queue sorting and targets (after overrides) |

**Normal case:** both equal.

**Override case:** `computedPriority = P3`, `currentPriority = P2`.

**Reassessment case:** new computed from reassessment; current updated per outcome/override rules.

**Acceptance criteria:**

- AC-7.10.1: ER queues sort and badge by `currentPriority`.
- AC-7.10.2: UI shows both when they differ.
- AC-7.10.3: Initial triage computed priority immutable on initial triage record.

---

### 7.11 Priority history / timeline — NEW

Displayable timeline combining:

- Initial triage
- Overrides
- Reassessments
- POC-driven review events (when applicable)

**Acceptance criteria:**

- AC-7.11.1: Timeline ordered chronologically with event type, from/to priority, user, reason, timestamp.
- AC-7.11.2: Available in nurse triage context and doctor read-only triage panel.

---

### 7.12 Queue & filters — NEW (UI)

**Preference:** Single queue with filters — patient should not disappear into a separate conceptual workflow.

**Filter examples:**

- All
- Waiting
- Reassessment due
- Overdue
- Resuscitation / P1

**Optional labels:** ER Pending, ER Triaged, ER Reassessment Due, ER Resuscitation — as filter presets on one list.

**Acceptance criteria:**

- AC-7.12.1: Reassessment-due and overdue patients discoverable from encounter list without navigation change.
- AC-7.12.2: Priority sort (P1 first, then wait time) preserved within filters.

---

### 7.13 Doctor consultation workspace — KEEP + extend visibility

**Keep unchanged:**

```
Emergency Triage [read-only]
        ↓
Subjective → Objective → Assessment → Plan → Finalize
```

**Add read-only panels / sections:**

- Initial triage summary
- **Current priority** + **computed priority**
- Priority history timeline
- Reassessment history
- POC results (triage + consultation)
- Triage destination
- Handoff information

**Acceptance criteria:**

- AC-7.13.1: Doctor SOAP workflow unchanged.
- AC-7.13.2: All new history/POC/handoff data visible without leaving consultation workspace.

---

### 7.14 Final disposition — NEW

At doctor finalize:

```
Doctor completes assessment → Final disposition
  ├── Discharge
  ├── Admit
  ├── Transfer
  ├── Observation
  ├── ICU
  └── Other (org-configured)
```

**Acceptance criteria:**

- AC-7.14.1: Final disposition required before encounter complete (configurable mandatory field).
- AC-7.14.2: Distinct from triage destination in data model and UI.

---

## 8. Capability model (replace hardcoded role behavior)

Introduce capabilities; map roles to capabilities (org-configurable where product allows):

| Capability | Description |
|------------|-------------|
| `EMERGENCY_TRIAGE_VIEW` | View triage summary and history |
| `EMERGENCY_TRIAGE_CREATE` | Open/create initial triage draft |
| `EMERGENCY_TRIAGE_SUBMIT` | Submit initial triage |
| `EMERGENCY_TRIAGE_REASSESS` | Perform reassessment |
| `EMERGENCY_TRIAGE_OVERRIDE` | Senior clinical priority override |
| `EMERGENCY_TRIAGE_HANDOFF` | Initiate handoff |
| `EMERGENCY_TRIAGE_ACCEPT` | Accept handoff |
| `EMERGENCY_POC_ORDER` | Place POC / investigation order |
| `EMERGENCY_POC_RESULT_ENTER` | Enter POC result |
| `EMERGENCY_POC_RESULT_VIEW` | View POC results |
| `EMERGENCY_CLINICAL_ASSESSMENT` | Doctor SOAP / assessment |
| `EMERGENCY_FINALIZE` | Complete encounter |
| `EMERGENCY_FINAL_DISPOSITION` | Set final disposition |

**Example role mapping (default seed — org may extend):**

| Role | Capabilities |
|------|--------------|
| `ed_nurse` | VIEW, CREATE, SUBMIT, REASSESS, POC_ORDER, POC_RESULT_ENTER, POC_RESULT_VIEW |
| `ed_doctor` | VIEW, REASSESS, CLINICAL_ASSESSMENT, POC_ORDER, POC_RESULT_VIEW, FINALIZE, FINAL_DISPOSITION |
| Authorized senior clinician | VIEW, REASSESS, OVERRIDE (+ optionally others) |

**Acceptance criteria:**

- AC-8.1: API routes enforce capabilities; missing capability → 403.
- AC-8.2: UI hides actions user cannot perform (no dead-end buttons that fail on submit).

---

## 9. User stories

### US-1: Perform initial triage (existing — regression guard)

**As an** ED nurse  
**I want** to complete initial emergency triage with signs, TEWS, and triage destination  
**So that** the patient enters the ED queue with a computed priority  

**Acceptance criteria:**

- Given an emergency encounter with `triageStatus = pending`, when I submit a valid triage form, then `triageStatus = complete`, initial triage record is created, and `computedPriority` / `currentPriority` are set.
- Given any emergency sign YES, when I submit, then computed priority is P1 and resuscitation alert fires per existing behavior.

---

### US-2: Reassess a waiting patient without editing initial triage

**As an** authorized clinician (`EMERGENCY_TRIAGE_REASSESS`)  
**I want** to submit a reassessment with new vitals and signs  
**So that** deteriorating (or improving) patients get an updated priority based on new information  

**Acceptance criteria:**

- Given a triaged patient, when I submit reassessment #1, then a new reassessment event is stored and initial triage is unchanged.
- Given reassessment computes same priority, when I submit, then history shows event with "no change" and current priority unchanged.
- Given reassessment computes higher acuity, when I submit, then `computedPriority` and `currentPriority` update and queue re-sorts.

---

### US-3: Overdue triggers reassessment required, not auto-escalation

**As an** ED nurse  
**I want** overdue patients flagged as needing reassessment  
**So that** I recheck them clinically instead of the system guessing a new priority  

**Acceptance criteria:**

- Given P3 patient waiting > 60 minutes, when I view the encounter list, then overdue and reassessment-required indicators appear.
- Given overdue with no reassessment, when time passes further, then priority does not change automatically.

---

### US-4: Order and enter POC result during triage

**As an** ED nurse  
**I want** to order a POC test and enter its result during triage  
**So that** results like blood glucose can inform triage decisions immediately  

**Acceptance criteria:**

- Given triage in progress, when I order POC glucose, then order shows in pending results with `orderedBy` / `orderedAt`.
- When I enter result 2.4 mmol/L and submit, then result is available, `resultedBy` / `resultedAt` recorded, and critical-value prompt appears per clinical rules.

---

### US-5: Doctor orders POC during consultation (same system)

**As an** ED doctor  
**I want** to order POC from the consultation workspace  
**So that** investigations during assessment use the same order/result infrastructure  

**Acceptance criteria:**

- Given consultation open, when I place POC order, then order appears in shared POC list for encounter.
- Triage-origin and consultation-origin orders distinguishable by context/metadata.

---

### US-6: Senior clinician overrides priority with audit

**As a** clinician with `EMERGENCY_TRIAGE_OVERRIDE`  
**I want** to override computed priority with a documented reason  
**So that** SATS senior discretion is supported without losing the algorithm output  

**Acceptance criteria:**

- Given computed P3, when I override to P2 with reason, then `currentPriority = P2`, computed remains P3, override event in history.
- Given user without capability, when attempting override API, then 403.

---

### US-7: P1 handoff and acceptance

**As a** resuscitation team clinician  
**I want** to accept handoff of a P1 patient  
**So that** accountability exists for who received the patient  

**Acceptance criteria:**

- Given P1 triage complete, when handoff initiated and accepted, then `receivedBy` and `receivedAt` stored and visible in encounter summary.

---

### US-8: Set triage destination vs final disposition

**As an** ED nurse and doctor  
**I want** triage destination and final disposition to be separate  
**So that** initial routing and final outcome are both accurate  

**Acceptance criteria:**

- Given triage, when nurse selects resuscitation bay, then triage destination stored.
- Given doctor finalize, when selecting Admit ICU, then final disposition stored separately from triage destination.

---

### US-9: View priority history and timestamps

**As an** ED doctor  
**I want** to see priority history and ED timing metrics  
**So that** I understand the patient's course in the ED  

**Acceptance criteria:**

- Given encounter with triage, override, and reassessment, when I open doctor workspace, then timeline shows all three events in order.
- Given complete encounter, when viewing summary, then time-to-triage and time-waiting are calculable from timestamps.

---

### US-10: Filter encounter list for reassessment and overdue

**As an** ED nurse  
**I want** to filter the ER list for reassessment-due and overdue patients  
**So that** I can prioritize rechecks on a single queue  

**Acceptance criteria:**

- Given mixed queue, when I filter "Reassessment due", then only matching encounters shown.
- Given filter cleared, then full priority-sorted list returns.

---

## 10. In scope

- Emergency reassessment / re-triage (immutable initial triage + event history)
- Overdue → reassessment required workflow (no auto-escalation)
- POC / additional-investigation full lifecycle
- POC result-entry UI
- POC result review and clinically relevant reprioritization prompts
- POC during triage **and** doctor consultation (shared infrastructure)
- Capability-based override (`EMERGENCY_TRIAGE_OVERRIDE`)
- Explicit override and priority history
- Emergency handoff / acceptance (P1 / resuscitation)
- Triage destination renamed/modeled separately from final disposition
- Clinical timestamps and derived timing metrics
- `computedPriority` vs `currentPriority`
- Reassessment queue filters on existing encounter list
- Doctor workspace read-only extensions (history, POC, handoff)
- Final encounter disposition at doctor finalize

---

## 11. Out of scope

- Paediatric TEWS / paediatric triage template (adult-only remains)
- Rebuilding HIV/TB emergency-triage phase implementation
- Redesigning OPD intake or OPD consultation architecture
- Rebuilding emergency registration or encounter creation from scratch
- Rebuilding initial triage signs / TEWS calculation engine
- IPD auto-admission from disposition (store disposition only)
- Billing module changes
- New top-level sidebar menu for triage (keep Encounter entry point)
- Automatic priority escalation on overdue without clinician reassessment
- Two separate POC systems for triage vs doctor

---

## 12. Edge cases & error handling

| Scenario | Expected behavior |
|----------|-------------------|
| Reassessment attempted before initial triage complete | 422 — initial triage required first |
| User lacks capability for action | 403 with clear error code |
| Override without reason | 422 — reason required |
| POC result entered for cancelled order | 422 — order not in valid state |
| Critical POC result with no clinician acknowledgment | Remain flagged until reviewed / reassessment recorded |
| Multiple simultaneous reassessments | Optimistic lock or last-write-wins with conflict warning — see open questions |
| Encounter finalized | No new triage/reassessment; read-only history |
| Org has no ED units for triage destination | Fallback per dynamic-disposition PRD (empty state message, admin guidance) |
| Historical encounters before this feature | Backfill optional; display "N/A" for missing history fields |
| P4 patient never overdue in shift | No reassessment-required until 240 min threshold |

---

## 13. Current → change summary (implementation boundary)

### Already implemented — do not rebuild

- Emergency registration mode; emergency encounter creation
- Nurse emergency triage; Emergency / Very Urgent / Urgent signs; TEWS calculation
- Computed colour / P1–P4 priority; emergency resuscitation mode
- HIV/TB emergency-triage phase
- Initial care-area / disposition selection; triage submission
- ER nurse queue; ER doctor queue; priority-based ordering; SATS overdue badge
- Same consultation workspace; read-only Emergency Triage tab; doctor SOAP; doctor orders/prescriptions
- Priority override audit mechanism; patient-locked POC/order popup

### Build or change

- Emergency reassessment / re-triage
- Reassessment history (no mutation of original triage)
- Overdue → reassessment workflow
- POC complete lifecycle; result-entry UI; result review
- Result-driven clinical reprioritization (rule-based + review)
- POC during triage and consultation (shared infra)
- Capability-based senior override; explicit override history
- Handoff / acceptance
- Triage destination vs final disposition
- Clinical timestamps; computed vs current priority; priority history
- Reassessment queue filters; final disposition workflow

### Explicitly do not change

- Adult-only scope (no paediatric extension)
- HIV/TB emergency-triage implementation
- Existing OPD / doctor consultation architecture

---

## 14. Dependencies & related PRDs

| PRD | Relationship |
|-----|--------------|
| `emergency-triage` v2.0 | Base implementation — must remain stable |
| `emergency-triage-tews-correction` | Priority calculation rules — reassessment uses same engine |
| `emergency-triage-workflow-completion` | Overlap on override and overdue — this PRD supersedes/extends where broader |
| `emergency-triage-dynamic-disposition` | Triage destination sourcing from Bed Management units |

---

## 15. Open questions (for G1 review — not blockers to draft)

1. **Reassessment cadence:** Should the system propose reassessment intervals by priority (e.g. P3 every 60 min while waiting) or only react to overdue + manual trigger?
2. **POC critical rules:** Which POC results and thresholds are in MVP (glucose, pregnancy, others)? Who signs off clinical rules?
3. **Result correction:** If nurse entered wrong POC result, is amendment a new event or editable with audit?
4. **Handoff scope:** Mandatory for all P1 only, or also P2 orange?
5. **Final disposition options:** Org-configured list — reuse existing reference data or new admin screen?
6. **Clock for overdue:** Start from `triageCompletedAt`, `doctorQueueAt`, or `arrivalAt`?
7. **Concurrent reassessment:** Lock encounter during reassessment form or allow conflict detection?
8. **Capability assignment UI:** Seed defaults only for MVP, or org admin capability matrix in this release?

---

## 16. Approval

| Gate | Status | Approver | Date |
|------|--------|----------|------|
| G1 — Product PRD | Pending | | |
| G2 — Technical design | Not started | | |

**To approve:** Reply **APPROVE PRD** after review. Technical design follows G1 approval.
