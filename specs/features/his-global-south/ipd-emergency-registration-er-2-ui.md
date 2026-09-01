# ER-2 — Emergency registration UI and provisional visibility

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `ipd-emergency-registration` |
| **Slice** | ER-2 |
| **Branch** | `feat/ipd-emergency-registration` (**same as ER-1** — continue on existing branch; no new branch) |
| **Clone path** | `projects/his-global-south/` |
| **Goal** | Emergency entry flow on `/patients/register`, Tier A form, EMERGENCY badges |
| **Depends on** | [ER-1](./ipd-emergency-registration-er-1-api-db.md) merged or available locally |
| **PRD** | [prd.md](../../../prd/his-global-south/ipd-emergency-registration/prd.md) |
| **Technical design** | [technical-design.md](../../../prd/his-global-south/ipd-emergency-registration/technical-design.md) |
| **Status** | Implemented (uncommitted in clone) |

---

## Approval

- [ ] Product: acceptance criteria match PRD / Figma intent
- [ ] Tech: architecture decisions (AD-N) respected; ER-1 API contract unchanged
- [ ] Scope: no creep beyond this slice file (no ER-3 completion API/UI)

**Approved by:** _name_  
**Date:** _YYYY-MM-DD_

_Implement must not start until all boxes are checked and approver is named._

---

## Context (read before coding)

- [his-global-south-patterns.md](../../../docs/conventions/his-global-south-patterns.md) — OPD/frontdesk patterns (this slice is **not** IPD routes)
- ER-1 must expose `POST /api/frontdesk/patients/emergency` and list/detail fields `registration_mode`, `dob_estimated`
- **No IPD module changes** — handoff to IPD is a later slice

---

## Architecture constraints (immutable from technical design)

| ID | Constraint | This slice |
|----|------------|------------|
| TD-§2 | Patient domain only — no IPD tables/routes | UI + `patients.service` only |
| TD-§4.1 | Emergency create via `POST /api/frontdesk/patients/emergency` | New service function + clinical barrel export |
| TD-§4.3 | List/detail include `registration_mode`, `dob_estimated` | Extend `Patient` type; badge logic |
| TD-§6.1 | Two buttons before existing wizard | Entry state machine in `PatientRegister.tsx` |
| TD-§6.2 | Tier A form; defaults Unknown / unknown | Emergency form component |
| TD-§6.3 | `emergency && !is_registered` → EMERGENCY + INCOMPLETE badges | List + detail |
| TD-§7 | No note/PHI in localStorage or console logs | No persistence of `registration_note` client-side |
| PRD | Success → navigate to `/patients` (create-only) | Not patient chart on emergency create |

---

## Previous slices context (code today)

| Item | Location | State |
|------|----------|--------|
| Full registration wizard | `src/pages/patients/PatientRegister.tsx` | 3-step react-hook-form; submits `registerPatient` → `POST /api/frontdesk/patients` |
| Patient list INCOMPLETE badge | `PatientList.tsx` L215 | `!patient.isRegistered` |
| Patient detail incomplete | `PatientDetail.tsx` L357–369 | `!isActive` → “Incomplete Registration” + Complete button |
| Clinical barrel | `src/modules/clinical/index.ts` | Exports `registerPatient`, not emergency yet |
| Query keys | `src/lib/queryKeys.ts` | `queryKeys.patients.all` = `['frontdesk','patients']` |
| ER-1 backend | `backend/.../frontdesk/patients/` | **Required before ER-2 implement** — not in clone at plan time |

**Reuse:** existing `Button` (`destructive` variant), `Card`, `Input`, `Select`, `Badge`, `toast`, `useAuth`, date helpers from `@/utils/dateValidation`.

**Do not duplicate:** full wizard schema/steps — wrap behind `registrationView === 'full'` unchanged.

---

## Relevant files

| Action | Path |
|--------|------|
| **Modify** | `src/pages/patients/PatientRegister.tsx` |
| **Modify** | `src/pages/patients/PatientList.tsx` |
| **Modify** | `src/pages/patients/PatientDetail.tsx` |
| **Modify** | `src/services/patients.service.ts` |
| **Modify** | `src/modules/clinical/index.ts` |
| **New** | `src/pages/patients/components/EmergencyRegistrationForm.tsx` |
| **New** | `src/pages/patients/components/RegistrationEntryChoice.tsx` |
| **New** | `src/pages/patients/emergency-registration.constants.ts` |
| **New** | `src/pages/patients/__tests__/PatientRegister.emergency.test.tsx` |
| **New** | `src/pages/patients/__tests__/PatientList.emergency-badge.test.tsx` |
| **Modify** | `src/services/__tests__/patients.service.test.ts` |
| **Reference** | `src/pages/encounters/__tests__/EncounterReadOnly.test.tsx` — test harness pattern |
| **Reference** | ER-1 `patients.service.ts` emergency handler — API contract |

