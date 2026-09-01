# LCF-1 implementation report — Lab catalog fulfilment (enrollment)

| Field | Value |
|-------|--------|
| **Slice** | LCF-1 |
| **Plan** | `prd/his-global-south/lab-catalog-fulfillment/slices/slice-1.md` |
| **Clone** | `projects/his-global-south/` |
| **Date** | 2026-08-31 |

## Summary

Persisted **in-house vs send-out** fulfilment on org lab enrollments (`items_master.lab_fulfillment_type`). Catalog Browser enrol/add flows now require fulfilment type; enrolled lab rows show a badge. Doctor picker and order validation deferred to LCF-2.

## Files changed (application clone)

### Backend
- `backend/src/db/migrations/019_lab_fulfillment_type_on_items_master.sql` — column, CHECK, backfill
- `backend/src/modules/platform/pgschema/items-master.pgschema.ts`
- `backend/src/modules/platform/platform.constants.ts` — `LAB_FULFILLMENT_TYPE`, error code
- `backend/src/modules/platform/platform.schema.ts` — item-master body/response schemas
- `backend/src/modules/platform/catalogs/labFulfillment.mapping.ts` — parse + AD-2 mapping helper
- `backend/src/modules/platform/catalogs/catalogs.service.ts` — create/update/get/list lab
- `backend/src/modules/platform/catalogs/catalogs.routes.ts` — wired schemas
- `backend/src/modules/platform/catalogs/__tests__/labFulfillment.mapping.test.ts`

### Frontend
- `src/clinical/constants/labFulfillment.ts`
- `src/services/catalogBrowser.service.ts` — `getItemMasterEnrolData` loads fulfilment
- `src/pages/catalogBrowser/types.ts` — `LabRow.labFulfillmentType`
- `src/pages/catalogBrowser/components/LabFulfillmentTypeField.tsx`
- `src/pages/catalogBrowser/components/LabFulfillmentBadge.tsx`
- `src/pages/catalogBrowser/components/EnrolSheetPanel.tsx`
- `src/pages/catalogBrowser/components/AddLabSheet.tsx`
- `src/pages/catalogBrowser/components/tabs/LabTestsTab.tsx`
- `src/pages/catalogBrowser/components/__tests__/EnrolSheetPanel.labFulfillment.test.tsx`
- `src/pages/catalogBrowser/components/__tests__/LabFulfillmentTypeField.test.tsx`

## Validation

| Command | Result |
|---------|--------|
| `backend/` `npm run build` | Pass |
| `npm run lint` | Pass |
| `npx tsc -b` | Pass |
| Backend vitest `labFulfillment.mapping.test.ts` | 6 passed |
| Frontend vitest catalog browser tests | 3 passed |

## Deploy note

Run migration **`019_lab_fulfillment_type_on_items_master.sql`** against Postgres before using enrol UI in an environment.

## Next slice

**LCF-2** — enrolled-only doctor picker, fix `catalogResolve` `refer_out`, order create 422 validation.

## Convention compliance

- Constants mirrored backend/frontend (`LAB_FULFILLMENT_TYPE` + `*_VALUES`)
- CHECK via `textInArrayCheck` from constants in pgschema
- Fastify response schemas on item-master GET/POST/PUT
- Title Case AJV messages for fulfilment enum
