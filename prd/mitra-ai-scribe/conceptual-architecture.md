# Mitra AI Scribe — Conceptual Architecture (Browser Extension & EHR Integration)

**Status:** Design investigation only — no implementation  
**Product:** **Mitra AI Scribe** (standalone; not FlowMD HMIS)  
**Reference implementation:** FlowMD `his-global-south` ambient v2 stack (research / reuse / extraction)

---

## Executive summary

Mitra is a **hospital-agnostic, EHR-agnostic, browser-agnostic** AI medical scribe. FlowMD today **owns** the consultation UI, encounter APIs, and chart persistence. Mitra must assume the **hospital EHR is an external app** Mitra does not control, and integrate via **FHIR/API first**, **browser extension second**, **clipboard last**.

FlowMD’s ambient v2 pipeline (record → STT → diarization → canonical clinical JSON → HITL → apply) is a strong **capability reference**, but most FlowMD-specific coupling (encounter routes, `clinical_notes`, consultation workspace, org auth tied to HMIS) must be **extracted or re-layered**, not copied wholesale.

---

## 1. Separate Mitra from FlowMD

### Relationship

```text
FlowMD (HMIS reference)
      │
      │  ambient v2: sessions, STT, labeling, SOAP prompts, HITL
      ▼
Research / extract reusable capabilities
      │
      ▼
Mitra AI Scribe (product)
      ├── Mitra API (scribe + sessions + identity)
      ├── Mitra canonical clinical model
      ├── Mitra Browser Extension (shared core + browser adapters)
      └── EHR integration layer (FHIR / DOM adapters per vendor)
```

### Potentially reusable from FlowMD (extract, don’t embed HMIS)

| Capability | FlowMD location (reference) | Mitra reuse idea |
|------------|------------------------------|------------------|
| Audio capture | `useAudioRecorder`, MediaRecorder | Shared **Mitra Recorder** module (extension popup / side panel) |
| Session lifecycle | `ambient.service.ts`, `ambient_sessions` | **Mitra Session** API; encounter FK becomes **external encounter ref** + verified patient context |
| STT | `ambient-stt.service.ts`, `shared/ai/whisper.ts` | Mitra STT service (same providers; no FlowMD env names) |
| Speaker labeling | `ambient-labeling.service.ts`, `labeling.v1` | Same prompt pattern; output stays **canonical transcript** |
| Clinical extraction | `ambient-scribe.service.ts`, `soap.v1`, `AmbientExtractedEntities` | **Mitra Canonical Model** generator (not “SOAP-only”) |
| HITL draft states | `ambient_drafts`, PUT draft status | **Mitra Draft** with `pending \| accepted \| edited \| dismissed` |
| Consent attestation | consent fields on session | Required on Mitra session; versioned policy text |
| Anti-hallucination guardrails | prompt rules in `soap.v1` | Keep in **model layer**; separate from EHR mapping |
| Pipeline orchestration | `runPipeline`, status machine | Mitra backend job queue (same states conceptually) |
| Audit / PHI logging discipline | controller comments, zero-PHI logs | Mitra audit service (who, when, which EHR target, no raw transcript in logs) |

### FlowMD-specific — do **not** carry into Mitra as-is

| Area | Why it stays in FlowMD |
|------|-------------------------|
| Consultation Workspace UI | FlowMD-owned chart editor |
| `PUT /encounters/:id/notes`, observations, sign | HMIS legal record |
| `encounters`, `visits`, `clinical_notes` schema | FlowMD data model |
| `withOrgAuth` + FlowMD org/hospital RBAC | Tenant model of HMIS |
| `applyAmbientEntities` → orders, Rx, vitals modules | FlowMD billing/clinical modules |
| Front desk, billing, IPD routes | Unrelated to scribe product |
| `ambient_session_id` on sign | FlowMD provenance link |

### Must redesign (FlowMD assumes “we own the UI”)

