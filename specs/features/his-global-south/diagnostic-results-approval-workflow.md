# Diagnostic Results — Approval Workflow (Lab + Radiology)

**Project:** his-global-south  
**Status:** Plan (awaiting approval)  
**PRD:** [prd/his-global-south/diagnostic-results-approval-workflow/prd.md](../../../prd/his-global-south/diagnostic-results-approval-workflow/prd.md)  
**Technical design:** [prd/.../technical-design.md](../../../prd/his-global-south/diagnostic-results-approval-workflow/technical-design.md)  
**Supersedes:** Encounter spec decision #6 (“same person finalizes”) in [encounter-lab-radiology-reports.md](./encounter-lab-radiology-reports.md)  
**Related:** [encounter-lab-radiology-reports.md](./encounter-lab-radiology-reports.md), `radiology-report-entry` PRD

---

## 1. Summary

Two-tier **HMIS-style** workflow for lab and radiology — symmetric for both modalities:

| Tier | Roles | Responsibility |
|------|--------|----------------|
| **Operations desk** | `lab_tech`, `phlebotomist`, `radiographer` | In-house processing, send-out handling, **enter/upload results** — does **not** release to ordering clinician |
| **Approval desk** | **`pathologist`** (lab), **`radiologist`** (radiology) | Review pending results on an **approval queue**; **approve** (or reject/amend) → result **released** to doctor / encounter tab |

Existing desk UIs (`LabOrderTracker`, `RadiologyOrderTracker`) stay for operations. **New approval queues** at order/line level for pathologist and radiologist — they see everything awaiting sign-off.

**Doctor / encounter “Reports & Documents” tab:** show a line only when **approved/released** (not when ops desk merely saved a draft or pending result).

---

## 2. Why (product)

- Matches real hospital practice: technician performs study / enters values; **licensed reporting clinician** signs off.
- Keeps current `lab_tech` / `radiographer` roles and shared worklists — no new “team entity”.
- Avoids forcing hospitals to use admin as fake verifier; **`pathologist` and `radiologist` become assignable roles** with dedicated nav.
- Encounter tab stays read-only consumer of **released** results only.

---

## 3. Roles

### 3.1 Keep unchanged (operations)

| Role | Desk | Actions |
|------|------|---------|
| `lab_tech`, `phlebotomist` | Laboratory tracker | Collect/process, enter typed results, upload PDF, send-out — **Submit for approval** |
| `radiographer` | Radiology tracker | In-house exam steps, send-out facility, enter report, upload PDF — **Submit for approval** |

`LAB_ROLES` / `RADIOLOGY_ROLES` gates unchanged for entry/upload.

### 3.2 New / wired for approval

| Role | Desk | Actions |
|------|------|---------|
| **`pathologist`** | **Lab approval queue** (new) | View pending lab lines/orders; approve, reject, request correction |
| **`radiologist`** | **Radiology approval queue** (new) | View pending radiology lines/orders; approve (verify), reject, amend |

**Platform work (prerequisite):**

- Add `pathologist` to `app_role` enum (migration) — **`radiologist` already exists** but is not in `INVITE_ROLES` today; add both to `INVITE_ROLES`, `CREDENTIALED_CLINICAL_ROLES`, frontend roster, seed account optional (`pathologist@flowmd.dev`, `radiologist@flowmd.dev`).
- New role sets in `require-roles.ts`:
  - `LAB_APPROVE_ROLES` = `{ pathologist, super_admin, admin, provider_admin }`
  - `RADIOLOGY_APPROVE_ROLES` = `{ radiologist, super_admin, admin, provider_admin }` (reuse / rename current `RADIOLOGY_VERIFY_ROLES` intent)

Admin tier retains break-glass approve for small sites without dedicated pathologist/radiologist.

### 3.3 UI nav (`staticRoleAccess.ts`)

| Role | Landing | Nav |
|------|---------|-----|
| `pathologist` | Lab approval queue | Laboratory → **Pending approval** (or dedicated `/laboratory/approvals`) |
| `radiologist` | Radiology approval queue | Radiology → **Pending approval** |
| `lab_tech` | Existing lab track | Unchanged — no approval buttons |
| `radiographer` | Existing rad track | Unchanged — **Submit for approval** instead of live release |

Users with **both** ops + approve roles (e.g. admin) see full nav or tab switch.

---

## 4. Lifecycle (per line item)

Symmetric state machine — **approval at line item**; order completes when all lines released (reuse existing “all items resulted” check, extended with approval).

### 4.1 States

