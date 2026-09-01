# Slice ET-5 — Resuscitation alert fan-out + doctor read-only triage summary

| Field | Value |
|-------|--------|
| **ID** | ET-5 |
| **Depends on** | ET-3 |
| **Technical design refs** | §7 (step 6 of POST save), §5.3 |
| **Tracer** | `ed_nurse` saves a P1 (any Emergency Sign YES) triage → every signed-in `ed_doctor` gets a real-time toast → doctor opens `/consultation/:id` → the first stage tab reads "Emergency Triage" and shows the read-only summary instead of "Intake" |

## Purpose

Closes AC-6 (doctor alert on P1) and the doctor-facing half of the workflow (§9.2/§8.2 "After triage — read-only summary").

**Corrections found during planning, 2026-08-26:**
1. **No existing "toast on SSE event" pattern to reuse.** Checked `useRealtimeSync.ts` (the app's one SSE consumer) — it's purely a react-query cache-invalidation dispatcher today, a `switch` on event type that calls `invalidateQueries`. It has never shown a toast for any event. This slice builds the *first* SSE-triggered toast in the codebase, not a reuse of an established pattern. `toast()` is available as a standalone importable function (not only the `useToast()` hook), which keeps this simple — but it's new UI infrastructure, said plainly.
2. **No separate `/summary` endpoint** — ET-3's `GET /api/clinical/encounters/:id/emergency-triage` already returns the full record and is already role-gated for both `ed_nurse` and `ed_doctor` (`ED_STAFF_ROLES`). A second endpoint returning the same data under a different path would just be a DRY violation. Reuse the existing endpoint.
3. **Doctor read-only view — PRD-literal stage-nav integration, confirmed low-risk after investigation.** User's explicit call (2026-08-26): match the PRD mockup, don't settle for the dialog-reuse fallback. Investigated `ConsultationWorkspace` and found this is safer than it first looked:
   - `CONSULTATION_STAGES` (`intake`/`subjective`/`objective`/`assessment`/`plan`) does **not** need to change — no touching `activeStageIndex`, `handleBack`/`handleNext`, or any stage-count logic.
   - `IntakeTab.tsx` already self-wraps in its own `<TabsContent value="intake">` — it's a self-contained slot, not inline JSX at the call site. A new `EmergencyTriageSummaryTab.tsx` can occupy the exact same `"intake"` slot, swapped in conditionally by `encounter.encounterType`, with zero changes to the Tabs/stage-index plumbing.
   - `ConsultationWorkspace` already distinguishes `clinicalEncounterId` (literally commented "the UUID of the row in the `encounters` table") from the route's `visitId` — with an existing, idempotent fallback resolution path (`startClinicalEncounter(visitId)`, safe to call even when the encounter already exists). This is exactly the id the new tab needs for `useEmergencyTriage()` — already resolved for us, no new fetching logic required.
   - Only `ConsultationStageNav.tsx` needs a new prop (`encounterType`) to swap the "Intake" tab label to "Emergency Triage" for emergency encounters.

## In scope

- Alert fan-out on P1 save: consume the `emergency_triage_alerts` row ET-3 already writes, publish via the existing internal event bus (`orchestration/event-bus.ts`) and push via existing SSE (`orchestration/sse.service.ts`) — same async, non-blocking pattern already used elsewhere in this codebase (per CLAUDE.md: cross-module handlers must never block the originating HTTP response). Target: all `ed_doctor` users in the organization (PRD §16 "pool queue — any ed_doctor", not a specific assignee) — SSE broadcasts are org-scoped only, not role-filtered server-side (confirmed by reading `sse.service.ts`), so role filtering happens client-side in the toast handler.
- Frontend: new toast handler in `useRealtimeSync.ts` for the P1 alert event type, gated on the signed-in user having `ed_doctor` in `profile.roles` (via `useAuth()`, called inside the hook).
- Frontend: `EmergencyTriageSummaryTab.tsx` — new component occupying the `"intake"` `TabsContent` slot for emergency encounters (swapped in place of `IntakeTab.tsx`), rendering the same read-only fields via a shared `EmergencyTriageSummary.tsx` presentational component (extracted from ET-3's `EmergencyTriageForm` `existingRecord` branch, so both places render identically instead of duplicating markup).
- `ConsultationStageNav.tsx` — new `encounterType` prop, labels the first tab "Emergency Triage" instead of "Intake" for emergency encounters.
- `ConsultationWorkspace/index.tsx` — conditionally renders `<EmergencyTriageSummaryTab />` vs `<IntakeTab />` at the same position, using the already-resolved `clinicalEncounterId`.

## Out of scope

- Any alert type other than `RESUSCITATION` (PRD §11.3 only specifies this one `alert_type`)
- Alert acknowledgment/dismissal tracking — not in PRD scope, don't add it
- Editing the summary — it's read-only per BR-5, no write path here
- A new `/summary` endpoint (corrected above — reuses the existing GET)
- Changing `CONSULTATION_STAGES` itself, or any OPD-encounter stage-nav behavior — the swap is purely conditional on `encounterType === 'emergency'`, OPD path is untouched

## Endpoints this slice

None new — reuses `GET /api/clinical/encounters/:id/emergency-triage` (ET-3).

## Acceptance (slice)

- [ ] Saving a P1 triage fires an SSE event visible to every `ed_doctor` in the org within the same request/response cycle's async window (not blocking the nurse's save response)
- [ ] A P2/P3/P4 save does **not** trigger an alert
- [ ] `ed_doctor` sees a toast/banner on the P1 alert
- [ ] For an emergency encounter, `ConsultationStageNav`'s first tab reads "Emergency Triage" (not "Intake") and its content is the read-only triage summary, not `IntakeVitalsSummary`
- [ ] For an OPD encounter, the stage nav and `IntakeTab` render exactly as before — zero regression
- [ ] The existing `GET .../emergency-triage` endpoint's role gate (`ED_STAFF_ROLES`, from ET-3) is unchanged — this slice adds a UI consumer of it, not new auth
- [ ] Degrades correctly with `REDIS_URL` unset (process-local SSE fallback) — same cluster-safety rule this codebase already follows for all SSE, not a new exemption
