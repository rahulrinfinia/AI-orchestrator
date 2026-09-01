# ET-1 — Encounter model extension + ed_nurse/ed_doctor roles + emergency inflow

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `emergency-triage` |
| **Slice** | ET-1 |
| **Branch** | `feat/emergency-triage` (already checked out, off `feat/platform-admin-hospitals`) |
| **Goal** | An emergency-type encounter, once created via the existing check-in path, carries `triage_status='pending'`, `current_step='triage'`, `arrived_at` set — with `ed_nurse`/`ed_doctor` existing as roles, ready for ET-2/ET-3 to gate against |
| **Depends on** | — |
| **PRD** | [prd.md](../../../prd/his-global-south/emergency-triage/prd.md) |
| **Technical design** | [technical-design.md](../../../prd/his-global-south/emergency-triage/technical-design.md) |
| **Slice spec** | [slice-1.md](../../../prd/his-global-south/emergency-triage/slices/slice-1.md) |
| **Status** | Planned — Approval empty |

---

## Approval

- [x] Product: matches PRD AC-1, AC-3 (partial — full OPD-exclusion proof needs ET-3's doctor gate), AC-5/AC-11 (role existence, not yet the access checks that use them)
- [x] Tech: matches technical-design.md §3 (role model), §5.1 (encounters columns), §5.4 (migration mechanics)
- [x] Scope: no creep into ET-2/ET-3/ET-4/ET-5/ET-6 territory

**Approved by:** Rahul Ranjan
**Date:** 2026-08-26

**Agent rule:** Do not implement until all boxes are checked and approver name is filled.

---

## Architecture constraints (from technical-design.md, immutable for this slice)

| ID | Constraint | This slice |
|----|------------|------------|
| TD-3 | `ed_nurse`/`ed_doctor` are additive `app_role` values; **do not** create `opd_nurse`/`opd_doctor` | Migration + `enums.ts` + `ROLE` constant only |
| TD-5.1 | New `encounters` columns as enums where a closed set exists (`triage_status`, `triage_priority`, `current_step`), matching the existing `encounter_type`/`status` convention on this table | pgschema + migration |
| TD-5.1 | `triaged_by` FK's `profiles.id`, **not** Better Auth `user.id` | Not written by this slice (no save path yet) — but the column type must be right so ET-3 doesn't inherit a wrong FK target |
| TD-5.4 | Every new/changed column needs `COMMENT ON` in the same migration file (`schema-comments.mdc`) | Non-negotiable |
| — | Migration file numbering: next available on this branch. **Confirm by listing `backend/src/db/migrations/` at implementation time** — do not hardcode a number in this plan; `007_patient_eccif_coverage.sql` was the last one as of this plan's writing, but this branch has multiple contributors | Phase A step 1 |

**Do not:** add `ed_nurse`/`ed_doctor` to `CLINICAL_ROLES`/`FRONTDESK_ROLES` in `middleware/require-roles.ts` yet — that's ET-2/ET-3's job, scoped to exactly what those slices gate (per slice-1.md's own "Out of scope"). This slice only makes the roles exist.

---

## Previous slices / current code (verified facts, not assumptions)

- `encounters.pgschema.ts` (`backend/src/modules/clinical/pgschema/encounters.pgschema.ts`) has **no** triage-related columns today — confirmed by reading the full 35-column definition. `encounter_type` pgEnum already includes `'emergency'` (`backend/src/db/schema/enums.ts`) — no enum change needed for that value, only new columns.
- **The real "front desk emergency inflow → encounter" wiring point is `createEncounter()`** in `backend/src/modules/clinical/encounters/encounters.service.ts` (line ~598), **not** `provisionServiceLineVisit.ts` (that helper is for a different flow — walk-in orders/Rx submission, per its own file comment "created on order/Rx submit"). `createEncounter()` already derives `encounter_type` from the checked-in visit's `visit_type` when it's a valid `ENCOUNTER_TYPES` value (line 655-657: `visitRow.visit_type` → `encounterType`, falls back to OPD otherwise) — since `VISIT_TYPE.EMERGENCY` already exists and matches `ENCOUNTER_TYPE.EMERGENCY`, an emergency-type visit already produces an emergency-type encounter today. This slice adds the triage-column initialization right after the existing `.insert(encounters)` call in that same function (~line 673-687).
- `app_role` enum (`backend/src/db/schema/enums.ts`): `provider_admin, biller, clinician, super_admin, doctor, nurse, receptionist, patient, admin, lab_tech, pharmacist, radiographer, phlebotomist, physician_assistant, nurse_practitioner, platform_admin`. No ED-specific values.
- `ROLE` (`backend/src/modules/platform/platform.constants.ts`) mirrors the enum 1:1 as a JS object — same file pattern as `ROLE.PLATFORM_ADMIN` was added in the platform-admin-hospitals feature (see that plan's Phase A for precedent).
- `role-priority.ts` (`backend/src/middleware/role-priority.ts`): `ROLE_PRIORITY` map used for `pickPrimaryRole()` (UI permission badge). Current tiers: `super_admin=0, platform_admin=1, provider_admin=2, biller=3, doctor=4, nurse_practitioner=5, physician_assistant=6, clinician=6, nurse=7, pharmacist=8, lab_tech=9, phlebotomist=10, radiographer=11, receptionist=12`.
- Migration transaction model (`backend/src/db/migrate.ts` line 39-60): **each migration file gets its own `BEGIN`/`COMMIT`**, not one big transaction across all files. This means `ALTER TYPE app_role ADD VALUE` and any statement in the *same file* that tries to *use* the new value in an INSERT/comparison would hit Postgres's "unsafe use of new value of enum type" error (new enum values aren't usable within the transaction that added them). **Not an issue for this slice** — it doesn't seed any `ed_nurse`/`ed_doctor` user rows — but do not combine the `ADD VALUE` statements with any seed INSERT using those role values in the same file if a future slice needs to.
- `pgschema.test.ts` (`backend/src/db/schema/__tests__/pgschema.test.ts`) already imports `encounters` and asserts its table name — the pattern to extend for new-column assertions is a straightforward `expect(encounters.triage_status.name).toBe('triage_status')`-style addition, matching the existing style used for `patients.identification_type`/`patients.identification_number` in the same file.

---

## Relevant files

### Modify

```text
backend/src/db/schema/enums.ts
backend/src/modules/clinical/pgschema/encounters.pgschema.ts
backend/src/modules/clinical/encounters/encounters.service.ts
backend/src/modules/platform/platform.constants.ts
backend/src/middleware/role-priority.ts
backend/src/db/schema/__tests__/pgschema.test.ts
```

### New

```text
backend/src/db/migrations/<NNN>_emergency_triage_encounter_columns.sql
  # Confirm next number by listing backend/src/db/migrations/ first — do not assume 008
```

### Reference only (do not rewrite)

```text
backend/src/modules/clinical/encounters/encounters.service.ts   # createEncounter() — only the insert block changes, don't touch listEncounters/getEncounter/etc.
backend/src/modules/frontdesk/frontdesk.constants.ts            # VISIT_TYPE.EMERGENCY — already exists, confirms this pathway
prd/his-global-south/platform-admin-hospitals/technical-design.md  # precedent for ALTER TYPE ADD VALUE + role-constant pattern (PAH-1)
```

---

## Phases

### Phase A — Migration (encounters columns + role enum)

1. List `backend/src/db/migrations/` and take the next number. Do not hardcode — confirm at implementation time.
2. SQL, in this order (enum types before columns that use them; `ADD VALUE` statements do not need to precede the column adds since they're independent enum types — but keep them grouped for readability):
   ```sql
   -- New enum types
   CREATE TYPE triage_status AS ENUM ('pending', 'complete');
   CREATE TYPE triage_priority AS ENUM ('P1', 'P2', 'P3', 'P4');
   CREATE TYPE encounter_step AS ENUM ('intake', 'triage', 'doctor');

   -- New app_role values
   ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'ed_nurse';
   ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'ed_doctor';

   -- New encounters columns
   ALTER TABLE public.encounters
     ADD COLUMN triage_status triage_status,
     ADD COLUMN triage_priority triage_priority,
     ADD COLUMN triage_disposition text,
     ADD COLUMN resuscitation_required boolean NOT NULL DEFAULT false,
     ADD COLUMN current_step encounter_step NOT NULL DEFAULT 'intake',
     ADD COLUMN triaged_at timestamptz,
     ADD COLUMN triaged_by uuid REFERENCES public.profiles(id),
     ADD COLUMN arrived_at timestamptz;

   COMMENT ON COLUMN public.encounters.triage_status IS
     'Emergency Triage completion state (pending/complete). NULL for non-emergency encounters — see emergency-triage feature.';
   COMMENT ON COLUMN public.encounters.triage_priority IS
     'ESI-style P1-P4 acuity from Emergency Triage BR-3 priority engine; NULL until triaged.';
   COMMENT ON COLUMN public.encounters.triage_disposition IS
     'Post-triage destination code (see emergency_triage app Appendix A disposition codes); set on triage save.';
   COMMENT ON COLUMN public.encounters.resuscitation_required IS
     'True when any Emergency Sign was YES at triage (BR-1) — drives P1 + doctor alert.';
   COMMENT ON COLUMN public.encounters.current_step IS
     'Encounter workflow position: intake (OPD default) / triage (emergency default) / doctor. Drives which step UI renders and the doctor-step gate (BR-4).';
   COMMENT ON COLUMN public.encounters.triaged_at IS
     'Timestamp Emergency Triage was saved. NULL until triage complete.';
   COMMENT ON COLUMN public.encounters.triaged_by IS
     'FK -> profiles(id) — the ed_nurse who saved triage. Use profiles.id, not Better Auth user.id (this codebase has hit this bug before on screening responses).';
   COMMENT ON COLUMN public.encounters.arrived_at IS
     'Set at emergency inflow (encounter creation for encounter_type=emergency) — drives ER list sort (longest-wait-first, PRD Emergency Triage §7.3). NULL for non-emergency encounters.';
   ```
3. Do **not** set `current_step` default differently per encounter type at the column level (Postgres column defaults can't branch on another column's value) — the emergency-specific `current_step='triage'` override happens in application code (Phase C), not the DDL default. The DDL default (`'intake'`) is correct for OPD and is overwritten immediately for emergency encounters at insert time.

### Phase B — Drizzle pgschema + constants

4. `backend/src/db/schema/enums.ts` — add `'ed_nurse'`, `'ed_doctor'` to the `app_role` pgEnum array. Add three new `pgEnum` exports: `triage_status`, `triage_priority`, `encounter_step`, matching the SQL type names exactly.
5. `encounters.pgschema.ts` — import the three new enums, add the eight new columns to the `pgTable` definition matching the migration exactly (column order doesn't matter functionally but match the migration for readability). Add the `triaged_by` → `profiles(id)` foreign key in the `(table) => [...]` array, mirroring the existing `attending_provider_id`/`provider_id`/`signed_by` FK patterns already in this file.
6. `platform.constants.ts` — add `ED_NURSE: 'ed_nurse'` and `ED_DOCTOR: 'ed_doctor'` to the `ROLE` object. **Do not** add them to `INVITE_ROLES`/`PERSONNEL_ROLES`/`PLATFORM_ADMIN_ROLES` unless a later slice explicitly needs them there — matches the PAH-1 precedent of being conservative about which role-list constants a new role joins.
7. `role-priority.ts` — add `[ROLE.ED_DOCTOR]: 4` (same tier as `ROLE.DOCTOR`) and `[ROLE.ED_NURSE]: 7` (same tier as `ROLE.NURSE`). Tying the priority number to the existing tier avoids reshuffling every other entry in the map — a dual-role user badges identically whether they're `doctor` or `ed_doctor`, which is fine since this map is purely for UI display precedence, not access control.

### Phase C — Wire emergency inflow into `createEncounter()`

8. In `encounters.service.ts`'s `createEncounter()`, right after `encounterType` is derived (~line 655-657) and before the `.insert(encounters)` call (~line 673), compute the triage-init fields:
   ```ts
   const isEmergency = encounterType === ENCOUNTER_TYPE.EMERGENCY;
   ```
9. Add to the `.values({...})` object passed to `.insert(encounters)`:
   ```ts
   current_step: isEmergency ? 'triage' : 'intake',
   triage_status: isEmergency ? sql`'pending'::triage_status` : null,
   arrived_at: isEmergency ? sql`now()` : null,
   ```
   (OPD stays exactly as today — `current_step` defaults to `'intake'` via DDL default anyway, but being explicit here makes the branch readable rather than relying on the column default silently doing the right thing.)
10. Do not touch anything else in `createEncounter()` — no other behavior for this function changes.

### Phase D — Tests

11. `pgschema.test.ts` — add assertions for the 8 new column names existing on `encounters`, matching the existing style for other recently-added columns in this file (e.g. the `patients.identification_type` pattern).
12. No integration/service test for the emergency-inflow branch is required by this slice's acceptance criteria beyond a live-DB verification (see Validation below) — a proper `createEncounter()` unit/integration test covering the emergency branch can be added here if the existing test suite already has fixtures for it; check `encounters.service.test.ts` (if it exists) before deciding whether to add one now or defer to ET-3 where the full flow becomes testable end-to-end.

---

## Testing strategy

| Layer | What |
|-------|------|
| Schema | `pgschema.test.ts` — 8 new columns exist with correct names |
| Migration | Applies cleanly via `db:migrate` on a fresh + an existing dev DB |
| Manual/live | Create an emergency-type visit → check-in → `createEncounter()` → confirm via `psql` that `triage_status='pending'`, `current_step='triage'`, `arrived_at` is set, `triage_priority`/`triage_disposition`/`triaged_at`/`triaged_by`/`resuscitation_required` are NULL/false as appropriate |
| Regression | Create an OPD-type visit → check-in → `createEncounter()` → confirm `current_step='intake'`, `triage_status` NULL, `arrived_at` NULL — existing OPD behavior completely unchanged |

This project's established bar (per CLAUDE.md and this session's own precedent): verify against the real running Docker stack with a real write, not just `tsc`/lint/unit tests.

---

## Validation commands

```powershell
cd projects/his-global-south/backend
npm run db:generate   # confirm generated SQL matches the hand-written migration's intent before finalizing the migration file
npx tsc --noEmit
npm run test -- src/db/schema/__tests__/pgschema.test.ts
```

```powershell
# Live verification against the dev stack (after docker compose db:migrate)
docker compose -f docker-compose.dev.yml exec api npm run db:migrate
# then a direct psql check of a freshly created emergency encounter's new columns
```

---

## Acceptance criteria

| # | Criterion | How to verify |
|---|-----------|----------------|
| 1 | `ed_nurse`, `ed_doctor` exist on `app_role` | `\d+ app_role` in psql, not just migration success |
| 2 | 8 new `encounters` columns exist with correct types/defaults | `pgschema.test.ts` + `\d+ encounters` |
| 3 | Every new column has `COMMENT ON` | Migration file review |
| 4 | Emergency-type encounter creation sets `triage_status='pending'`, `current_step='triage'`, `arrived_at` | Live write + `psql` read |
| 5 | OPD-type encounter creation is unaffected | Live write + `psql` read (regression) |
| 6 | `npx tsc --noEmit` clean on backend after pgschema edit | CI/local check |
| 7 | No other `createEncounter()` behavior changed | Code review — diff should be additive only |

---

## Out of scope

- Adding `ed_nurse`/`ed_doctor` to `CLINICAL_ROLES`/`FRONTDESK_ROLES` or any route guard (ET-2/ET-3)
- `emergency_triage_records` / `emergency_triage_alerts` tables (ET-3/ET-5)
- Any UI
- Seeding real users with the new roles (ops/testing task for whoever picks up ET-2)
- Deciding whether `arrived_at` should instead be set at visit check-in time rather than encounter-creation time — this plan sets it at encounter creation (simplest, matches where the other triage-init fields are set); revisit only if ET-2's "longest wait first" sort proves this timing wrong in practice