| State | Meaning | Doctor / encounter tab |
|-------|---------|-------------------------|
| `ordered` | Placed, not processed | Not ready |
| `in_progress` | Ops desk working (received, processing, imaging) | Not ready |
| **`pending_approval`** | Result entered or PDF uploaded; **awaiting pathologist/radiologist** | **Not ready** (“Awaiting approval”) |
| **`released`** | Approver signed off; `released_at` set | **View / print** |
| `rejected` | Approver sent back to ops (optional v1: comment only) | Not ready |

**Naming note:** Map to existing columns where possible:

- Lab: keep `resulted_at` = ops submission time; add **`approved_at`** + **`approved_by`** (or shared `released_at`) for approver sign-off.
- Radiology: ops save → `radiology_reports.status = 'pending_approval'` (new enum value) or keep `draft` internally but **do not dual-write `resulted_at`** until approved; on approve → `verified` + item `resulted_at` / `released_at`.

**PDF uploads:** Same rule — upload marks line **`pending_approval`**, not released, until pathologist/radiologist approves (configurable v1.1: auto-release routine PDF-only send-out — **default: always approve** for parity).

### 4.2 Flow diagram

```text
                    ┌─────────────────────────────────────┐
                    │  Doctor — Plan tab (place order)     │
                    └──────────────────┬──────────────────┘
                                       │
         ┌─────────────────────────────┴─────────────────────────────┐
         ▼                                                             ▼
┌─────────────────────┐                                   ┌─────────────────────┐
│ LAB OPS DESK        │                                   │ RADIOLOGY OPS DESK  │
│ lab_tech / phleb    │                                   │ radiographer        │
│ In-house + send-out │                                   │ In-house + send-out │
│ Enter / Upload PDF  │                                   │ Enter / Upload PDF  │
│ [Submit for approval]│                                  │ [Submit for approval]│
└──────────┬──────────┘                                   └──────────┬──────────┘
           │ pending_approval                                      │ pending_approval
           ▼                                                         ▼
┌─────────────────────┐                                   ┌─────────────────────┐
│ LAB APPROVAL QUEUE  │                                   │ RAD APPROVAL QUEUE  │
│ pathologist         │                                   │ radiologist         │
│ Approve / Reject    │                                   │ Approve / Reject    │
└──────────┬──────────┘                                   └──────────┬──────────┘
           │ released                                                │ released
           └─────────────────────────┬─────────────────────────────┘
                                       ▼
                    ┌─────────────────────────────────────┐
                    │  Doctor — Reports & Documents tab    │
                    │  View / print (read-only)            │
                    └─────────────────────────────────────┘
```

---

## 5. Approval queue UX (new)

### 5.1 Lab — Pathologist queue

**Route (proposal):** `/orders?type=lab&tab=approve` or `/laboratory/approvals`

**List:** All org lab lines (or orders) with `pending_approval`, filterable by date, priority, STAT, critical flag.

**Row shows:** Accession, patient, test name, who submitted, submitted at, critical badge, PDF vs typed indicator.

**Actions:**

- **Review** → read-only `LabResultDrawer` / PDF viewer
- **Approve** → sets `approved_at`, line → `released`; doctor / encounter tab can view
- **Reject** → line → `rejected`; **returns to ops desk** (lab tracker / radiology tracker) with reason — ops must **re-enter or re-upload**, then **Submit for approval** again. **Doctor never sees rejected or pending lines as final results.**

### 5.2 Radiology — Radiologist queue

**Route (proposal):** `/orders?type=radiology&tab=approve`

Same pattern as lab queue using `RadiologyReportDrawer`.

**Reject:** Same as lab — ops desk shows **“Rejected — re-upload / re-enter”** with approver comment; not visible to ordering doctor until re-submitted and approved.

### 5.3 Ops desk changes

| Today | After |
|-------|--------|
| Lab: Enter Result → live | Enter Result → **Pending approval** toast |
| Rad: Save draft + Verify button | **Save & submit for approval** (one button for ops) |
| Rad: Upload PDF → live | Upload → **Submit for approval** |

Ops tracker shows:

- **“Awaiting pathologist/radiologist”** when `pending_approval`
- **“Rejected — re-enter / re-upload”** when `rejected` (with reason from approver)

No released result visible to ordering clinician until approver approves.

### 5.4 Approval bypass — Emergency triage bedside POC only

**All lab and radiology results require approval before the doctor sees them** — no auto-release by test type, priority, or send-out vs in-house.

**Single exception:** **Emergency triage bedside POC** (`BedsideResultEntry` / `recordBedsidePocResult`) — point-of-care results entered during ED triage **skip the approval queue** and are **released immediately** to the encounter (same as today’s one-save flow).

Implementation marker (pick one in slice B):

