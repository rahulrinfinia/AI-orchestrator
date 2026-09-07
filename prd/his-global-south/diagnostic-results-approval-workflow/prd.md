# PRD: Diagnostic Results — Approval Workflow (Lab + Radiology)

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature key** | `diagnostic-results-approval-workflow` |
| **Product** | flowMD |
| **Version** | **1.0** |
| **Date** | 2026-09-05 |
| **Status** | Draft — **Gate G1 pending** (product approved; clinical + engineering review) |
| **Related** | [encounter-lab-radiology-reports PRD](../encounter-lab-radiology-reports/prd.md) · [Implementation spec](../../../specs/features/his-global-south/diagnostic-results-approval-workflow.md) · [technical-design.md](./technical-design.md) · [slices/](./slices/README.md) · [slice-1 plan](../../../specs/features/his-global-south/diagnostic-results-approval-workflow-slice-1.md) |
| **Depends on** | Existing lab/radiology trackers, `enterOrderResults`, radiology report entry |
| **Blocks** | Encounter Reports & Documents tab (doctor view requires **released** results) |

---

## 1. Summary

Introduce a **two-tier HMIS workflow** for lab and radiology results — symmetric for both modalities:

1. **Operations desk** (`lab_tech`, `phlebotomist`, `radiographer`) — process orders, enter typed results, upload PDFs, then **Submit for approval** (does **not** release to ordering clinician).
2. **Approval desk** (**`pathologist`** for lab, **`radiologist`** for radiology) — dedicated **approval queues**; **Approve** releases result to doctor / encounter tab; **Reject** returns line to ops for re-entry / re-upload.

No new “team” or per-user assignment entity — shared worklists by role, same pattern as today’s trackers.

**Single bypass:** Emergency triage **bedside POC** (`BedsideResultEntry`) — immediate release, no approval queue.

---

## 2. Background & problem

| Symptom | Root cause |
|---------|------------|
| Lab results go live the moment tech saves — no sign-off | `enterOrderResults` sets `resulted_at` immediately |
| Radiology has draft/verify split but `radiologist` not assignable via invite | Role in enum; not in `INVITE_ROLES`; ops blocked or admin used as verifier |
| Doctor must leave encounter to `/orders` to find results | No encounter tab (separate PRD) |
| No HMIS-style separation of performer vs reporting clinician | Product never modeled pathologist/radiologist approval desks |

---

## 3. Goals & success metrics

| Goal | Metric | Target |
|------|--------|--------|
| Ops can submit without releasing to doctor | Submit sets `pending_approval`, not `released` | 100% in QA |
| Pathologist/radiologist can approve from dedicated queue | Approve sets `released`; doctor can view | 100% |
| Reject returns work to ops | Ops sees rejected state + reason; can resubmit | 100% |
| Lab and radiology symmetric | Same states, APIs, UX pattern both modalities | 100% |
| Bedside POC unchanged | ED triage bedside results skip approval | 100% |
| STAT/critical alert approver | SSE toast or queue badge on submit | v1b target |
| No regression to send-out PDF path | Upload → submit → approve → view | CI green |

---

## 4. User personas

- **Lab technician / phlebotomist** — ops desk; enter/upload; submit for approval.
- **Radiographer** — ops desk; in-house + send-out; submit for approval.
- **Pathologist** — lab approval queue; approve/reject pending lab lines.
- **Radiologist** — radiology approval queue; approve/reject pending radiology lines.
- **Ordering doctor (OPD)** — consumes **released** results only (via encounter tab — separate PRD).
- **Admin** — break-glass approve when no pathologist/radiologist assigned.

**Combined roles allowed:** e.g. `lab_tech` + `pathologist`, `radiographer` + `radiologist` — user sees both ops tracker and approval queue.

---

## 5. User workflows

### Workflow 1: Lab ops — submit result for approval

**Trigger:** Lab tech has entered typed results or uploaded PDF for a line item.  
**Persona:** Lab technician

1. Complete result entry or PDF upload on lab tracker.
2. Click **Submit for approval**.
3. Line status → `pending_approval`; ordering doctor sees **“Awaiting approval”** (not the result).

### Workflow 2: Pathologist — approve lab result

**Trigger:** Pending line in lab approval queue.  
**Persona:** Pathologist

1. Open `/orders?type=lab&tab=approve` (or equivalent).
2. Review result (drawer / PDF).
3. **Approve** → line `released`; doctor / encounter tab can view and print.
4. Or **Reject** with reason → ops desk shows **“Rejected — re-enter / re-upload”**; doctor never sees result until re-submitted and approved.

### Workflow 3: Radiology ops — submit report for approval

**Trigger:** Radiographer completed in-house report or uploaded PDF.  
**Persona:** Radiographer

