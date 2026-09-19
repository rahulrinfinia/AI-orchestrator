# PR #58 — `FACILITY_AVAILABILITY` constants in catalog enrollment mappers

**Project:** `his-global-south`  
**Branch:** `feat/dra-radiology-inhouse-approval`  
**Reviewer:** @hemantinfinia — `"This should be constants."` on fulfillment → availability ternary in `radiologyCatalogEnrollment.ts`  
**Pattern:** Mirror backend `FACILITY_AVAILABILITY` + same approach as `ORDER_STATUS` / `APPROVAL_STATUS`

---

## Reviewer comment

```typescript
return fulfillmentType === RADIOLOGY_FULFILLMENT_TYPE.SEND_OUT
  ? 'refer_out'   // ← raw string
  : 'in_house';   // ← raw string
```

**Issue:** Input side uses `RADIOLOGY_FULFILLMENT_TYPE`; output side uses magic strings for `FacilityAvailability`.

**Not flagged but identical:** `labCatalogEnrollment.ts` has the same ternary with `LAB_FULFILLMENT_TYPE`.

---

## Backend reference (already correct)

```typescript
// backend clinical.constants.ts
export const FACILITY_AVAILABILITY = {
  IN_HOUSE: 'in_house',
  REFER_OUT: 'refer_out',
  NOT_OFFERED: 'not_offered',
} as const;

// backend radiologyFulfillment.mapping.ts
radiologyFulfillmentToFacilityAvailability(fulfillmentType) {
  if (fulfillmentType === RADIOLOGY_FULFILLMENT_TYPE.SEND_OUT) return FACILITY_AVAILABILITY.REFER_OUT;
  if (fulfillmentType === RADIOLOGY_FULFILLMENT_TYPE.IN_HOUSE) return FACILITY_AVAILABILITY.IN_HOUSE;
  return FACILITY_AVAILABILITY.NOT_OFFERED;
}
```

Frontend should mirror this — not re-invent literals in catalog enrollment files.

---

## Fix strategy — Option A (recommended, minimal)

Add `FACILITY_AVAILABILITY` to the **canonical type home** (`src/types/catalogEnrollment.ts`), use const keys in enrollment mappers and helpers in that same file.

**No new files.** No shared mapper extraction unless time allows (Option B below).

---

## Step-by-step implementation

### Step 1 — Add const + derive type in `src/types/catalogEnrollment.ts`

Replace string union + duplicate values array with const-first pattern:

```typescript
/** Mirror of backend FACILITY_AVAILABILITY — catalog enrollment overlay. */
export const FACILITY_AVAILABILITY = {
  IN_HOUSE: 'in_house',
  REFER_OUT: 'refer_out',
  NOT_OFFERED: 'not_offered',
} as const;

export const FACILITY_AVAILABILITY_VALUES = [
  FACILITY_AVAILABILITY.IN_HOUSE,
  FACILITY_AVAILABILITY.REFER_OUT,
  FACILITY_AVAILABILITY.NOT_OFFERED,
] as const;

export type FacilityAvailability = (typeof FACILITY_AVAILABILITY_VALUES)[number];
```

`isFacilityAvailability` — unchanged logic (still uses `FACILITY_AVAILABILITY_VALUES`).

### Step 2 — Replace literals in `facilityAvailabilityFromRow` + `enrollmentSortKey` (same file)

| Was | Becomes |
|-----|---------|
| `return 'not_offered'` | `FACILITY_AVAILABILITY.NOT_OFFERED` |
| `return 'refer_out'` | `FACILITY_AVAILABILITY.REFER_OUT` |
| `return 'in_house'` | `FACILITY_AVAILABILITY.IN_HOUSE` |
| `availability === 'in_house'` | `FACILITY_AVAILABILITY.IN_HOUSE` |
| `availability === 'refer_out'` | `FACILITY_AVAILABILITY.REFER_OUT` |

Keeps one source of truth where the type lives.

### Step 3 — Fix `radiologyCatalogEnrollment.ts`

Import `FACILITY_AVAILABILITY` from `@/types/catalogEnrollment`:

```typescript
return fulfillmentType === RADIOLOGY_FULFILLMENT_TYPE.SEND_OUT
  ? FACILITY_AVAILABILITY.REFER_OUT
  : FACILITY_AVAILABILITY.IN_HOUSE;
```

### Step 4 — Fix `labCatalogEnrollment.ts` (same pattern)