- Order/item flag `approval_exempt: true` when `clinicalIndication === "Emergency triage bedside POC"`, **or**
- Dedicated `source: bedside_poc` on create → `enterOrderResults` sets `released` / `approved_at` in same transaction.

Encounter **Reports & Documents** tab and ED consult views treat approval-exempt lines like **released** without pathologist/radiologist step. All other diagnostic orders use the two-tier workflow.

---

## 6. Encounter tab integration

Update [encounter-lab-radiology-reports.md](./encounter-lab-radiology-reports.md) classifier:

| Condition | Doctor sees |
|-----------|-------------|
| No result / not submitted | **Not ready** |
| `pending_approval` | **Awaiting approval** (no View/Print) |
| **`released`** (`approved_at` / approved radiology status + `resulted_at`) | View + print |
| PDF | Same — only after **released** |

Critical badge: show on line when `isCritical` (even in awaiting approval — doctor knows something pending urgent).

---

## 7. Data model (backend)

### 7.1 New enum value

- `app_role`: add **`pathologist`**
- `radiology_reports.status`: add **`pending_approval`** OR reuse `draft` for ops-only and treat `verified` as released (prefer explicit `pending_approval` for clarity)

### 7.2 Columns (minimal)

**`diagnostic_order_items`** (both modalities):

| Column | Purpose |
|--------|---------|
| `submitted_for_approval_at` | Ops submission timestamp |
| `submitted_by` | Profile id |
| `approved_at` | Release to clinician |
| `approved_by` | Pathologist / radiologist profile id |
| `approval_status` | `null` \| `pending_approval` \| `released` \| `rejected` |

Alternatively derive release from `approved_at IS NOT NULL` and keep `resulted_at` for ops submission only — **pick one in technical design** to avoid duplicate truth.

### 7.3 APIs (new)

| Method | Path | Role gate | Purpose |
|--------|------|-----------|---------|
| `POST` | `/api/clinical/orders/items/:itemId/submit-for-approval` | LAB / RADIOLOGY ops | Ops submits line |
| `POST` | `/api/clinical/orders/items/:itemId/approve` | LAB_APPROVE / RADIOLOGY_APPROVE | Release line |
| `POST` | `/api/clinical/orders/items/:itemId/reject` | same | **Required v1** — reason in body; ops re-submit loop |
| `GET` | `/api/clinical/orders?orderType=&approvalStatus=pending_approval` | Approve roles | Approval queues |

Extend `GET /api/clinical/orders?encounterId=` item projection with `approval_status`, `approved_at`.

---

## 8. Implementation slices

### Slice A — Platform roles

- Migration: `pathologist` enum; wire `radiologist` + `pathologist` into invite/roster
- Seed: `pathologist@flowmd.dev`, `radiologist@flowmd.dev`
- `staticRoleAccess`: approval desk nav + landing paths

### Slice B — Backend approval API + item status

- Columns + submit/approve handlers
- Lab: change `enterOrderResults` to **pending_approval** unless `approval_exempt` (bedside POC)
- Rad: ops save → `pending_approval`; approve → release dual-write
- PDF upload: submit for approval unless bedside exempt
- Bedside POC: immediate release (no approval queue)

### Slice C — Approval queue UI

- Lab approval page + Pathologist list
- Radiology approval page + Radiologist list
- Ops tracker: Submit for approval + **Rejected — re-upload** states

### Slice D — Encounter Reports tab (existing plan)

- Classifier uses **`released` / `approved_at`** only
- Pending approval copy: “Awaiting approval”

### Slice E — Polish

- Critical + STAT sorting on approval queues
- Reject reason required; ops resubmit audit trail
- Audit log (who submitted, who approved, who rejected)

---

## 9. Product decisions (resolved)

| # | Decision |
|---|----------|
| 1 | **Two tiers:** ops desk (existing roles) + approval desk (pathologist / radiologist) |
| 2 | **Approval granularity:** per **line item**; order complete when all lines released |
| 3 | **PDF and typed results** both require approval — **no auto-release by test type** |
| 4 | **Admin** can approve as break-glass |
| 5 | **No separate “team” entity** — shared queues by role |
| 6 | Encounter tab: **released only** to doctor; `pending_approval` → “Awaiting approval”; **`rejected` not shown as result** |
| 7 | **Reject v1:** **Required.** Reject sends line **back to lab/radiography ops** to re-enter / re-upload; doctor never sees until re-approved |
| 8 | **Approval bypass:** **Emergency triage bedside POC only** (`BedsideResultEntry`) — immediate release, no pathologist/radiologist queue |
| 9 | **Combined roles:** **Allowed** — same user may hold ops + approve roles (e.g. `radiographer` + `radiologist`, `lab_tech` + `pathologist`); user sees **both** ops tracker and approval queue nav |

