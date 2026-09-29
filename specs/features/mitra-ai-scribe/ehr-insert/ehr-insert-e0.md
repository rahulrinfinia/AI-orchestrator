# E0 — Patient context, diagnoses, ICD-10-CM validation

## Purpose

**Foundation for EHR insert** (`docs/ehr-insert-solution.md` §13): build and test **E0a → E0b → E0c** in order. Auto **insert** abhi nahi (E1+). Manual copy/approve flow unchanged.

**Mock EHR:** `mock-ehr/` sirf local HTML host (`npx serve mock-ehr -l 5180`). **Koi bundled adapter profile nahi** — patient read **Method B** (auto-detect labels) se, bilkul real hospital tab jaisa.

---

## Non-regression (mandatory — har E0 sub-phase)

Existing Mitra flows **break nahi hone chahiye**. Treat as release criteria alongside A/B/C gates.

| Area | Must keep working |
|------|-------------------|
| **Auth / login** | Sign-in, sign-out, session token unchanged |
| **Record → upload → pipeline** | Consent, audio upload, status poll, retry/cancel |
| **Review** | SOAP sections, key points, edit draft, debounced save |
| **Approve + copy** | Footer two-state, copy section / full note, clipboard, `copied` audit |
| **API backward compat** | `POST /v1/sessions` **without** `patientContext` still valid; new fields **optional** on wire |
| **Optional patient** | Manual entry / permission Deny — recording hard-depend na kare EHR tab par |

**Implement rules:**

- Additive migrations only; nullable columns; default `[]` / `null` for new JSON fields.
- No breaking changes to existing response shapes except **adding** optional properties.
- Full backend tests + extension typecheck/build each PR.
- Manifest: optional hosts only (`https://*/*`, `http://localhost/*`); **no required EHR hosts at install**.

---

## User stories

1. **E0a:** Recording se pehle **Method B** se active EHR tab par patient scan + doctor **confirm** (ya manual entry); **permission** doctor ke button click par current-tab origin ke liye; mock **5180** = real URL — **same code path**.
2. **E0b:** Pipeline ke baad Assessment par diagnoses table; edit; approve ke baad edit → **in review** + dubara approve for copy.
3. **E0c:** ICD validate; display **J20.9**; billable vs category warning; invalid drop + official description.

---

## Architecture constraints

| Design doc | This slice |
|------------|------------|
| §3 patient context PHI | DB jsonb + audit; **no** identifier/name/DOB in logs |
| §3 matching | **`shared/patient-match/`** — backend + extension |
| §6 permissions | `permissions.request` on **user gesture**; `extension/src/browser/` only |
| § Method B | Label heuristics + manual fallback — **no matchUrls / shipped JSON profiles** |
| Manual copy always | No insert UI in E0 |
| Diagnoses + approve | Edit after approve → in review + re-approve before copy |

---

## Scope

### In scope (E0)

- **E0a:** **`mock-ehr/`** pages for manual test; **Method B** auto-detect; dynamic **optional_host_permissions** on read/load click; session `patientContext`; shared patient-match; audit.
- **E0b:** Diagnoses persist + PATCH + UI + re-approval rules.
- **E0c:** `icd_codes`, CMS import, org FY version, validation + UI.

### Out of scope (later slices — see solution doc §13)

- **E1:** Method **A** insert at cursor (fill engine, re-verify prompt, undo)
- **E2:** Method **C** teach mode + org taught-profile API + **roles (`doctor`, `admin`)** — teach **admin-only**
- **E3:** Taught-profile full auto-fill + multi-tab checklist
- **E4:** ICD insert modes + replace/append
- **E5:** Method **D** FHIR / SMART
- Full `extractedEntities` beyond diagnoses

---

# Phase E0a — Patient context (Method B)

## Design

### Mock EHR (test host only)

| Asset | Path |
|-------|------|
| Patient demo page | **`mock-ehr/patient-context.html`** — visible MRN, name, DOB (labels doctor-readable) |
| SOAP demo pages | **`mock-ehr/soap-chart*.html`** — insert testing **E1+**; E0a sirf patient read test kar sakta hai |
| Dev doc | **`extension/docs/mock-ehr.md`** |

```bash
# From projects/mitra-ai-scribe/
npx serve mock-ehr -l 5180
```

Normal HTTP page chahiye — `chrome-extension://` scrape nahi hota.

**Important:** Mock par test = **Method B scan**, na ki koi `mock-patient-v1.json` jaise bundled profile.