```typescript
return row.labFulfillmentType === LAB_FULFILLMENT_TYPE.SEND_OUT
  ? FACILITY_AVAILABILITY.REFER_OUT
  : FACILITY_AVAILABILITY.IN_HOUSE;
```

### Step 5 — Optional small consistency (same PR, low risk)

| File | Change |
|------|--------|
| `radiologyFulfillment.ts` | `row.facilityAvailability === FACILITY_AVAILABILITY.REFER_OUT` |
| `labFulfillment.ts` | same |
| `VisitPlanSectionsFull.tsx` | `'not_offered'` fallback → `FACILITY_AVAILABILITY.NOT_OFFERED` |

**Skip:** `FacilityAvailabilityBadge.tsx` object keys — Record keys can stay as literal keys (they match const values); changing is cosmetic.

**Do not change:** `RADIOLOGY_FULFILLMENT_TYPE.IN_HOUSE: 'in_house'` — that's fulfillment type, not facility availability (different domain).

---

## Option B — shared mapper (optional enhancement)

Add frontend mirrors of backend mapping functions:

```typescript
// radiologyFulfillment.ts
export function radiologyFulfillmentToFacilityAvailability(
  fulfillmentType: RadiologyFulfillmentType,
): FacilityAvailability { ... }

// labFulfillment.ts
export function labFulfillmentToFacilityAvailability(...) { ... }
```

Then catalog enrollment files become thin wrappers:

```typescript
if (isRadiologyFulfillmentType(fulfillmentType)) {
  return radiologyFulfillmentToFacilityAvailability(fulfillmentType);
}
```

**Pros:** Matches backend 1:1, no duplicated ternary.  
**Cons:** Slightly more diff; only worth it if we want structural parity with backend.

**Recommendation:** Option A for this PR comment; Option B only if reviewer asks for mapper extraction.

---

## Importers — no path changes

| File | Imports today | After |
|------|---------------|-------|
| `RadiologyOrderForm.tsx` | `facilityAvailabilityFromRadiologyCatalogRow` | **Same** |
| `VisitPlanSectionsFull.tsx` | both enrollment mappers + `enrollmentSortKey` | **Same** (optional const in sort fallback) |
| `labCatalogEnrollment.ts` | `@/types/catalogEnrollment` | **Same** + `FACILITY_AVAILABILITY` |

Export names unchanged → **zero breaking changes**.

---

## Tests

No dedicated test file for `radiologyCatalogEnrollment.ts` today.

| Test file | Action |
|-----------|--------|
| `EnrolSheetPanel.labFulfillment.test.tsx` | **No change required** — uses `'in_house'` as lab fulfillment type, not facility availability |
| `LabOrderForm.test.tsx` | **No change** — `facilityAvailability: "refer_out"` still valid at runtime |

**Optional add:** small unit test file `catalogEnrollment.test.ts` for `facilityAvailabilityFromRow` + enrollment mappers (not required for reviewer fix).

---

## Validation checklist

```sh
cd projects/his-global-south

npx tsc -b

npm test -- src/pages/catalogBrowser/components/__tests__/EnrolSheetPanel.labFulfillment.test.tsx
npm test -- src/components/orders/__tests__/LabOrderForm.test.tsx

rg "'refer_out'|'in_house'" src/clinical/constants/radiologyCatalogEnrollment.ts src/clinical/constants/labCatalogEnrollment.ts
# Expected: no raw literals in ternary (only FACILITY_AVAILABILITY.*)

rg "FACILITY_AVAILABILITY" src --glob '*.{ts,tsx}'
# Expected: catalogEnrollment.ts + enrollment mappers + optional fulfillment files
```

---

## Draft reply to reviewer

> Addressed — fulfillment → facility availability mapping now uses `FACILITY_AVAILABILITY` constants (mirror of backend) instead of raw `'refer_out'` / `'in_house'` strings. Applied to radiology and lab catalog enrollment mappers; type/values defined in `catalogEnrollment.ts`.

---

## Risk assessment

| Risk | Mitigation |
|------|------------|
| Runtime value change | None — same strings `'in_house'`, `'refer_out'` |
| Type breakage | Derive `FacilityAvailability` from const values array |
| Scope creep | Skip badge component + full-repo literal sweep |
| Lab file not in comment | Fix anyway — identical pattern, one-line each |

---

## Approval

- [x] Plan approved — implemented (full scope, no facility-availability leftovers)
- [ ] Skip — reply with rationale only