1. Enter findings/impression or upload PDF on radiology tracker.
2. **Submit for approval** (replaces separate Verify on ops desk).
3. Line → `pending_approval`.

### Workflow 4: Radiologist — approve radiology result

Same as Workflow 2 on radiology approval queue (`/orders?type=radiology&tab=approve`).

### Workflow 5: Bedside POC bypass (ED triage)

**Trigger:** ED nurse/doctor records bedside POC result.  
**Persona:** ED operational role

1. Save via `BedsideResultEntry` / `recordBedsidePocResult`.
2. Result **released immediately** (`approval_exempt`) — no pathologist/radiologist step.

---

## 6. User stories

### US-1: Ops submit for approval (lab)

**As a** lab technician, **I want** to submit a completed result for pathologist approval **so that** results are not visible to the ordering doctor until signed off.

**Acceptance Criteria:**

- [ ] Submit sets `approval_status = pending_approval`
- [ ] Doctor cannot view result until released
- [ ] Typed and PDF results both require submit

**Priority:** Must Have

### US-2: Pathologist approval queue

**As a** pathologist, **I want** a queue of all pending lab results **so that** I can approve or reject efficiently.

**Acceptance Criteria:**

- [ ] Queue lists pending lines for org; sort STAT → critical → date
- [ ] Approve releases line; reject returns to ops with reason
- [ ] Nav badge for pending count

**Priority:** Must Have

### US-3: Radiologist approval queue

**As a** radiologist, **I want** the same queue pattern for radiology **so that** lab and radiology behave identically.

**Acceptance Criteria:**

- [ ] Symmetric with US-2 for radiology order type
- [ ] Approve/reject APIs role-gated

**Priority:** Must Have

### US-4: Reject and resubmit loop

**As a** lab technician, **I want** to see rejected results with the approver’s reason **so that** I can fix and resubmit.

**Acceptance Criteria:**

- [ ] Rejected lines visible on ops tracker with reason
- [ ] Resubmit returns line to `pending_approval`
- [ ] Doctor never sees rejected content as final

**Priority:** Must Have

### US-5: STAT/critical notification

**As a** pathologist, **I want** an in-app alert when a STAT or critical result is submitted **so that** I can approve urgently.

**Acceptance Criteria:**

- [ ] SSE event on submit when STAT or `isCritical`
- [ ] Toast to logged-in pathologist/radiologist (role-scoped)
- [ ] Deep link to approval queue

**Priority:** Should Have (v1b)

### US-6: Assign pathologist and radiologist roles

**As a** hospital admin, **I want** to invite staff as pathologist or radiologist **so that** approval desks are staffed.

**Acceptance Criteria:**

- [ ] `pathologist` added to `app_role` enum and `INVITE_ROLES`
- [ ] `radiologist` added to `INVITE_ROLES` (enum exists today)
- [ ] Seed/demo accounts optional

**Priority:** Must Have

---

## 7. Scope

### In scope

- New **`pathologist`** role; wire **`radiologist`** into invite/roster
- Item-level `approval_status`, submit / approve / **reject** APIs
- Lab + radiology **approval queue** UI
- Ops tracker: Submit for approval; rejected state
- Bedside POC **approval exempt**
- SSE notification for STAT/critical submit (v1b)
- Admin break-glass approve

### Out of scope

- Per-user case assignment or department teams
- SMS/WhatsApp notifications (Phase 2)
- Auto-release by test type (all require approval except bedside POC)
- IPD-specific approval rules
- Encounter tab UI (separate PRD — consumes `released` only)
- PACS / analyzer integration

---

## 8. Product decisions (resolved)

| # | Decision |
|---|----------|
| 1 | Two tiers: ops desk + approval desk |
| 2 | Per **line item** approval |
| 3 | PDF and typed both require approval |
| 4 | Admin break-glass approve |
| 5 | Shared queues — no team entity |
| 6 | Doctor sees **released** only; pending = “Awaiting approval”; rejected hidden |
| 7 | **Reject required** — ops re-upload / re-enter |
| 8 | **Bypass:** emergency triage bedside POC only |
| 9 | **Combined roles** allowed |
| 10 | Notifications: queue badge + SSE toast for **STAT + critical** (recommended v1b) |

---

## 9. Edge cases

- Multi-study radiology order — approve per line item.
- Mixed in-house/send-out order — each line independent.
- User has both ops + approve roles — sees both tracker and queue.
- Approver rejects after partial panel entry — ops re-enters full line.
- Bedside order must not accidentally enter approval queue (`approval_exempt` flag).

---

## 10. Design references

- Implementation spec: `specs/features/his-global-south/diagnostic-results-approval-workflow.md`
- SSE precedent: `emergency_triage.p1_alert` → `useRealtimeSync.ts`
- No Figma yet.

---

<!-- Paste docs/templates/approval.md when ready for Gate G1 -->
