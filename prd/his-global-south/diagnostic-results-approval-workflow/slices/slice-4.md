# DRA-4 — STAT/critical SSE toast

| Field | Value |
|-------|--------|
| **Feature** | `diagnostic-results-approval-workflow` |
| **Slice** | 4 |
| **Depends on** | [DRA-3](./slice-3.md) (queue UI for deep link); SSE emit may land in DRA-2 |
| **Technical design** | [../technical-design.md](../technical-design.md) §6 |
| **Goal** | Approver gets in-app alert when STAT or critical result submitted |

---

## Purpose

Complete US-5 — realtime notification so pathologists/radiologists do not rely on manual queue refresh for urgent work.

---

## User stories addressed

| Story | Coverage |
|-------|----------|
| US-5 STAT/critical notification | Full |

---

## Scope

### Backend (if not done in DRA-2)

- Constant `ORCHESTRATION_EVENT.DIAGNOSTIC_RESULT_APPROVAL_PENDING`
- Emit from `submitItemForApproval` when `priority === 'stat'` OR lab `abnormal_flag === 'critical'` OR radiology `is_critical`
- Add to `SSE_BRIDGE_EVENT_TYPES`

### Frontend

- `useRealtimeSync.ts` — toast for matching role + modality
- Invalidate `['approval-queue', orderType]` on event
- Toast action: deep link to `/orders?type=lab&tab=approve` (or radiology)

### Tests

- Unit: event payload shape
- Manual: STAT submit while pathologist logged in → toast appears

---

## Out of scope

- SMS / WhatsApp
- Doctor-facing notifications (encounter tab refresh is ELR-4)
- Tab-level banner on encounter

---

## Acceptance criteria (slice)

- [ ] SSE event fires on STAT or critical submit only (not routine)
- [ ] Pathologist sees toast for lab; radiologist for radiology
- [ ] Toast deep link opens approval queue
- [ ] Queue refetches after event
- [ ] No toast for wrong role (e.g. lab_tech)

---

## Modules / files (reference)

| Area | Path |
|------|------|
| Backend | `orchestration.constants.ts`, `event-bus.ts`, `approval.service.ts` |
| Frontend | `useRealtimeSync.ts` |

---

## Approval

- [ ] Product — US-5 acceptance criteria met
- [ ] Tech — follows `emergency_triage.p1_alert` precedent
- [ ] **Approved by:** ___
- [ ] **Date:** YYYY-MM-DD

**Agent rule:** Do not implement until all boxes are checked.