| FlowMD assumption | Mitra assumption |
|-------------------|------------------|
| Doctor documents inside FlowMD tabs | Doctor documents in **vendor EHR** |
| Apply-all writes to FlowMD APIs | **Adapter writes** to EHR fields or FHIR DocumentReference |
| `encounter_id` is UUID in our DB | **External encounter** + verified match on EHR page |
| Single-page SOAP tabs | **Per-EHR field map** + multi-page routing |
| Feature flag on FlowMD hospital row | Mitra tenant + enabled **EHR profile** |

**Note:** Branch `browser-extension-ambient` in the repo today has **no** browser extension code (no manifest/content scripts)—only in-app ambient v2. The product name is ahead of the codebase.

---

## 2. Mitra canonical clinical model (EHR-agnostic)

Mitra internal representation should **not** be “SOAP strings only.” Prefer a **versioned JSON document** (FlowMD’s `AmbientExtractedEntities` + narrative sections is a starting point).

### Suggested top-level shape

```text
MitraClinicalDocument (v1)
├── metadata (sessionId, author, generatedAt, locale, consentVersion)
├── patientContextRef (verified identifiers — see §9)
├── transcript
│   ├── raw
│   └── utterances[] (speaker, text, time)
├── narrative (canonical sections — not EHR labels)
│   ├── presentingProblem / history / examination / assessment / plan / followUp
│   └── OR flexible section[] { key, title, body, confidence }
├── structured (extractedEntities)
│   ├── diagnoses[], medications[], orders[], vitals[], examFindings[], …
└── draftState (per section: pending | accepted | edited | dismissed)
```

**AI models** read/write this canonical form. **EHR adapters** map canonical paths → EHR labels and DOM/FHIR paths.

Example mappings (§5):

| Canonical path | EHR A | EHR B | EHR C |
|----------------|-------|-------|-------|
| `narrative.presentingProblem` | Chief Complaint | Presenting Complaint | Reason for Visit |
| `structured.diagnoses` | Diagnosis | Clinical Impression | Medical Impression |
| `structured.medications` | Medication | Prescription | Drug Orders |

---

## 3. Single-page EHR (extension behavior)

```text
Doctor on EHR chart (one scrollable page)
        │
        ▼
Content script: detect EHR profile (URL + DOM fingerprint)
        │
        ▼
Adapter: field catalog for this page
  e.g. chiefComplaint → textarea#cc
        │
        ▼
Mitra side panel: review canonical draft
        │
        ▼
Doctor clicks “Insert section” / “Insert all on this page”
        │
        ▼
Adapter fills fields (input events, not form.submit)
        │
        ▼
Doctor saves chart in EHR (Mitra does NOT submit)
```

**Field discovery strategies (per adapter):**

1. Stable `data-*` / `name` / `aria-label` selectors (preferred in adapter config)
2. Label proximity heuristics (fragile; fallback only)
3. FHIR read → map DocumentReference sections (API path)

---

## 4. Multi-page / multi-tab EHR

Critical: draft must **survive navigation** across routes and tabs.

### Conceptual state

```text
Mitra Session Store (extension)
├── sessionId (Mitra backend)
├── canonicalDraft (full document)
├── ehrProfileId ("vendor-x-v3")
├── patientVerification (MRN, name, DOB hash — see §9)
└── pageFillPlan[]
      ├── { routePattern, sectionKeys[], fillStatus: pending|done|skipped }
      └── …
```

### Flow

```text
Consultation ends → Mitra generates draft (backend)
        │
        ▼
Extension stores draft + fill plan in chrome.storage.session / IndexedDB
        │
        ▼
Doctor opens /history → content script matches route → shows “History ready”
        │
        ▼
Doctor inserts → mark section done; sync state across tabs
        │
        ▼
Doctor opens /examination → repeat
```

### Mechanisms

| Mechanism | Role |
|-----------|------|
| **Service worker** | Orchestration, Mitra API calls, cross-tab messaging, retry |
| **chrome.storage.session** (MV3) | Draft + fill plan for browser session; size limits → chunk or IndexedDB |
| **BroadcastChannel / runtime.sendMessage** | Tab A inserts; Tab B updates checklist UI |
| **URL/route detection** | Adapter `matchUrls[]` + optional `pathname` regex |
| **DOM detection** | Per-page `fieldMap` in adapter manifest |
| **EHR adapter package** | Versioned JSON: routes, selectors, canonical→field mapping |
| **Failure recovery** | Persist last good draft server-side; extension reconnects by `sessionId`; show diff if EHR field already edited |

