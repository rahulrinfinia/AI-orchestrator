# Feature Report: Dynamic Department & Service Mapping

**Feature**: Dynamic Department & Service Mapping Architecture  
**Project**: `projects/his-global-south`  
**Date**: 2026-09-17  
**Status**: Completed & Verified  

---

## 1. Objectives Achieved

| Objective | Requirement | Status |
|-----------|-------------|--------|
| **Department Service Mapping** | Eliminate hardcoded consultation/triage service codes (`CONSULT-NEW`, `CONSULT-OPD`, `CONSULT-EMERGENCY`, `TRIAGE-ED`) and allow each department in Facility Master to configure default Consultation, Follow-up, and Triage services. | **Achieved** |
| **Grace Period Rules** | Support configurable follow-up grace window (`followup_grace_days`, default 14 days) and free follow-up toggle (`is_followup_free`). | **Achieved** |
| **Dynamic Billing & Invoicing** | Auto-calculate billing and payment collection dialog amounts directly from the database catalog prices based on department mapping, with doctor overrides taking priority when present. | **Achieved** |
| **Immutable Service Versioning** | Allow soft-deleted (`active = false`) services to be recreated with the same code without unique constraint collisions, maintaining data integrity for historical invoices. | **Achieved** |
| **Code Style Rule** | Ensure 100% of newly authored frontend and backend functions use arrow function syntax (`const fn = (...) => { ... }`). | **Achieved** |

---

## 2. Changes Summary

### Database & Migrations
- **`backend/src/db/migrations/041_department_service_mapping.sql`**: Added `default_consultation_service_id`, `default_followup_service_id`, `default_triage_service_id`, `followup_grace_days`, and `is_followup_free` to `departments` with foreign keys to `service_catalog(id)`. Backfilled existing departments.

### Backend Domain Layer
- **`backend/src/modules/platform/pgschema/departments.pgschema.ts`**: Updated drizzle schema with foreign key references and columns.
- **`backend/src/modules/platform/facility/facility.types.ts` & `facility.service.ts`**: Updated department listing, creation, and mutation methods to handle mapping fields.
- **`backend/src/modules/rcm/shared/resolveCatalogPrice.ts`**: Added `resolveCatalogPriceByServiceId` to resolve exact service UUID catalog pricing.
- **`backend/src/modules/rcm/shared/handlers.ts`**: Updated consultation and triage fee resolution in `resolveConsultationFee` and `VISIT_CHECKED_IN` to dynamically resolve prices from the department record.
- **`backend/src/modules/platform/catalogs/catalogs.service.ts`**: Handled soft-deleted services so re-inserting active services with identical codes succeeds seamlessly.

### Frontend Application Layer
- **`src/pages/facilityMaster/components/AddDepartmentDialog.tsx`**: Searchable service dropdowns displaying `[CODE] — Name`, grace days input, and free follow-up toggle.
- **`src/pages/facilityMaster/components/FacilityTree.tsx` & `index.tsx`**: Rendered service badges and added Department Edit flow.
- **`src/pages/patients/PatientRegister.tsx`**: Dynamically renders mapped department consultation & triage fees and names.
- **`src/pages/catalogBrowser/components/tabs/ServicesTab.tsx`**: Updated UI to handle active state filtering and service re-creation.

---

## 3. Automated Test & Verification Results

1. **Frontend Build (`npm run build`)**: **PASSED (0 errors)**
2. **Backend Test Suite (`npx vitest run`)**: **71 / 71 test suites passed (512 / 512 tests passed)**
3. **Dedicated Integration Unit Suite (`department-service-mapping.test.ts`)**: **6 / 6 tests passed**
   - Dynamic consultation service pricing from department configuration: **PASSED**
   - Free follow-up grace window calculation: **PASSED**
   - Paid follow-up past grace window calculation: **PASSED**
   - Doctor tariff override precedence: **PASSED**
   - Service price resolution by UUID and unpriced catalog fallback: **PASSED**
4. **Live Server Health**:
   - Backend (`http://localhost:3001/health`): `HTTP 200 OK` (all 10 domain modules active)
   - Frontend (`http://localhost:8080`): `HTTP 200 OK`