**Forbidden:** `backend/src/modules/ipd/**`, `src/pages/ipd/**`, visit/admission flows, ER-3 completion route.

---

## Phases

### Phase 0 — Prerequisite gate

- [ ] Work on branch `feat/ipd-emergency-registration` (create from `develop` when starting ER-1; **stay on it for ER-2**)
- [ ] ER-1 API committed on that branch (`POST /api/frontdesk/patients/emergency`)
- [ ] Manual smoke: emergency create returns `201` with `registration_mode: 'emergency'`

### Phase 1 — Service layer & types

1. Extend `Patient` in `patients.service.ts`:
   - `registrationMode?: 'full' | 'emergency'`
   - `dobEstimated?: boolean`
2. Add types:

```typescript
export interface EmergencyRegisterPayload {
  first_name?: string;
  last_name?: string;
  date_of_birth: string;      // ISO date — wire snake_case
  dob_estimated?: boolean;
  gender?: string;
  phone?: string;
  registration_note?: string;
}
```

3. Add `registerEmergencyPatient(payload)` → `POST /api/frontdesk/patients/emergency`
4. Export from `src/modules/clinical/index.ts` (payload type + function)
5. Add unit test in `patients.service.test.ts` for URL and body shape

### Phase 2 — Entry choice + emergency form UI

1. Add `emergency-registration.constants.ts`:
   - `EMERGENCY_DEFAULT_FIRST_NAME = 'Unknown'`
   - `EMERGENCY_DEFAULT_LAST_NAME = 'Unknown'`
   - `EMERGENCY_DEFAULT_GENDER = 'unknown'`
2. **`RegistrationEntryChoice.tsx`**
   - Primary button: “Register patient” → sets view `full` (existing wizard)
   - Destructive button: “Emergency register” → sets view `emergency`
   - Same spacing/size as existing page buttons (`Button` default + `variant="destructive"`)
3. **`EmergencyRegistrationForm.tsx`**
   - Fields: first name, last name, estimated age **or** DOB (one required), gender, phone (optional), registration note (optional)
   - Defaults pre-filled and editable
   - Age mode: convert age → estimated ISO DOB (`dob_estimated: true`); exact DOB picker → `dob_estimated: false`
   - Cancel → `onCancel` back to entry choice
   - Submit → calls `registerEmergencyPatient` via prop/callback
   - **Do not** write note to `localStorage` / `sessionStorage`
4. **`PatientRegister.tsx`** — add view state:

```typescript
type RegistrationView = 'choose' | 'full' | 'emergency';
const [registrationView, setRegistrationView] = useState<RegistrationView>('choose');
```

Render rules:

| `registrationView` | UI |
|--------------------|-----|
| `choose` | Header + `RegistrationEntryChoice`; **no** Progress bar; **no** wizard steps |
| `full` | Existing wizard unchanged (Progress + steps 1–3); optional “Back” to `choose` |
| `emergency` | `EmergencyRegistrationForm`; **no** wizard Progress |

Emergency success handler:

```typescript
await registerEmergencyPatient(payload);
toast.success('Emergency patient created');
await queryClient.invalidateQueries({ queryKey: queryKeys.patients.all });
navigate('/patients');
```

Keep full-registration success: `navigate(`/patients/${result.id}`)` unchanged.

Fix existing invalidate to use `queryKeys.patients.all` (currently `['patients']` — inconsistent).

### Phase 3 — Badges (list + chart)

1. Add helper (in `emergency-registration.constants.ts` or `patients.service.ts`):

```typescript
export function isProvisionalEmergency(p: Pick<Patient, 'registrationMode' | 'isRegistered'>): boolean {
  return p.registrationMode === 'emergency' && p.isRegistered === false;
}
```

2. **`PatientList.tsx`** — when `isProvisionalEmergency(patient)`:
   - Render `Badge variant="destructive"` text `EMERGENCY` (red/white via destructive)
   - Keep existing INCOMPLETE badge when `!patient.isRegistered`