### Patient read flow (Method B + permission)

1. Doctor EHR (ya mock) tab **active** rakhe — ya panel se load action (**user gesture**).
2. Extension active tab **origin** read kare → agar access nahi → **`permissions.request`** usi origin ke liye (click handler ke andar).
3. **Deny** → manual entry form; recording block mat karo.
4. **Allow** → **Method B:** page par common labels scan (MRN, UHID, ABHA, Patient ID, File No., Reg. No., Name, DOB — English + common Arabic labels).
5. Kuch na mile → manual entry.
6. Doctor **Confirm** (scan ya manual) → normalize via **shared/patient-match** → `POST /v1/sessions` with `patientContext`.
7. **`localhost:5180`** aur **`https://hospital…`** — **same logic**; sirf origin alag.

**DOB bina adapter profile:** Org setting **`dateFormat`** (default **`DD/MM/YYYY`** UAE). Extension + API parse isi se karein. Agar parsed date **ambiguous** ho (day ≤ 12 **aur** month ≤ 12, clear nahi) → UI **extra DOB confirm step** save se pehle; ambiguous par auto-save mat karo.

Insert / content-script messaging **E1** se (Method A).

### Manifest

| Field | Value |
|-------|--------|
| `optional_host_permissions` | **`https://*/*`**, **`http://localhost/*`** |
| **Not at install** | No required `host_permissions` for EHR |

CI: shipped manifest mein required EHR/localhost hosts **nahi**.

### Cross-browser

Chromium / Firefox: browser layer + gesture rule. Safari: TBD; fail → manual entry.

### Shared patient matching

Same as solution doc §3 — `normalizeIdentifier`, `normalizeDob`, `normalizeName`, `matchPatient` → `match` | `name_warning` | `block`.

Tests in `shared/patient-match/` (00458921 = 458921, name order, decision table).

### API — patient context

**Migration `0006_session_patient_context.sql`** — `scribe_sessions.patient_context jsonb`.

Org **`dateFormat`** (E0a): column on `organizations` (e.g. `date_format text NOT NULL DEFAULT 'DD/MM/YYYY'`) — exposed on `/v1/me` for extension parse + ambiguous DOB UI.

Wire shape: `identifier`, `identifierLabel`, `displayName`, `dateOfBirth` (ISO), `confirmedAt`, `source: 'ehr_scrape' | 'manual'`.

Audit: `patient_context_created` — **no PHI values**.

### Extension (E0a — target shape post rev-2 doc)

| Action | Path / note |
|--------|-------------|
| New / replace | **`extension/src/ehr/detect-patient-context.ts`** (or equivalent) — Method B heuristics, no bundled JSON profiles |
| Keep | `shared/patient-match/`, `browser/permissions.ts`, `browser/scripting.ts`, `browser/tabs.ts` |
| UI | `PatientContextConfirm.tsx`, `StartRecordingPanel` / `RecordingShell` — load on gesture + optional auto-retry UX |
| Remove (future PR) | `extension/src/ehr/adapters/*`, `adapter-registry.ts`, `insert-adapters.ts`, matchUrls lookup — see deprecation report |

**Legacy code note:** Repo mein abhi purane adapter files ho sakte hain; E0 plan ab unhe **source of truth nahi** maanta.

### E0a tasks (ordered)

1. `shared/patient-match/` + tests.
2. Migration + schema + create session + audit.
3. Method B detect module + integrate read flow (replace adapter scrape path).
4. Manifest optional hosts; CI guard on required hosts.
5. UI confirm / manual; mock-ehr pages + `extension/docs/mock-ehr.md`.

### E0a acceptance (gate E0b)

| # | Criterion | Validation |
|---|-----------|------------|
| A1 | Mock tab (5180) par scan → MRN label, name, DOB confirm UI | Manual |
| A2 | After confirm, GET session normalized context | Integration test |
| A3 | Audit exists; logs mein PHI nahi | Grep / test |
| A4 | Scan fail → manual `source: manual` | Manual |
| A5 | Naye origin par pehli read par prompt **once**; Deny → manual | Manual |
| A6 | Manifest: no required EHR hosts | CI |
| A7 | **No dependency** on bundled `adapters/*.json` for patient read | Code review / grep |
| A8 | Ambiguous DOB (e.g. `03-04-1988` with DD/MM org format) forces **confirm before save** | Manual / unit |

---

# Phase E0b — Diagnoses persist + UI

## Design

**Migration `0007_session_diagnoses.sql`**

- `scribe_sessions.diagnoses jsonb` — array of:

```ts
type SessionDiagnosis = {
  condition: string;
  icd10Code?: string;           // stored without dot after E0c validation (E0b may accept dotted from AI until pipeline normalizes)
  certainty: 'confirmed' | 'suspected' | 'differential';
  notes?: string;
};
```

**Pipeline**

- Extend `pipeline.types.ts` — `ExtractedDiagnosis`, `SoapDraftOutput.extractedEntities` with **diagnoses only** (minimal).
- Extend `scribe.service.ts` `parseSoapResponse` — parse `extractedEntities.diagnoses` (port sanitize from FlowMD, diagnoses only).
- `pipeline.service.ts` — after drafts insert, `update scribe_sessions set diagnoses = ...` from parsed entities (may be empty array).

**API**

- `GET /v1/sessions/:id` — include `diagnoses` array (default `[]`).
- **`PATCH /v1/sessions/:id/diagnoses`** — body `{ diagnoses: SessionDiagnosis[] }`; auth org-scoped.

**Approval consistency (same as draft edits):**

- Diagnoses **editable after approve** (not read-only).
- Any **PATCH diagnoses** (or material diagnosis change) on an **approved** session:
  - Set session status back to **`ready`** (in review — same as editing an approved draft section).
  - Clear `approvedBy` / `approvedAt` (or equivalent “needs re-approval” flag used by drafts today).
  - **Copy full note / footer copy disabled** until doctor **approves again**.
- Align with existing draft PUT behavior in `drafts.service` / approve flow — **one rule for chart + diagnoses**.

**Extension**

| Action | Path |
|--------|------|
| New | `extension/src/features/drafts/components/review/DraftAssessmentDiagnoses.tsx` |
| New | `extension/src/features/drafts/api/diagnoses-api.ts` or extend sessions-api |
| Modify | `DraftReviewPanel.tsx` — render under assessment card |
| Modify | `sessions-api.ts` — types, normalize, patch helper |
| Modify | `useDraftReviewPanel.ts` — **`isApproved` drives copy/footer only**; diagnoses table stays editable; handle session status flip after PATCH |

Debounced PATCH (reuse pattern from `useDebouncedDraftSave`).

### E0b tasks (ordered)

1. Migration + schema.
2. Parse + pipeline persist diagnoses.
3. PATCH route + **re-approval** logic + integration tests (edit after approve → status `ready`, approve cleared).
4. Extension table UI + PATCH wiring + UI state when session returns to in review.
5. Copy section optionally append diagnosis lines (nice-to-have in E0b or E0c).

### E0b acceptance (gate E0c)

| # | Criterion | Validation |
|---|-----------|------------|
| B1 | After pipeline ready, panel shows ≥1 condition when AI returned diagnoses | Manual / fixture transcript |
| B2 | Edit row → PATCH → GET reflects change | Integration test |
| B3 | Edit after approve → session back to **in review**; **copy disabled** until re-approved | Integration + manual |

---

# Phase E0c — ICD-10-CM catalog + validation

## Design

**Migration `0008_icd10cm.sql`**

```sql
CREATE TABLE icd_codes (
  version text NOT NULL,
  code text NOT NULL,
  description text NOT NULL,
  is_billable boolean NOT NULL,
  PRIMARY KEY (version, code)
);
CREATE INDEX icd_codes_version_code_idx ON icd_codes (version, code);
```

- **`code`** stored **without dot**, as in CMS files (e.g. `J209` not `J20.9`).

**Code format helpers** (`icd.service` or `shared/icd-format.ts`):

| Function | Behavior |
|----------|----------|
| `stripIcdDot(displayOrAi: string)` | `J20.9` → `J209` before lookup |
| `formatIcdForDisplay(stored: string)` | Re-insert dot after 3rd character: `J209` → `J20.9` |

**Unit tests:** both directions + edge cases (3-char codes if any).

**Migration `0009_org_icd_settings.sql`**

- `organizations.icd_system text NOT NULL DEFAULT 'ICD-10-CM'`
- `organizations.icd_version text NOT NULL` — default from env **`ICD_DEFAULT_VERSION=FY2024`** at seed/migrate time (**never hardcode** in app logic)

**Import script**

- `backend/scripts/import-icd10cm.ts` — read official **CMS ICD-10-CM** + **order file** (billable flag); upsert `icd_codes(version, code, description, is_billable)`.
- Version key = **CMS fiscal year** label (e.g. `FY2024`).
- Document in `backend/scripts/README.md` — download URL, run command, **never delete old versions**.

