# PR #58 — Option A: const-derived types for `encounterReportAvailability`

**Project:** `his-global-south`  
**Branch:** `feat/dra-radiology-inhouse-approval`  
**Reviewer:** @hemantinfinia — `"Type?"` on `EncounterReportAvailability`  
**Goal:** Replace raw string unions with `as const` + derived types (`labFulfillment.ts` pattern). **One file only.** No new paths, no stale imports.

---

## Comment categorization

| Comment | Category | Action |
|---------|----------|--------|
| `"Type?"` on string union | **Fix Required (Option A)** | Add const objects + derived types in same file |
| Split to `clinical/types/` | **Skip** | User chose single-file pattern (same as `approvalWorkflow.ts`) |
| Move types to `encounterReports.constants.ts` | **Skip** | That file is query-keys only (ELR pattern) |

---

## Reference pattern

From `src/clinical/constants/labFulfillment.ts`:

```typescript
export const LAB_FULFILLMENT_TYPE = { IN_HOUSE: 'in_house', SEND_OUT: 'send_out' } as const;
export type LabFulfillmentType = (typeof LAB_FULFILLMENT_TYPE)[keyof typeof LAB_FULFILLMENT_TYPE];
// handlers use LAB_FULFILLMENT_TYPE.IN_HOUSE — not raw strings
```

Same file keeps constants + derived types + helpers — **no split**.

---

## Scope — files touched

| File | Change |
|------|--------|
| `src/clinical/constants/encounterReportAvailability.ts` | **Only file to edit** |

### Files that must NOT change (imports stay valid)

| File | Imports today | After |
|------|---------------|-------|
| `components/consultation/EncounterDiagnosticReportsList.tsx` | `classifyLab…`, `classifyRad…`, `type ClassifiedEncounterReportLine` | **Same path, same symbols** |
| `pages/consultationWorkspace/index.tsx` | `countAvailableEncounterReportLines` | **Same** |
| `clinical/constants/__tests__/encounterReportAvailability.test.ts` | classify helpers | **Same** — tests use string literals in `toMatchObject`; runtime values unchanged |

### Symbols not imported anywhere else (grep verified)

- `EncounterReportAvailability` — **internal + export only**
- `EncounterReportViewKind` — **internal + export only**
- New `ENCOUNTER_REPORT_AVAILABILITY` / `ENCOUNTER_REPORT_VIEW_KIND` — export for consistency; **zero external importers required**

**No importer edits** → no stale reference risk.

---

## Implementation steps

### Step 1 — Add const objects + derived types (top of file, replace lines 5–7)

```typescript
export const ENCOUNTER_REPORT_AVAILABILITY = {
  AVAILABLE: 'available',
  AWAITING_APPROVAL: 'awaiting_approval',
  NOT_READY: 'not_ready',
} as const;

export type EncounterReportAvailability =
  (typeof ENCOUNTER_REPORT_AVAILABILITY)[keyof typeof ENCOUNTER_REPORT_AVAILABILITY];

export const ENCOUNTER_REPORT_VIEW_KIND = {
  LAB: 'lab',
  RADIOLOGY: 'radiology',
} as const;

export type EncounterReportViewKind =
  (typeof ENCOUNTER_REPORT_VIEW_KIND)[keyof typeof ENCOUNTER_REPORT_VIEW_KIND];
```

`ClassifiedEncounterReportLine` stays unchanged (still uses the two type names).

### Step 2 — Replace string literals inside this file only

| Was | Becomes |
|-----|---------|
| `availability: "awaiting_approval"` | `availability: ENCOUNTER_REPORT_AVAILABILITY.AWAITING_APPROVAL` |
| `availability: "not_ready"` | `availability: ENCOUNTER_REPORT_AVAILABILITY.NOT_READY` |
| `availability: "available"` | `availability: ENCOUNTER_REPORT_AVAILABILITY.AVAILABLE` |
| `classifyPending("lab")` | `classifyPending(ENCOUNTER_REPORT_VIEW_KIND.LAB)` |
| `classifyAvailable("radiology")` | `classifyAvailable(ENCOUNTER_REPORT_VIEW_KIND.RADIOLOGY)` |
| `viewKind: "lab"` (rejected branch) | `viewKind: ENCOUNTER_REPORT_VIEW_KIND.LAB` |
| `viewKind: "radiology"` (rejected branch) | `viewKind: ENCOUNTER_REPORT_VIEW_KIND.RADIOLOGY` |

**Do not change:** `approvalStatus === "pending_approval"` etc. — those are **order approval status** strings from API, not `EncounterReportAvailability`.

### Step 3 — Export surface (unchanged names + optional new const exports)

**Keep exporting (same as today):**

- `EncounterReportAvailability` (type)
- `EncounterReportViewKind` (type)
- `ClassifiedEncounterReportLine` (type)
- All existing functions + deprecated `classifyEncounterReportLine`

**Add exporting:**

- `ENCOUNTER_REPORT_AVAILABILITY`
- `ENCOUNTER_REPORT_VIEW_KIND`

**Do not remove or rename** any existing export — avoids breaking `EncounterDiagnosticReportsList`.

---

## What stays the same (no regressions)

| Concern | Why safe |
|---------|----------|
| Runtime values | Still `'available'`, `'awaiting_approval'`, `'not_ready'`, `'lab'`, `'radiology'` |
| Unit tests | `toMatchObject({ availability: "available" })` still passes |
| UI badges/labels | Driven by `statusLabel` strings — unchanged |
| Type-only importers | None today for `EncounterReportAvailability` / `ViewKind` |
| `encounterReports.constants.ts` | Untouched |

---

## Validation checklist

```sh
cd projects/his-global-south

# 1. No stale string-only type left at top (manual)
# 2. Typecheck
npx tsc -b

# 3. Targeted tests
npm test -- src/clinical/constants/__tests__/encounterReportAvailability.test.ts

# 4. Grep — no broken imports
rg "encounterReportAvailability" src --glob '*.{ts,tsx}'
# All paths must remain @/clinical/constants/encounterReportAvailability

# 5. Optional full frontend test if time
npm test
```

Expected: **all tests pass**, **zero importer diffs**.

---

## Draft reply to reviewer

> Addressed — `EncounterReportAvailability` and `EncounterReportViewKind` are now derived from `ENCOUNTER_REPORT_AVAILABILITY` / `ENCOUNTER_REPORT_VIEW_KIND` const objects (same pattern as `labFulfillment.ts`). Classify helpers use the const keys; runtime values unchanged. Types and helpers remain co-located in `encounterReportAvailability.ts` with query keys in `encounterReports.constants.ts`.

---

## Risk assessment

| Risk | Mitigation |
|------|------------|
| Stale imports | Single-file change; export names unchanged |
| Test breakage | Runtime string values identical |
| Scope creep | Do not touch `approvalWorkflow.ts` or split files |

---

## Approval

- [x] Plan approved — implemented
- [ ] Skip — defend with existing pattern only
