# ET-5 — P1 resuscitation alert fan-out + doctor read-only triage summary

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `emergency-triage` |
| **Slice** | ET-5 |
| **Branch** | `feat/emergency-triage` |
| **Goal** | A P1 triage save fires a real-time toast to every signed-in `ed_doctor`; for an emergency encounter, `ConsultationWorkspace`'s first stage tab shows the read-only triage summary instead of "Intake" — matching the PRD's stage-nav mockup |
| **Depends on** | ET-3 (implemented) |
| **PRD** | [prd.md](../../../prd/his-global-south/emergency-triage/prd.md) AC-6, §8.2, §16 |
| **Technical design** | [technical-design.md](../../../prd/his-global-south/emergency-triage/technical-design.md) §7 (corrected) |
| **Slice spec** | [slice-5.md](../../../prd/his-global-south/emergency-triage/slices/slice-5.md) (corrected 2026-08-26) |
| **Status** | Planned — Approval empty |

---

## Approval

- [x] Product: matches AC-6 (P1 → doctor alert) and §8.2 (doctor stage-nav summary, PRD-literal per your explicit direction)
- [x] Tech: reuses ET-3's existing GET endpoint (no new `/summary` route); stage-nav swap is fully conditional on `encounterType`, `CONSULTATION_STAGES` itself untouched
- [x] Scope: OPD `IntakeTab`/stage-nav behavior completely unchanged

**Approved by:** Rahul Ranjan
**Date:** 2026-08-26

**Agent rule:** Do not implement until all boxes are checked and approver name is filled.

---

## Course corrections (already folded into slice-5.md, summarized here)

1. **No existing "toast on SSE event" pattern.** `useRealtimeSync.ts` — the app's only SSE consumer — is purely a cache-invalidation dispatcher today; it has never shown a toast for any event type. This slice builds the *first* one. `toast()` is a standalone importable function (not only a hook), which keeps this simple, but it's new UI infrastructure, not a reuse.
2. **Dropped the planned `/summary` endpoint.** ET-3's `GET /api/clinical/encounters/:id/emergency-triage` already returns the full record and is already role-gated for `ed_doctor` (`ED_STAFF_ROLES`). A second endpoint would be pure duplication.
3. **Stage-nav integration — you asked for the PRD-literal version, confirmed low-risk after investigating.** Not the dialog-reuse fallback originally proposed. See "Previous slices / current code" below for exactly why this turned out safe.

---

## Previous slices / current code (verified facts)