**Race conditions:** If doctor edits EHR manually before insert, adapter should **read current value** and offer merge or overwrite per section (never silent overwrite of non-empty without confirm).

---

## 5. Terminology mapping layer

```text
Mitra Canonical Clinical Model
              │
              ▼
     MappingProfile (per hospital / EHR version)
              │
    ┌─────────┼─────────┐
    ▼         ▼         ▼
 Adapter A  Adapter B  Adapter C
```

- **MappingProfile** is configuration, not code (where possible): YAML/JSON loaded by extension.
- Code adapters only for vendor-specific quirks (iframe, shadow DOM, dynamic React roots).
- LLM prompts use **canonical section keys** only (`history`, `examination`, …), never “Chief Complaint” unless locale pack for display.

---

## 6. Mitra Browser Extension — cross-browser architecture

**Product name:** Mitra Browser Extension (not “Chrome extension”).

```text
                 Mitra Browser Extension
                           │
              ┌────────────┴────────────┐
              │                         │
        mitra-core (TS, shared)    browser-shell
              │                         │
    ┌─────────┼─────────┐      ┌──────┴──────┐
    │         │         │      │             │
  session   adapter   api    chromium     firefox
  store     engine    client  (MV3)       (MV2/MV3)
    │         │         │      │             │
    recorder  field     auth   edge, brave  safari
              fill               opera        (WebExtensions + native messaging if needed)
```

| Layer | Browser-independent |
|-------|---------------------|
| Canonical model, HITL state machine, API client, adapter engine, patient verify logic | Yes |
| Manifest, service worker registration, `browser.*` polyfill | Thin per platform |
| Safari | Often separate wrapper + App Extension; reuse **mitra-core** via build |

Use **`webextension-polyfill`** and one codebase with manifest variants (`manifest.chromium.json`, `manifest.firefox.json`).

---

## 7. FlowMD vs Mitra — summary table

See §1. Additional redesign hotspots:

- **Patient context:** FlowMD `fetchPatientContext` reads allergies/conditions from **FlowMD DB**. Mitra must accept context from **FHIR $everything**, EHR API, or **manual/minimal** context when only extension is available (with safety banners).
- **Session anchor:** FlowMD requires `encounter_id`. Mitra should support **EHR-external session** keyed by verified `(patientId, encounterId, siteId)` tuple supplied by adapter scrape + doctor confirm.

---

## 8. Integration hierarchy (recommended)

### Tier 1 — Preferred: official API / FHIR

```text
Mitra API ↔ EHR FHIR (SMART on FHIR) or vendor REST
```

**Why prefer API:**

- Stable contracts vs DOM refactors
- Patient/encounter identity from **Authoritative IDs**
- DocumentReference / Composition for structured note
- Audit trail on server
- No brittle automation policy violations at some hospitals

**When:** Hospital enables SMART app or vendor scribe API.

### Tier 2 — Browser extension (DOM)

```text
Mitra Extension ↔ EHR web UI
```

**When:** No usable write API, or write API missing note fields; doctor still uses web EHR.

**Risks:** Selector breakage, A/B UI tests, CSP, iframes, medico-legal ambiguity on “who saved.”

### Tier 3 — Clipboard / manual

```text
Mitra → formatted text per section → clipboard → doctor pastes
```

**When:** Locked-down EHR, Citrix, or adapter not certified for site. Still **doctor-in-the-loop**.

### Decision matrix

| Signal | Choose |
|--------|--------|
| SMART write + DocumentReference | FHIR first |
| Read FHIR, write only UI | Hybrid: verify patient via FHIR, fill via DOM |
| No API | DOM adapter |
| DOM blocked | Clipboard |

---

## 9. Patient / encounter safety

FlowMD today:

- Session tied to **FlowMD `encounter_id`** and org scope; blocks if note signed.
- Patient id from **encounters** row — implicit match because UI and API are same app.

Mitra must **explicitly verify** EHR page context vs Mitra session:

```text
Mitra Session Context          EHR Page Context (adapter scrape)
        │                                │
        └──────── compare ───────────────┘
                      │
            ┌─────────┴─────────┐
            ▼                   ▼
         MATCH              MISMATCH
            │                   │
            ▼                   ▼
      Allow insert      Block + modal
                        (“Wrong patient?”)
```

**Identifiers (priority):**

1. **MRN / patient ID** (strong)
2. **Encounter / visit / admission ID** (strong)
3. **Name + DOB** (supporting; never alone)
4. **URL ids** (weak alone; use with hash compare)

**Rules:**

- Never auto-fill on mismatch.
- Re-verify on **every route change** in multi-page EHR.
- Optional: doctor taps “Confirm patient” with displayed identifiers.
- Log verification outcome in Mitra audit (no PHI in extension logs).

---

## 10. Doctor-in-the-loop (safety boundary)

```text
Audio → Mitra AI → canonical DRAFT (server)
        │
        ▼
Doctor reviews in Mitra panel (accept/edit/dismiss per section)
        │
        ▼
Doctor triggers “Insert into EHR” (per page or section)
        │
        ▼
Adapter writes draft text into fields only
        │
        ▼
Doctor reviews EHR native UI
        │
        ▼
Doctor clicks EHR Save / Sign (Mitra never calls submit/sign APIs unless explicit Tier-1 FHIR draft save — still not “finalize encounter” without doctor action)
```

**Architecture representations:**

| Layer | Enforcement |
|-------|-------------|
| Backend | Draft rows stay `pending` until explicit accept; no auto-write to FHIR Production |
| Extension | No `form.submit()`, no click “Sign note” selectors in default adapters |
| UI | Clear labels: “Draft — not saved to medical record until you save in {EHR}” |
| Audit | Events: `draft_generated`, `section_accepted`, `ehr_insert`, `verification_pass/fail` |

FlowMD HITL (`AmbientDraftPanel`, PUT `/drafts/:id`) maps directly to Mitra draft API; **EHR insert** is the new step replacing `applyAmbientEntities` + autosave.

---

## 11. Target end-state architecture

```text
                    ┌───────────────────┐
                    │  MITRA AI SCRIBE  │
                    │  (cloud API)      │
                    └─────────┬─────────┘
                              │
              Canonical Clinical Model + Sessions
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
   SMART / FHIR         Browser Ext           Clipboard
   Integration          (mitra-core)           fallback
         │                    │
         └──────────┬─────────┘
                    ▼
         Hospital A / B / C EHR (external)
```

### Mitra cloud (conceptual services)

- **Identity & tenant** (clinician, hospital, license)
- **Session & audio** (consent, storage, retention)
- **Pipeline** (STT, diarization, extraction) — evolved from FlowMD ambient
- **Draft & audit API**
- **Adapter registry** (signed configs per EHR version)

### Extension (conceptual)

- Recorder + session UI
- HITL review panel
- Patient verification UI
- Adapter runtime + fill engine
- Offline-tolerant draft cache for multi-tab

---

## Suggested phased roadmap (design only)

| Phase | Focus |
|-------|--------|
| P0 | Extract **mitra-core** types + session API from FlowMD ambient; canonical model v1 |
| P1 | Mitra API standalone deploy; FlowMD optional “Mitra-powered” mode later |
| P2 | Chromium extension + one **reference EHR adapter** (could be FlowMD as dogfood adapter, clearly labeled) |
| P3 | Multi-page state + second vendor adapter |
| P4 | SMART on FHIR write path for supported sites |
| P5 | Firefox/Safari shells |

---

## References (FlowMD codebase)

- Architecture doc: `projects/his-global-south/docs/AMBIENT-NOTES-ARCHITECTURE.md`
- Backend: `backend/src/modules/clinical/ambient/*`
- Frontend: `src/components/ambient/*`, `src/hooks/useAmbientScribe.ts`
- Hub PRD: `prd/his-global-south/ambient-notes/`

---

## Approval

Design investigation — **no implementation approval required** until PRD and technical design for Mitra product are opened as separate workstream from FlowMD HMIS.
