# Slice 1: Database Migration & Backend Schema Layer

## Goal
Add foreign keys, indexes, and default columns to `departments` table in PostgreSQL, backfill seed data for existing 11 departments, and update backend Drizzle schema & service layer.

## Deliverables
1. `backend/src/db/migrations/035_department_service_mapping.sql`
   - `default_consultation_service_id` (uuid FK)
   - `default_followup_service_id` (uuid FK)
   - `default_triage_service_id` (uuid FK)
   - `followup_grace_days` (integer default 7)
   - `is_followup_free` (boolean default true)
   - Backfill standard OPD, Emergency, and Maternity canonical links.
2. `backend/src/modules/facility/departments/departments.pgschema.ts`
   - Add new columns to Drizzle `departments` table.
3. `backend/src/modules/facility/departments/departments.service.ts` & `routes.ts`
   - Include relations and DTO fields in department responses.