- `orchestration/orchestration.constants.ts`'s `ORCHESTRATION_EVENT` is a flat string-const object; `SSE_BRIDGE_EVENT_TYPES` is the subset that auto-bridges to SSE broadcast. New event type needs adding to both.
- `orchestration/event-bus.ts`'s `DomainEvent` is a strict discriminated union (17 members) — every event gets its own `interface XEvent { type: ...; ...fields }` added to the union (see `ProcedurePerformedEvent` as the shortest existing example to mirror).
- `sse.service.ts`'s `broadcast()` is **org-scoped only, not role-filtered** (confirmed by reading `writeToLocalClients()` — checks `client.organizationId`, nothing else). Role filtering happens client-side.
- `useRealtimeSync.ts`'s `switch (event.type)` has 6 cases today, all `qc.invalidateQueries(...)`, none call `toast(...)`. It doesn't currently import `useAuth` — needed as a new dependency to read `profile.roles` for the `ed_doctor` gate.
- **`CONSULTATION_STAGES`** (`src/pages/consultationWorkspace/types.ts`) = `["intake", "subjective", "objective", "assessment", "plan"]` — this slice does **not** change this array, so `activeStageIndex`, `handleBack`/`handleNext`, and the Next-button's `disabled` condition (`activeStageIndex >= CONSULTATION_STAGES.length - 1`) are all completely unaffected.
- **`IntakeTab.tsx`** (`src/pages/consultationWorkspace/components/tabs/IntakeTab.tsx`) is self-contained — it wraps *itself* in `<TabsContent value="intake" ...>`, not wrapped from the call site. `index.tsx` line ~1127 just renders `<IntakeTab intake={...} patientId={...} />` directly inside the `<ScrollArea>`, alongside `<SubjectiveTab>` etc. (Radix `Tabs` shows/hides based on each `TabsContent`'s own `value` matching `activeTab` — confirmed this is how the existing 5 tabs coexist in the DOM without conditional JSX at the call site.) A new `EmergencyTriageSummaryTab.tsx` can occupy the identical `value="intake"` slot.
- **`clinicalEncounterId`** (`index.tsx` line ~116-159) is explicitly commented "the UUID of the row in the `encounters` table (doctor domain)" — distinct from `visitId` (the route param). It's seeded from `location.state.clinicalEncounterId` when arriving via "Start Consultation," and falls back to `startClinicalEncounter(visitId)` (== `POST /api/clinical/encounters` == the same idempotent `createEncounter()` ET-1/ET-3 already use) when arriving any other way (deep link, refresh, `ErTriagedList` row click without state). This is exactly the id `useEmergencyTriage()` needs — already resolved by existing logic, no new fetch required.
- `encounter.encounterType` is already available in scope in `index.tsx` (already passed to `PatientHeader` at line 1091) — just needs threading into `ConsultationStageNav` too (not currently passed there).
- `ConsultationStageNav.tsx`'s tab labels are hardcoded JSX text ("Intake", "Subjective", etc.) inside five `<TabsTrigger>` elements — changing the first one conditionally is a small, localized edit, not a structural change.
- `emergency_triage_alerts` (ET-3) already has one row written per P1 save, inside the same transaction as the encounter update.

---

## Relevant files

### Modify

```text
backend/src/modules/orchestration/orchestration.constants.ts   # new ORCHESTRATION_EVENT + SSE_BRIDGE_EVENT_TYPES entry
backend/src/modules/orchestration/event-bus.ts                  # new EmergencyTriageP1AlertEvent, added to DomainEvent union
backend/src/modules/clinical/emergencyTriage/emergencyTriage.service.ts   # emit the event on P1 save; extend loadEmergencyEncounter's SELECT to include patient_id
src/hooks/useRealtimeSync.ts                                     # new switch case + useAuth import + toast()
src/components/encounters/EmergencyTriageForm.tsx                # existingRecord branch refactored to use the new shared EmergencyTriageSummary component (dedupe, not rewrite)
src/pages/consultationWorkspace/index.tsx                        # conditional IntakeTab vs EmergencyTriageSummaryTab; pass encounterType to ConsultationStageNav
src/pages/consultationWorkspace/components/ConsultationStageNav.tsx   # encounterType prop, conditional first-tab label
```

### New

```text
src/components/encounters/EmergencyTriageSummary.tsx        # shared read-only presentational component (extracted, richer than ET-3's minimal 4-line version — chief complaint, all signs, TEWS, disposition, priority per PRD §8.2)
src/pages/consultationWorkspace/components/tabs/EmergencyTriageSummaryTab.tsx   # self-wraps in <TabsContent value="intake">, mirrors IntakeTab.tsx's shape
```

### Reference only (do not rewrite)

```text
src/pages/consultationWorkspace/components/tabs/IntakeTab.tsx   # exact pattern to mirror (self-contained TabsContent wrapper)
backend/src/modules/orchestration/sse.service.ts                 # confirms org-scoped-only broadcast, client-side role filter needed
backend/src/modules/frontdesk/visits/visits.service.ts           # provisionServiceLineVisit.ts-style precedent: emit events after the DB write commits, not nested inside a transaction
```

---

## Phases

### Phase A — Backend: typed event + SSE bridge registration

1. `orchestration.constants.ts` — add `EMERGENCY_TRIAGE_P1_ALERT: 'emergency_triage.p1_alert'` to `ORCHESTRATION_EVENT`, add it to `SSE_BRIDGE_EVENT_TYPES`.
2. `event-bus.ts` — add:
   ```ts
   export interface EmergencyTriageP1AlertEvent {
     type: typeof ORCHESTRATION_EVENT.EMERGENCY_TRIAGE_P1_ALERT;
     encounterId: string;
     patientId: string;
     organizationId: string;
     message: string;
   }
   ```
   Add to the `DomainEvent` union.

### Phase B — Backend: emit on P1 save

3. `loadEmergencyEncounter()` in `emergencyTriage.service.ts` currently selects only `id`/`encounter_type`/`triage_status` — extend to also select `patient_id` (avoids a second query for the event payload).
4. In `saveEmergencyTriage()`, after `db.transaction(...)` resolves (not nested inside it — matches the existing `provisionServiceLineVisit.ts`-style precedent of emitting after the write commits), extend the existing `if (priority === 'P1')` block:
   ```ts
   if (priority === 'P1') {
     await serverEventBus.emit({
       type: ORCHESTRATION_EVENT.EMERGENCY_TRIAGE_P1_ALERT,
       encounterId,
       patientId: encounterRow.patient_id,
       organizationId,
       message: 'Resuscitation required — Emergency Sign present on triage.',
     });
   }
   ```

### Phase C — Frontend: toast on P1 alert

5. `useRealtimeSync.ts` — import `useAuth` and `toast`. Add a case gated on `profile.roles.includes('ed_doctor')`. **Confirm `toast()`'s exact param shape against `useToast.ts` before finalizing** — mirror an existing real call site (e.g. an error toast elsewhere in the codebase), don't guess the API.
6. Also invalidate the ER-triaged list's query key in this case, so the doctor's queue picks up the new P1 patient without a manual refresh.

### Phase D — Frontend: extract the shared summary component

7. `EmergencyTriageSummary.tsx` (new) — presentational, `{ record: EmergencyTriageRecord }` prop. Richer than ET-3's current 4-line inline version: chief complaint, all six Emergency Signs (with resuscitation-mode banner if any were YES), Very Urgent/Urgent signs checked, TEWS score + inputs (with the "Provisional" badge, same as the form), investigations, disposition, priority, timestamp. This is the actual "read-only summary" PRD §8.2 asks for — the ET-3 version was intentionally minimal since it was only ever meant as a placeholder inside the dialog.
8. `EmergencyTriageForm.tsx` — replace its inline `existingRecord` JSX block with `<EmergencyTriageSummary record={existingRecord} />` (dedupe, not a rewrite of the mutation/form logic below it).

### Phase E — Frontend: stage-nav integration

9. `EmergencyTriageSummaryTab.tsx` (new) — mirrors `IntakeTab.tsx`'s shape exactly:
   ```tsx
   export function EmergencyTriageSummaryTab({ encounterId }: { encounterId: string | null }) {
     const { data: record, isLoading } = useEmergencyTriage(encounterId ?? undefined);
     return (
       <TabsContent value="intake" className="mt-3 sm:mt-4 space-y-4 sm:space-y-6">
         {isLoading ? <div>Loading…</div> : record ? <EmergencyTriageSummary record={record} /> : <div>Triage not yet completed.</div>}
       </TabsContent>
     );
   }
   ```
10. `ConsultationStageNav.tsx` — add `encounterType?: string` prop; first `<TabsTrigger value="intake">` label becomes `encounterType === 'emergency' ? 'Emergency Triage' : 'Intake'`.
11. `index.tsx` — pass `encounterType={encounter.encounterType}` to `ConsultationStageNav` (new prop threading, ~line 1117-1124). Swap the rendered tab at ~line 1127: `encounter.encounterType === 'emergency' ? <EmergencyTriageSummaryTab encounterId={clinicalEncounterId} /> : <IntakeTab intake={...} patientId={...} />`.

### Phase F — Tests

12. No new unit test required — this slice is wiring (event emission, one conditional swap) not new business logic. Verify live, consistent with ET-1's inflow-wiring validation approach.

---

## Testing strategy

| Layer | What |
|-------|------|
| Manual/live | Save a P1 triage → confirm `serverEventBus.emit()` fires with the right payload (temporary listener script, same technique as ET-1 through ET-4) |
| Manual/live | Save a P2/P3/P4 triage → confirm no event fires |
| Manual/live | Fetch `EmergencyTriageSummaryTab`'s data path directly (via `useEmergencyTriage`-equivalent service call) for a triaged encounter, confirm it returns the full record |
| Regression | `useRealtimeSync`'s existing 6 cases unaffected; OPD encounter's stage nav and `IntakeTab` render exactly as before (code diff review — the swap is purely additive/conditional) |

Browser-level visual confirmation (toast appearance, tab label swap, stage-nav look) can't be verified without a browser automation tool (same caveat as every frontend slice this session) — verified via code paths and live data-layer checks instead, stated plainly rather than claimed as visually confirmed.

---

## Validation commands

```powershell
cd projects/his-global-south/backend
npx tsc --noEmit
npm run test -- src/modules/orchestration/

cd ../
npx tsc --noEmit -p tsconfig.json
```

---

## Acceptance criteria

| # | Criterion | How to verify |
|---|-----------|----------------|
| 1 | P1 save emits `emergency_triage.p1_alert` with correct `encounterId`/`patientId`/`organizationId` | Live check via temporary event listener |
| 2 | P2/P3/P4 save does not emit | Live check |
| 3 | Event emission happens after the DB transaction commits, not nested inside it | Code review |
| 4 | `useRealtimeSync` shows a toast only when `profile.roles` includes `ed_doctor` | Code review + live role-array check |
| 5 | Emergency encounter's `ConsultationStageNav` first tab reads "Emergency Triage" and shows the full read-only summary | Code review + live data check |
| 6 | OPD encounter's stage nav and Intake tab are pixel-identical to before this slice | Regression — diff review |
| 7 | `CONSULTATION_STAGES`, `activeStageIndex`, `handleBack`/`handleNext` completely untouched | Diff review |

---

## Out of scope

- Order deep links (ET-6)
- Any alert type beyond `RESUSCITATION`
- Alert acknowledgment/read-receipt tracking
- TEWS/Urgent Signs values changing from provisional to final (separate, already-tracked pre-go-live item)