3. **`PatientDetail.tsx`** — same rule in header badge row next to existing incomplete/deceased badges
4. Optional: show “Est. DOB” hint when `dobEstimated === true` (small muted text — no new column required)

**ER-3 note:** “Complete registration” button behavior stays as today; ER-3 adds prefill + completion API — do not implement completion submit here.

### Phase 4 — Tests

| Test file | Cases |
|-----------|--------|
| `PatientRegister.emergency.test.tsx` | Entry choice renders both buttons; emergency button has destructive class; emergency form defaults; submit payload snake_case; success navigates to `/patients`; cancel returns to choice; full path still shows 3 steps |
| `PatientList.emergency-badge.test.tsx` | EMERGENCY badge only when `registrationMode=emergency` && `isRegistered=false`; not shown for full patients |
| `patients.service.test.ts` | `registerEmergencyPatient` POST path and fields |

Mock `@/modules/clinical` or `api` like `EncounterReadOnly.test.tsx`. Wrap with `QueryClientProvider` + `MemoryRouter`.

---

## Step-by-step task list (implement order)

1. Confirm ER-1 API on target branch
2. `patients.service.ts` — types + `registerEmergencyPatient`
3. `clinical/index.ts` — export
4. `patients.service.test.ts` — service unit test
5. `emergency-registration.constants.ts`
6. `RegistrationEntryChoice.tsx`
7. `EmergencyRegistrationForm.tsx`
8. `PatientRegister.tsx` — wire views + success paths
9. `PatientList.tsx` — EMERGENCY badge
10. `PatientDetail.tsx` — EMERGENCY badge
11. Frontend tests (Phase 4)
12. Manual QA checklist (below)
13. **Stop** — report files changed; wait for user before commit/push/PR (same branch as ER-1)

---

## Testing strategy

| Layer | What |
|-------|------|
| Unit | Service POST shape; badge helper |
| Component | Entry choice, form validation, destructive styling, navigation |
| Regression | Full wizard step flow unchanged (existing step 1 validation, step 3 insurer rules) |
| Integration | Manual against ER-1 API (no new backend tests in ER-2) |

---

## Validation commands

Run from `projects/his-global-south/`:

```powershell
npm run lint:frontend
npm test -- src/pages/patients/__tests__/PatientRegister.emergency.test.tsx src/pages/patients/__tests__/PatientList.emergency-badge.test.tsx src/services/__tests__/patients.service.test.ts
npm run build
```

Optional full frontend suite: `npm test`

---

## Acceptance criteria

| # | Criterion | Validation |
|---|-----------|------------|
| AC-1 | Both entry buttons render before the wizard on `/patients/register` | Component test + manual |
| AC-2 | Full registration wizard behavior unchanged | Regression test / manual 3-step flow |
| AC-3 | Emergency form submits Tier A fields; receives patient id | Service + component test; network tab |
| AC-4 | Defaults Unknown / unknown visible and editable | Component test |
| AC-5 | Emergency button uses `Button variant="destructive"` (red/white) | Component test class/variant |
| AC-6 | List + chart show EMERGENCY badge only for provisional emergency | Component test + manual |
| AC-7 | INCOMPLETE badge still shows for `!isRegistered` | Manual emergency create |
| AC-8 | After emergency create, patient list refreshes (`queryKeys.patients.all`) | Network / React Query devtools |
| AC-9 | Success navigates to `/patients` (not chart) | Component test |
| AC-10 | No registration note in localStorage/sessionStorage | Code review + manual DevTools Application tab |

---

## Manual QA (after ER-1 + ER-2)

1. Open `/patients/register` → see two buttons
2. “Register patient” → existing wizard works end-to-end
3. “Emergency register” → submit minimal Tier A → land on `/patients`
4. New row shows EMERGENCY + INCOMPLETE badges
5. Open chart → same badges in header
6. Full-registered patient → no EMERGENCY badge

---

## Out of scope (ER-3 / later)

- `POST /api/frontdesk/patients/:id/complete-registration`
- Wizard prefill via `?id=` on register route
- IPD admission handoff
- Backend migrations or frontdesk service changes

---

## Status tracking

After merge: update [status.yaml](../../../prd/his-global-south/ipd/slices/status.yaml) → `ipd-emergency-registration-er-2-ui` = `merged`.