---

## 10. Open questions

1. **Notifications:** See [§10.1 Notifications (STAT / critical)](#101-notifications-stat--critical) — recommend **SSE + in-app toast v1**; SMS Phase 2.

### 10.1 Notifications (STAT / critical)

When ops **submits for approval** on a **STAT** and/or **`isCritical`** line, pathologist / radiologist should be alerted. Options by phase:

| Phase | Channel | How | Effort |
|-------|---------|-----|--------|
| **v1a (minimal)** | **Approval queue UI** | Pending count on nav badge; queue sorted **STAT → critical → date**; manual refresh / existing tracker poll | Low — no new infra |
| **v1b (recommended)** | **In-app realtime** | Reuse existing **`sseBroadcaster`** + frontend **`useRealtimeSync`** (same pattern as `emergency_triage.p1_alert` for `ed_doctor`) | Medium — fits current stack |
| **v2** | **SMS / WhatsApp** | `notification_queue` + provider (Twilio, etc.); phone on staff profile; only if user offline &lt; N min | High — not built yet (frontdesk has Phase 2 TODOs) |
| **v2** | **Email** | Same queue; org SMTP / SendGrid | Medium |

#### v1b — recommended implementation (in-app)

**Backend** — on `POST .../submit-for-approval` when `priority === 'stat'` OR `isCritical`:

```typescript
serverEventBus.emit({
  type: 'diagnostic_result.approval_pending',  // new ORCHESTRATION_EVENT
  organizationId,
  orderId,
  itemId,
  orderType: 'laboratory' | 'radiology',
  priority,
  isCritical,
  accessionNumber,
  testName,
});
```

Add event to `SSE_BRIDGE_EVENT_TYPES` → auto-broadcast to org via existing `/api/orchestration/events` SSE.

**Frontend** — extend `useRealtimeSync.ts`:

```typescript
case "diagnostic_result.approval_pending":
  if (roles includes pathologist && orderType === laboratory) {
    toast({ title: "STAT/Critical lab — approval needed", ... });
    invalidateQueries approval queue + lab approve tab
  }
  if (roles includes radiologist && orderType === radiology) { ... }
  break;
```

**Who gets it:** Users **logged in** with `pathologist` / `radiologist` (or combined ops+approve roles). Not a substitute for opening the approval queue — **pointer** to act.

**Scope v1:** Fire on **every** pending submit, or **only STAT + critical** (product: **STAT + critical only** to reduce noise).

#### v2 — SMS (when needed)

1. Table `staff_notification_preferences` (role, channel, phone, enabled).
2. Worker consumes `notification_queue` after SSE emit (or instead if no active SSE clients in org).
3. Template: *"Critical lab result pending approval — Accession LAB-12345"* + deep link to `/orders?type=lab&tab=approve`.

Requires: verified phone numbers, SMS cost, offline pathologist coverage — **defer until in-app proves insufficient**.

#### What exists today

| Asset | Location |
|-------|----------|
| SSE stream | `GET /api/orchestration/events`, `sse.service.ts` |
| Frontend subscriber | `src/hooks/useRealtimeSync.ts` |
| Role-scoped toast precedent | `emergency_triage.p1_alert` → `ed_doctor` only |
| Lab critical banner | `LabOrderTracker` (tracker only, not push) |

**Not built:** staff notification inbox, SMS queue, bell icon with unread count (optional v1.5 between v1b and v2).

---

## 11. Approval

- [x] Product approves two-tier HMIS workflow (reject loop, bedside-only bypass, combined roles)
- [ ] Clinical approves pathologist/radiologist separation
- [ ] Engineering approves data model + slice order
- [x] Encounter tab plan updated to reference this doc

---

## Appendix — files to touch

| Area | Path |
|------|------|
| Role enum / invite | `platform.constants.ts`, migration, `clinicalRoles.ts` |
| Role gates | `require-roles.ts`, `orders.controller.ts` |
| Lab ops | `orders.service.ts` (`enterOrderResults`), `LabOrderTracker.tsx`, `LabResultEntryDrawer.tsx` |
| Rad ops | `radiologyReports.service.ts`, `RadiologyResultEntryDrawer.tsx`, `RadiologyOrderTracker.tsx` |
| New approval UI | `LabApprovalQueue.tsx`, `RadiologyApprovalQueue.tsx` (new) |
| Encounter tab | `encounter-lab-radiology-reports.md` §3.3, `EncounterDiagnosticReportsList.tsx` |
| Nav | `staticRoleAccess.ts`, `Orders.tsx` (add `tab=approve`) |