**Validation service**

- `backend/src/modules/icd/icd.service.ts` — `validateCode(version, codeWithoutDot) → { valid, description, isBillable } | invalid`
- `normalizeDiagnosesForSession(diagnoses, orgVersion)` — strip dot from AI codes; invalid → drop code, keep `condition`; valid → store **without dot** on session row; attach display format on read

**Billable vs category (non-billable):**

| `is_billable` | UI |
|---------------|-----|
| `true` | Normal description + display code |
| `false` | Keep code; warning chip **“Category code — choose a specific code”** |

**Pipeline hook:** after parse, run `normalizeDiagnosesForSession` before DB write.

**GET session:** enrich each diagnosis with `icd10Display` (dotted), `description`, `isBillable`, `categoryWarning` when applicable — computed from `icd_codes` + stored code.

**Prompt:** pass org `icdVersion` (e.g. `FY2024`) into `buildSoapPrompt` — from org row or `ICD_DEFAULT_VERSION` fallback for dev only.

**Optional (E0c stretch):** `GET /v1/icd10/search?q=&limit=` — org version scoped; defer if timeboxed.

### Extension

- Diagnoses table: **Display code** (dotted), **Description**, billable vs **category warning chip**; invalid code dropped server-side → existing invalid messaging.

### E0c tasks (ordered)

1. Migrations org + `icd_codes` (with `is_billable`).
2. Import script (CMS + order file) + seed dev DB; env `ICD_DEFAULT_VERSION=FY2024`.
3. `stripIcdDot` / `formatIcdForDisplay` + icd module tests (`J20.9` ↔ `J209`, validate, billable flag).
4. Wire pipeline + GET enrichment.
5. Org seed reads default version from env.
6. Prompt version param from org FY label.
7. UI: description, display code, category chip, invalid state.

### E0c acceptance (gate E1)

| # | Criterion | Validation |
|---|-----------|------------|
| C1 | Invalid AI code removed in GET; condition text remains | Integration test with mocked SOAP JSON |
| C2 | Valid code shows **dotted display** + official CMS description | Manual vs import sample |
| C3 | Old `icd_version` rows still in DB after new FY import | SQL check |
| C4 | Non-billable code from AI → chip **Category code — choose a specific code** | Manual / fixture row |
| C5 | `formatIcdForDisplay` / `stripIcdDot` unit tests pass | Unit test |

---

## Later phases (reference — full detail in solution doc)

| Phase | Focus |
|-------|--------|
| **E1** | Method A — insert at cursor |
| **E2** | Method C — teach mode + API |
| **E3** | Taught profile auto-fill + checklist |
| **E4** | ICD insert + replace/append |
| **E5** | Method D — FHIR / SMART |

---

## Relevant files summary (E0)

| Layer | Modify / New |
|-------|----------------|
| Mock | `mock-ehr/*.html` (content only — no extension profile) |
| Shared | `shared/patient-match/`; optional `shared/icd-format.ts` |
| Backend | migrations 0006–0009, sessions, pipeline, icd module |
| Extension E0a | Method B detect + browser layer + recording UI |
| Docs | `extension/docs/mock-ehr.md`, `docs/ehr-insert-solution.md` |

---

## Testing strategy

| Layer | Tests |
|-------|--------|
| Shared | patient-match; ICD dot helpers |
| Integration | patient context; diagnoses; ICD strip |
| Manual | `serve mock-ehr -l 5180` — **Method B** on patient page (same as would on real EHR labels) |

```bash
cd backend && npm run build && npm test
cd extension && npm run typecheck && npm run build
```

---

## Risks / notes

- Method B heuristics galat field pakad sakte hain → doctor confirm / manual entry safety net.
- Permission bina user gesture ke auto-request mat karo (browser reject).
- PHI logs mein kabhi nahi.

---

## Approval

Plans and PRDs must include this block before implement phase.

- [ ] Product — acceptance criteria match Jira/Figma
- [ ] Tech — architecture decisions (AD-N) respected; no scope creep
- [ ] **Approved by:** _(human name)_
- [ ] **Date:** _(YYYY-MM-DD)_

**Agent rule:** Do not implement until all boxes are checked and approver name is filled. **Agents must never tick approval.**

**Sub-phase gates:** E0b after E0a; E0c after E0b; E1 after E0c.

**Implementation note:** Rev 2 layered methods — see `docs/ehr-insert-solution.md` and `ehr-insert-doc-rev2-report.md`.
