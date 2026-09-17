# Slice 3: Facility Master Department Config UI

## Goal
Enable hospital administrators to configure Consultation, Triage, Follow-up services, and Grace Days directly in Facility Master with searchable dropdowns displaying `[CODE] — Name (Rate)`.

## Deliverables
1. `src/types/department.ts` & `src/services/departments.service.ts`
   - Typed models with service mappings.
2. `src/pages/facilityMaster/components/DepartmentFormDialog.tsx`
   - Searchable Dropdown for Doctor Consultation Service (`[CODE] — Service Name (Rate)`).
   - Searchable Dropdown for Triage / Intake Service.
   - Searchable Dropdown for Follow-up Service.
   - Number input for Follow-up Grace Days (default 7).
   - Toggle for "Is Follow-up Free during grace days".
