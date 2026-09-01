# ET-2 — ER nurse list + ED doctor list

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `emergency-triage` |
| **Slice** | ET-2 |
| **Branch** | `feat/emergency-triage` |
| **Goal** | `ed_nurse` sees a "ER — Pending Triage" tab and `ed_doctor` sees an "ER — Triaged" tab on the existing Encounters queue page, both correctly filtered and priority-sorted, with zero changes to the existing OPD tabs |
| **Depends on** | ET-1 (implemented) |
| **PRD** | [prd.md](../../../prd/his-global-south/emergency-triage/prd.md) |
| **Technical design** | [technical-design.md](../../../prd/his-global-south/emergency-triage/technical-design.md) (§7/§9 corrected 2026-08-26) |
| **Slice spec** | [slice-2.md](../../../prd/his-global-south/emergency-triage/slices/slice-2.md) (rewritten 2026-08-26) |
| **Status** | Planned — Approval empty |

---

## Approval

- [x] Product: matches PRD AC-2, AC-10 (partial — AC-5/AC-11 role-visibility half; sort order)
- [x] Tech: matches the corrected technical-design.md §7/§9 — client-side bucketing on `GET /api/frontdesk/visits`, not a new `/api/clinical/encounters` filter (original design assumption was wrong, corrected during this slice's investigation)
- [x] Scope: no creep into ET-3 (triage form) — "Open" action is just the existing `/consultation/:id` navigation, nothing new to build there

**Approved by:** Rahul Ranjan
**Date:** 2026-08-26

**Agent rule:** Do not implement until all boxes are checked and approver name is filled.

---

## Course correction (read this first)

The original technical design (§7) assumed the PRD's "Encounter list" was `GET /api/clinical/encounters` and proposed adding `encounter_type`/`triage_status` query filters to it. **That was wrong.** Investigating this slice found:

- The actual page (`src/pages/encounters/index.tsx`) calls `getEncounters()` (`src/services/encounters.service.ts`), which hits `GET /api/frontdesk/visits` — a completely different backend module (`listVisits()` in `visits.service.ts`, raw SQL with LATERAL joins), not `/api/clinical/encounters` at all.
- That endpoint does **no server-side status/type filtering by tab** today — `listVisitsQuerySchema` only supports `status`, `visit_type`, `date`, `patient_id`, `include_open`, `limit`, `tz` (`additionalProperties: false`). The page fetches one broad "today" list and buckets it into `waiting`/`intake`/`withProvider`/`done` **entirely client-side** (`index.tsx` lines 79-95).
- `listEncounters()` (the function I originally targeted, in `clinical/encounters.service.ts`) backs a *different* endpoint (`GET /api/clinical/encounters`) used elsewhere, not this queue page.

This plan builds ET-2 against the real architecture: extend `listVisits()`'s existing LATERAL join, add two client-side buckets, done — no new endpoint, no new query params. Technical-design.md and slice-2.md have already been corrected to match; this plan is the implementation of the corrected version.

---

## Architecture constraints (from technical-design.md, immutable for this slice)

| ID | Constraint | This slice |
|----|------------|------------|
| TD-7 (corrected) | No new list endpoint; extend the existing `listVisits()` LATERAL join | Backend Phase A |
| TD-9 (corrected) | Client-side bucketing, matching existing `waiting`/`intake`/`withProvider`/`done` pattern | Frontend Phase B |
| — | New ER-specific list components, not a retrofit of `EncounterList.tsx` (that component is OPD-shaped — "Start Intake" action, OPD status colors, wrong columns for PRD §7.1/§7.2) | Frontend Phase C |
| — | Row click reuses existing `/consultation/:id` navigation — confirmed via `EncounterList.tsx`, no new route | Frontend Phase C |

---

## Previous slices / current code (verified facts)

- ET-1 (implemented) added `triage_status`, `triage_priority`, `triage_disposition`, `resuscitation_required`, `current_step`, `triaged_at`, `triaged_by`, `arrived_at` to `encounters`. This slice only needs to *surface* five of them (`triage_status`, `triage_priority`, `current_step`, `arrived_at`, `triage_disposition`, `resuscitation_required` — six, not five) through the existing list query; nothing about ET-1's own columns changes.
- `listVisits()` (`backend/src/modules/frontdesk/visits/visits.service.ts`, ~line 436-511): raw `db.execute(sql\`...\`)`, not Drizzle query builder — this file already deviates from the "prefer query builder" convention for this one complex multi-join query, so this slice's change matches the existing style rather than introducing a second style in the same function.
- The `active_enc` LATERAL subquery (~line 478-486) already joins to `encounters` filtered by `WHERE e.visit_id = v.id AND e.status IN (${ENCOUNTER_OPEN_STATUSES})`, picking the most recently updated open encounter for that visit. This is exactly the row that carries ET-1's new columns — no new join needed, just more columns in its `SELECT`.
- `shapeVisitListRow()` (~line 414-434) spreads `...rest` from the raw row into the response — any new aliased column added to the SQL flows straight to the JSON response with zero code change to this function, confirmed via reading it in full.
- Frontend `getEncounters()` (`src/services/encounters.service.ts` line 213-232) already sends `encounter_type` as a query param, but the backend schema doesn't have that property (`additionalProperties: false` on `listVisitsQuerySchema`) — **this is a pre-existing, unrelated dead param, not something this slice needs to fix.** Filtering for emergency-type visits already works via the `visit_type` param (which the schema does support, and `VISIT_TYPE.EMERGENCY` is already a valid enum value there) if server-side filtering is ever wanted later — but this slice doesn't need it, since it buckets client-side from the already-fetched list like every other tab.
- `EncounterList.tsx` (`src/components/encounters/EncounterList.tsx`): row click navigates to `/consultation/${encounter.id}` (confirmed at 5 call sites in the file). New ER list components should reuse this exact navigation, not invent a different route.
- `EncountersQueueTabs.tsx`: data-driven tab pattern (`.map()` over a config array rendering `<TabsContent>` + `<EncounterList>`). Adding tabs means extending both the `<TabsList>` trigger block and the content array — but ET's new tabs use different list components (see below), so they're added as their own `<TabsContent>` blocks, not folded into the existing `.map()`.
- Role-visibility pattern to reuse: `useAuth()` exposes `profile.roles` (confirmed via `AppSidebar.tsx`'s existing conditional nav-item logic from earlier work this session) — same hook, same `.includes('ed_nurse')`/`.includes('ed_doctor')` check style.

---

## Relevant files

### Modify

```text
backend/src/modules/frontdesk/visits/visits.service.ts       # listVisits() SQL — add 6 columns to active_enc + outer SELECT
src/services/encounters.service.ts                            # Encounter type — add 6 optional fields
src/pages/encounters/index.tsx                                 # two new derived buckets + pass-through props
src/pages/encounters/components/EncountersQueueTabs.tsx        # two new TabsTrigger + TabsContent blocks, role-gated
```

### New

```text
src/pages/encounters/components/ErPendingList.tsx    # PRD §7.1 columns: Encounter No, MRN, Patient name, Age/Gender, Triage status, Time of arrival
src/pages/encounters/components/ErTriagedList.tsx     # PRD §7.2 columns: Priority badge, Encounter No, Patient name, Disposition
src/components/encounters/TriagePriorityBadge.tsx     # P1 red / P2 orange / P3 yellow / P4 green — reused by ET-3/ET-5
```

### Reference only (do not rewrite)

```text
src/components/encounters/EncounterList.tsx    # navigation pattern to mirror (/consultation/:id), not the component to extend
src/pages/encounters/index.tsx                  # existing waiting/intake/withProvider/done bucket pattern (lines 79-95) — mirror exactly
src/components/layout/AppSidebar.tsx            # useAuth()/profile.roles conditional-visibility pattern to mirror
```

---

## Phases

### Phase A — Backend: surface triage columns on the existing visits list

1. In `visits.service.ts`'s `listVisits()`, extend the `active_enc` LATERAL subquery's `SELECT` (~line 479) to add:
   ```sql
   e.triage_status, e.triage_priority, e.current_step,
   e.arrived_at, e.triage_disposition, e.resuscitation_required
   ```
2. Extend the outer `SELECT` list (~line 467-470) to alias them through:
   ```sql
   active_enc.triage_status          AS triage_status,
   active_enc.triage_priority        AS triage_priority,
   active_enc.current_step           AS current_step,
   active_enc.arrived_at             AS arrived_at,
   active_enc.triage_disposition     AS triage_disposition,
   active_enc.resuscitation_required AS resuscitation_required,
   ```
3. Do not touch `opd_enc` or `open_enc` LATERAL joins — they're for a different purpose (OPD-specific encounter status, open-encounter counting) and don't need triage data.
4. No change to `listVisitsQuerySchema`, `ListVisitsQuery` type, or the function signature — this is purely additive columns in the existing query shape.

### Phase B — Frontend: type + derived buckets

5. `src/services/encounters.service.ts`'s `Encounter` interface — add:
   ```ts
   triageStatus?: 'pending' | 'complete' | null;
   triagePriority?: 'P1' | 'P2' | 'P3' | 'P4' | null;
   currentStep?: 'intake' | 'triage' | 'doctor' | null;
   arrivedAt?: string | null;
   triageDisposition?: string | null;
   resuscitationRequired?: boolean | null;
   ```
6. In `src/pages/encounters/index.tsx`, after the existing `waiting`/`intake`/`withProvider`/`done` derivations (~line 85-95), add:
   ```ts
   const priorityRank: Record<string, number> = { P1: 1, P2: 2, P3: 3, P4: 4 };
   const sortByPriorityThenArrival = (a: Encounter, b: Encounter) => {
     const pa = a.triagePriority ? priorityRank[a.triagePriority] : 99;
     const pb = b.triagePriority ? priorityRank[b.triagePriority] : 99;
     if (pa !== pb) return pa - pb;
     return (a.arrivedAt ?? '').localeCompare(b.arrivedAt ?? '');
   };
   const erPending = filtered
     .filter((e) => e.encounterType === 'emergency' && e.triageStatus === 'pending')
     .sort(sortByPriorityThenArrival);
   const erTriaged = filtered
     .filter((e) => e.encounterType === 'emergency' && e.triageStatus === 'complete' && e.currentStep === 'doctor')
     .sort(sortByPriorityThenArrival);
   ```
7. Pass `erPending`/`erTriaged` down to `EncountersQueueTabs` as new props.

### Phase C — Frontend: new list components + priority badge

8. `TriagePriorityBadge.tsx` — small component, `{ priority: 'P1'|'P2'|'P3'|'P4'|null }` prop, renders nothing when null (pre-triage state), color mapping per PRD §7.2/§13 (P1 red, P2 orange, P3 yellow, P4 green) — use existing Tailwind badge/pill conventions from this codebase (check `src/components/ui/badge.tsx` for the base component to build on, don't hand-roll from scratch).
9. `ErPendingList.tsx` — columns per PRD §7.1 (Encounter No = `visitNumber`, **MRN** = `patient.patientId` — confirmed 2026-08-26, labeled "MRN" for consistency with `PatientList.tsx`'s existing table header, not "UMR", Patient name, Age/Gender, Triage status = "Pending", Time of arrival = `arrivedAt` formatted). Row click → `navigate('/consultation/${id}')`, same as `EncounterList.tsx`. Empty state message when `erPending.length === 0`.
10. `ErTriagedList.tsx` — columns per PRD §7.2 (`<TriagePriorityBadge>`, Encounter No, Patient name, Disposition = `triageDisposition` or em-dash placeholder before ET-3 populates it). Same row-click pattern. Empty state message.
11. `EncountersQueueTabs.tsx` — add `erPending`/`erTriaged` props to `EncountersQueueTabsProps`. Add two new `<TabsTrigger>` entries (icon + count, matching existing style) and two new `<TabsContent>` blocks rendering the new components — gated on `useAuth()`'s `profile.roles` including `ed_nurse`/`ed_doctor` respectively (import the hook the same way `AppSidebar.tsx` does).

### Phase D — Tests

12. Backend: extend whatever existing test coverage `visits.service.ts`/`listVisits()` has (check `frontdesk.service.test.ts` first — it may already exercise `listVisits()`) to assert the 6 new fields appear correctly for an emergency-type visit with an active encounter, and are null for an OPD visit.
13. Frontend: no new test file required by this slice's acceptance criteria beyond a manual/live check (see Validation) unless existing `Encounters`/queue-page tests already provide fixtures worth extending — check before deciding.

---

## Testing strategy

| Layer | What |
|-------|------|
| Backend | `listVisits()` returns the 6 new fields correctly for emergency vs. OPD visits |
| Manual/live | Sign in as a user with `ed_nurse` → confirm "ER — Pending Triage" tab appears and lists the ET-1-verified test encounter pattern; sign in as plain `nurse` → confirm the tab does not appear |
| Regression | `waiting`/`intake`/`withProvider`/`done` tabs render identically to before this slice — same data, same counts, same sort |

---

## Validation commands

```powershell
cd projects/his-global-south/backend
npx tsc --noEmit
npm run test -- src/modules/frontdesk/__tests__/frontdesk.service.test.ts

cd ../
npx tsc --noEmit -p tsconfig.json
```

Live verification via the running Docker stack (real sign-in as a test `ed_nurse`/`ed_doctor` account, not just curl) — per this project's established bar, confirm visually in the browser that the tabs appear/hide correctly and the list renders, not just that the API returns the right JSON.

---

## Acceptance criteria

| # | Criterion | How to verify |
|---|-----------|----------------|
| 1 | `GET /api/frontdesk/visits` includes the 6 new fields for emergency visits with an active encounter | Live API call / test |
| 2 | Fields are null for OPD visits | Live API call / test |
| 3 | `ed_nurse` sees "ER — Pending Triage" tab; plain `nurse` does not | Browser check with a real test account |
| 4 | `ed_doctor` sees "ER — Triaged" tab; plain `doctor` does not | Browser check |
| 5 | Pending list sorted priority-then-arrival (NULL priority sorts last, pre-ET-3) | Manual data check |
| 6 | Existing 4 tabs unaffected — same counts/rows as before this slice | Regression check |
| 7 | Row click on an ER-tab row navigates to `/consultation/:id` | Browser check |

---

## Out of scope

- Any change to `/api/clinical/encounters` or `listEncounters()` — that function/endpoint is untouched by this slice, it's simply not the one this feature needs
- The Emergency Triage form itself (ET-3)
- Populating `triagePriority`/`triageDisposition` with real data — that's ET-3's write path; this slice just needs the read/display path to work correctly once data exists
- Fixing the pre-existing dead `encounter_type` query param on `getEncounters()`/`listVisitsQuerySchema` — unrelated to this feature, not touched
