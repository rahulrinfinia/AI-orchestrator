# Slice 2: Dynamic Billing & Event Handlers (Zero Hardcoding)

## Goal
Remove all hardcoded service code strings (`CONSULT-NEW`, `CONSULT-OPD`, `CONSULT-EMERGENCY`, `TRIAGE-ED`, `REG-FEE`) across billing handlers and resolve them dynamically from the configured department.

## Deliverables
1. `backend/src/modules/rcm/shared/handlers.ts`
   - Dynamically look up `department.default_consultation_service_id` and `department.default_triage_service_id`.
   - Implement free follow-up grace window logic (`followup_grace_days` and `is_followup_free`).
2. `backend/src/modules/rcm/billing/invoices/invoices.service.ts`
   - Update `resolveConsultationFee` and legacy bill fallback to query department configuration.
3. Automated unit/integration tests for dynamic fee resolution.
