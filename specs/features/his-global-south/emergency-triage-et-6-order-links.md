# ET-6 — Order deep links

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `emergency-triage` |
| **Slice** | ET-6 |
| **Branch** | `feat/emergency-triage` |
| **Goal** | The triage form's "Orders and procedures" section (never built in ET-3 — explicitly deferred) has three working links that land on the right existing page with the patient/encounter already selected, no manual re-search |
| **Depends on** | ET-3 (implemented) |
| **PRD** | [prd.md](../../../prd/his-global-south/emergency-triage/prd.md) §9.3 "Orders and procedures", AC-13, BR-1 |
| **Technical design** | [technical-design.md](../../../prd/his-global-south/emergency-triage/technical-design.md) §6 |
| **Slice spec** | [slice-6.md](../../../prd/his-global-south/emergency-triage/slices/slice-6.md) |
| **Status** | Planned — Approval empty |

---

## Approval

- [x] Product: matches AC-13 — mapping decision (lab-orders page for both "Nursing and POC Orders" / "POC Result Entry") approved
- [x] Tech: reuses existing pages/components exactly as they are — no new order-entry UI (per PRD §4/§19's explicit prohibition)
- [x] Scope: prescriptions get patient-only prefill (no encounter link — the data model doesn't support one), lab/radiology get both

**Approved by:** Rahul Ranjan
**Date:** 2026-08-26

**Agent rule:** Do not implement until all boxes are checked and approver name is filled.

---

## A mapping decision that needs your read, not just an FYI

PRD §9.3 names three links: **"Nursing and POC Orders," "POC Result Entry," "Medication Order."** Checked the actual codebase — `/orders` (`src/pages/Orders.tsx`) only has two top-level order types: **Laboratory** and **Radiology**. There is no separate "Nursing" or "POC" (Point-of-Care) order type or page anywhere in this codebase (confirmed by a repo-wide search — zero matches for any nursing/POC order component).

Given the "Additional investigations" fields already in the triage form (RBS, Urine, ECG, POCT, Others — all bedside/POC-style tests), the closest sensible mapping is:

| PRD link | Proposed target |
|----------|------------------|
| Nursing and POC Orders | `/orders?type=lab&tab=new&encounterId=...&patientId=...` |
| POC Result Entry | `/orders?type=lab&tab=track&encounterId=...&patientId=...` |
| Medication Order | `/prescriptions?tab=create&patientId=...` |

This is a pragmatic best-fit, not a literal match — there's no dedicated "nursing orders" surface to link to because one doesn't exist in this app. If your hospital's actual workflow has POC/nursing orders living somewhere I haven't found, tell me before I build this on the wrong assumption.

---

## Previous slices / current code (verified facts)

- `Orders.tsx` already reads `?type=lab|radiology&tab=new|track` from the URL (`useOrdersParams()`) but has **zero** patient/encounter context handling today.
- `LabOrderForm.tsx` and `RadiologyOrderForm.tsx` **already accept** `encounterId`/`patientId` props (`prefilledEncounterId`/`prefilledPatientId`) — confirmed by reading both files. `Orders.tsx` just never passes them. This is the smallest possible fix on that side: read 2 more query params, pass 2 more props, done.
- `Prescriptions.tsx` → `PrescriptionForm.tsx` is a bigger gap: `PrescriptionForm` takes **zero props** today, manages patient selection entirely through its own internal `useOrderPatientSearch()` call (with no argument, so no prefill). The hook itself already supports a `prefilledPatientId` parameter — `PrescriptionForm` just never passes one through.
- `PrescriptionForm`'s schema/submission has **no `encounterId` field at all** — prescriptions in this HIS aren't encounter-linked at the data-model level, only patient-linked (unlike `diagnostic_orders`, which has `billing_encounter_id`/`fulfilling_encounter_id`). So "Medication Order" can only prefill the *patient*, not the encounter — this is a real data-model limit, not an oversight to fix in this slice.
- `EmergencyTriageForm.tsx` (ET-3) has no "Orders and procedures" section at all — it was explicitly deferred (slice-3.md's own "Out of scope"). This slice adds it.
- BR-1 requires these 3 links to stay visible **even in resuscitation mode** (PRD §10's exception list: "Show: Chief complaints, Emergency Signs, Orders links, Disposition, Save") — so this section must render outside the `!resuscitationMode` conditional block in the form, unlike Very Urgent/TEWS/Investigations/HIV-TB which are hidden there.

---

## Relevant files

### Modify

```text
src/pages/Orders.tsx                                  # read encounterId/patientId from URL, pass to LabOrderForm/RadiologyOrderForm
src/pages/Prescriptions.tsx                            # read patientId from URL, pass to PrescriptionForm
src/components/prescriptions/PrescriptionForm.tsx      # accept patientId prop, thread into useOrderPatientSearch(patientId)
src/components/encounters/EmergencyTriageForm.tsx       # new "Orders and procedures" section, visible in both modes
```

### Reference only (do not rewrite)

```text
src/components/orders/LabOrderForm.tsx        # already accepts prefilledEncounterId/prefilledPatientId — no change needed
src/components/orders/RadiologyOrderForm.tsx  # same
src/hooks/useOrderPatientSearch.ts             # already accepts prefilledPatientId — no change needed
```

---

## Phases

### Phase A — `Orders.tsx`: read and thread encounter context

1. In `useOrdersParams()` (or a small addition alongside it), read `encounterId`/`patientId` from `location.search` the same way `type`/`tab` already are.
2. Pass `encounterId={encounterId}` and `patientId={patientId}` to both `<LabOrderForm />` and `<RadiologyOrderForm />` (matching each component's existing prop names — confirm exact prop names again at implementation time, they were `encounterId`/`patientId` as the public prop, internally aliased to `prefilledEncounterId`/`prefilledPatientId`).
3. Do not touch `LabOrderTracker`/`RadiologyOrderTracker` (the "track" sub-tabs) unless they also need prefilling — check their prop signatures during implementation; if they already filter by patient search only (no prefill concept), leave them as-is rather than inventing a new prop.

### Phase B — Prescriptions: patient-only prefill

4. `Prescriptions.tsx` — read `patientId` from `useSearchParams()` (already imported), pass as a new prop to `<PrescriptionForm />`.
5. `PrescriptionForm.tsx` — add `interface PrescriptionFormProps { patientId?: string }`, accept it, change `useOrderPatientSearch()` to `useOrderPatientSearch(patientId)`.
6. Do not attempt to add an `encounterId` field to the prescription schema/submission — confirmed above this isn't how prescriptions link to clinical context in this data model. Patient-only prefill is the correct, honest scope here.

### Phase C — Triage form: the Orders and procedures section

7. `EmergencyTriageForm.tsx` — add a new section with the three links (`<a>`/`<Link>` or `window.open`, matching whatever navigation convention the rest of this form's codebase uses — check if this should open in the same tab or a new one; PRD doesn't specify, default to same-tab `navigate()` unless that would lose the nurse's in-progress triage form state, in which case a new-tab open may be safer — decide based on whether the form has unsaved-state loss risk, and note the choice in the implementation).
8. Place this section **outside** the `!resuscitationMode` block — per BR-1, it must render in both modes. Insert near the Disposition section (also always-visible), not inside the hidden Very-Urgent/TEWS/Investigations block.
9. Links use `encounterId`, `patientId` (already props on `EmergencyTriageForm`) to build the query strings from Phase A/B's new param names.

### Phase D — Tests

10. No new automated test — this is pure navigation wiring (3 links, prop threading), consistent with how ET-1's low-risk wiring fixes were validated. Verify live/by code review instead.

---

## Testing strategy

| Layer | What |
|-------|------|
| Code review | `LabOrderForm`/`RadiologyOrderForm` prop names match exactly what `Orders.tsx` now passes |
| Code review | `PrescriptionForm`'s new prop correctly flows into `useOrderPatientSearch` |
| Manual/live | All three links visible in both resuscitation and full-form mode |
| Manual/live | Confirm (can't fully browser-test without automation) that the URL query strings are constructed correctly — checkable via the link `href`/`onClick` target string even without clicking through |
| Regression | `/orders` and `/prescriptions` opened with **no** query params (their existing, non-triage entry points) behave exactly as before — the new props are optional and default to no prefill |

---

## Validation commands

```powershell
cd projects/his-global-south/backend
npx tsc --noEmit

cd ../
npx tsc --noEmit -p tsconfig.json
```

No backend changes in this slice — pure frontend navigation wiring.

---

## Acceptance criteria

| # | Criterion | How to verify |
|---|-----------|----------------|
| 1 | All three links render in the triage form, visible in resuscitation mode too (BR-1) | Code review + live |
| 2 | Lab/radiology links carry both `encounterId` and `patientId` | Code review |
| 3 | Medication Order link carries `patientId` only (documented data-model limit, not a bug) | Code review |
| 4 | `/orders`/`/prescriptions` opened directly (no query params) behave exactly as before this slice | Regression — diff review, all new props optional |
| 5 | No new order-entry or prescription-entry UI was built — pure navigation (PRD §4/§19) | Code review |

---

## Out of scope

- Any new order-entry/result-entry/prescription UI
- Adding encounter-linkage to the prescriptions data model
- A dedicated "Nursing/POC orders" page (doesn't exist; mapped onto the closest existing equivalent, pending your confirmation above)
- Order/prescription tracker ("track" tab) prefilling, unless investigation in Phase A shows it's trivial and already supported
