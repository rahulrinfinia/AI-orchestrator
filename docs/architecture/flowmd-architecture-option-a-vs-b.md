# flowMD — Two Architecture Options

Compare **Option A (Unified)** vs **Option B (Separate IPD database)**.

| | Option A — Unified | Option B — Separate IPD DB |
|--|-------------------|---------------------------|
| **Repos** | One (his-global-south extended) | Two (flowMD OPD + IPD app) |
| **Databases** | One Postgres per country | Two Postgres (flowMD + IPD) |
| **Patient** | One `patients` table, FK | IPD stores `patient_ref` only |
| **Super Admin** | One portal, one DB | One portal → provisions both via API |
| **Complexity** | Lower | Higher (sync/API) |
| **Best for** | Embedded OPD+IPD, Phase 1 Kenya | Sovereign IPD-only, separate scaling |

---

# OPTION A — UNIFIED (OPD + IPD, same database)

## A1. Overview

```mermaid
flowchart TB
    subgraph Users["Users"]
        SA["Super Admin\nflowMD team"]
        ST["Hospital staff"]
    end

    subgraph Platform["flowMD Platform — ONE app"]
        ADMIN["Super Admin UI"]
        APP["Hospital App\nOPD + IPD modules"]
        ADMIN --> APP
    end

    subgraph Config["Configuration"]
        PROF["Deployment profile\nkenya-l5-v1 / ahcg-uae-v1"]
        FLAGS["Per hospital:\nopd_enabled | ipd_enabled"]
        ROLES["Per user:\nroles + module_permissions"]
    end

    subgraph DB["ONE Postgres per country"]
        SHARED["organizations, patients,\nusers, patient_coverage"]
        OPD["visits, encounters,\nvisit_admissions, rcm"]
        IPD["p1_config, m1_admission,\nm2_capacity"]
    end

    SA --> ADMIN
    ST --> APP
    APP --> Config
    APP --> DB
    PROF --> DB
```

**Rule:** One country install → one Postgres. OPD and IPD are **modules in the same app**, not separate services.

---

## A2. Super Admin → Deployment profile → Database

```mermaid
sequenceDiagram
    participant SA as Super Admin
    participant APP as flowMD Platform
    participant DB as ONE Postgres

    Note over SA,DB: Install time (DevOps)
    APP->>DB: Seed config_profile (kenya-l5-v1)

    Note over SA,DB: Runtime — Super Admin
    SA->>APP: Add hospital
    APP->>DB: INSERT organizations<br/>(opd_enabled, ipd_enabled, config_profile_id)
    alt ipd_enabled
        APP->>DB: INSERT p1_config.facility
    end
    SA->>APP: Create users + roles
    APP->>DB: INSERT auth.users, user_roles, module_permissions
```

| Layer | Where stored | Who sets it |
|-------|--------------|-------------|
| Deployment profile | `p1_config.config_profile` | DevOps / install |
| Org module flags | `organizations.opd_enabled`, `ipd_enabled` | Super Admin |
| User access | `user_roles`, `module_permissions` | Super Admin / Hospital Admin |

---

## A3. What user sees (assignment-based)

```mermaid
flowchart LR
    ORG["organization flags\nopd_enabled | ipd_enabled"]
    ROLE["user role +\nmodule_permissions"]
    UI["Menus visible"]

    ORG --> UI
    ROLE --> UI

    UI --> OPDM["OPD menus\nif opd_enabled AND permission"]
    UI --> IPDM["IPD menus\nif ipd_enabled AND permission"]
```

**Example:**

| User | Role | Org flags | Sees |
|------|------|-----------|------|
| Reception | receptionist | opd✅ ipd✅ | OPD Register only |
| Doctor | doctor | opd✅ ipd✅ | OPD Consult + Admission advised |
| Ward nurse | nurse + beds module | opd✅ ipd✅ | IPD Admissions + Bed board |
| Hospital Admin | admin | opd✅ ipd✅ | Org setup + IPD Admin beds |

Same login. Router hides modules user/org is not allowed to see.

---

## A4. OPD + IPD in same DB — communication

**No API between services.** Internal module calls + SQL foreign keys.

```mermaid
flowchart TB
    subgraph App["Same backend process"]
        OPD["OPD modules\nfrontdesk, clinical"]
        IPD["IPD modules\nadmin, admissions, beds"]
        OPD <-->|"patient_id FK\nshared tables"| IPD
    end

    subgraph DB["ONE Postgres"]
        P["patients"]
        V["visit_admissions"]
        M1["m1_admission"]
        M2["m2_capacity"]
        P --> M1
        V -.->|optional link| M1
        M1 --> M2
    end

    OPD --> DB
    IPD --> DB
```

### Embedded journey (Option A)

```text
OPD Register     →  WRITE patients
OPD Consult      →  WRITE visit_admissions (advised)
IPD Admit        →  READ patients, WRITE m1_admission (patient_id FK)
IPD Assign bed   →  WRITE m2_capacity
```

### Standalone IPD within Option A (OPD off, same DB)

```text
IPD Register     →  WRITE patients (same table)
IPD Admit        →  READ/WRITE m1_admission
(OPD tables empty — no separate DB)
```

---

## A5. Option A — tables

| REUSE (existing) | NEW (IPD) | EXTEND |
|------------------|-----------|--------|
| organizations, patients, patient_coverage | p1_config.* | organizations + flags |
| users, user_roles, module_permissions | m1_admission.* | |
| visits, encounters, visit_admissions | m2_capacity.* | |
| rcm, payer catalog | config_profile | |

---

# OPTION B — SEPARATE IPD (own database)

## B1. Overview

```mermaid
flowchart TB
    subgraph Users["Users"]
        SA["Super Admin\nONE login"]
        ST["Hospital staff"]
    end

    subgraph Admin["Super Admin Portal"]
        SAUI["Add hospital\npick region, flags"]
    end

    subgraph FlowMD["EXISTING flowMD (OPD)"]
        OPDAPP["OPD App"]
        OPDAPI["OPD API"]
        OPDDB[("flowMD Postgres\norganizations\npatients\nvisits, clinical\nrcm")]
        OPDAPP --> OPDAPI --> OPDDB
    end

    subgraph IPD["SEPARATE IPD System"]
        IPDAPP["IPD App"]
        IPDAPI["IPD API"]
        IPDDB[("IPD Postgres\np1_config\nm1_admission\nm2_capacity\npatient_ref only")]
        IPDAPP --> IPDAPI --> IPDDB
    end

    SA --> SAUI
    ST --> OPDAPP
    ST --> IPDAPP

    SAUI -->|"1. create org"| OPDAPI
    SAUI -->|"2. if ipd: provision"| IPDAPI

    OPDAPI <-->|"REST API\npatient, org, events"| IPDAPI
    IPDAPI --> IPDDB
    OPDAPI --> OPDDB
```

**Rule:** Two databases. Link by **UUID copy** (`flowmd_organization_id`, `patient_ref`) — **no cross-DB foreign keys**.

---

## B2. Super Admin → profiles → two databases

```mermaid
sequenceDiagram
    participant SA as Super Admin
    participant CP as Admin / Control layer
    participant OPD as flowMD OPD API
    participant FDB as flowMD Postgres
    participant IPD as IPD API
    participant IDB as IPD Postgres

    SA->>CP: Add hospital (Kenya, opd✅ ipd✅)

    CP->>OPD: POST /platform/organizations
    OPD->>FDB: INSERT organizations, config ref

    alt ipd_enabled
        CP->>IPD: POST /internal/provision-facility<br/>{ flowmd_organization_id, name, profile }
        IPD->>IDB: INSERT p1_config.facility<br/>(flowmd_organization_id = org id)
        IPD-->>CP: facility_id
    end

    CP-->>SA: Hospital ready on both systems
```

| Data | flowMD DB | IPD DB |
|------|-----------|--------|
| Organization master | ✅ `organizations` | link only `flowmd_organization_id` |
| Deployment profile | optional copy | ✅ `config_profile` |
| Patients (name, SHA) | ✅ `patients` | ❌ only `patient_ref` |
| OPD visits | ✅ | ❌ |
| IPD admissions/beds | ❌ | ✅ |

---

## B3. Deployment profiles in Option B

Each system has profile config; **aligned at provision time**:

```text
flowMD install (Kenya):
  ACTIVE_PROFILE = kenya-l5-v1
  → OPD behaviour (SHA forms, RCM)

IPD install (Kenya, same region):
  ACTIVE_PROFILE = kenya-l5-v1
  → IPD behaviour (MoH reports, bed rules)

Both deployed in Kenya. Two DBs. Same profile name.
Super Admin picks profile once → passed to both APIs on provision.
```

---

## B4. How IPD communicates with flowMD DB (Option B)

IPD **never connects directly** to flowMD Postgres. **REST API only.**

```mermaid
flowchart LR
    subgraph IPD_System["IPD System"]
        IPDUI["IPD UI"]
        IPDAPI["IPD API"]
        IPDDB[("IPD DB")]
        IPDUI --> IPDAPI --> IPDDB
    end

    subgraph FlowMD["flowMD OPD"]
        OPDAPI["OPD API"]
        OPDDB[("flowMD DB")]
        OPDAPI --> OPDDB
    end

    IPDAPI -->|"GET /api/patients/:id"| OPDAPI
    IPDAPI -->|"POST /api/patients/search"| OPDAPI
    IPDAPI -->|"POST /api/patients (standalone register)"| OPDAPI
    OPDAPI -->|"event: admission.advised"| IPDAPI
    IPDAPI -->|"GET /api/organizations/:id"| OPDAPI
```

### API contract (Option B)

| Need | Direction | API | IPD stores |
|------|-----------|-----|------------|
| Search patient | IPD → flowMD | `GET /api/patients?q=` | nothing (display only) |
| Get patient detail | IPD → flowMD | `GET /api/patients/:id` | `patient_ref` on admit |
| Register (standalone) | IPD → flowMD | `POST /api/patients` | returns id → `patient_ref` |
| Org info | IPD → flowMD | `GET /api/platform/organizations/:id` | `flowmd_organization_id` |
| Admission advised | flowMD → IPD | webhook/event `admission.advised` | creates admission queue |
| Provision facility | Admin → IPD | `POST /internal/provision-facility` | `facility` row |

---

## B5. Option B — Embedded (OPD + IPD separate DBs)

```mermaid
sequenceDiagram
    participant REC as Reception
    participant OPD as OPD App + DB
    participant DOC as Doctor
    participant IPD as IPD App + DB

    REC->>OPD: Register patient
    OPD->>OPD: INSERT patients (flowMD DB)

    DOC->>OPD: Consult + admission advised
    OPD->>OPD: INSERT visit_admissions
    OPD->>IPD: Event admission.advised<br/>{ patient_id, visit_id }

    IPD->>OPD: GET /api/patients/:id
    OPD-->>IPD: name, coverage (from flowMD DB)

    IPD->>IPD: INSERT m1_admission<br/>(patient_ref = patient_id)
    IPD->>IPD: INSERT m2_capacity bed_assignment
```

```text
Patient master     →  flowMD DB only
Admission + beds   →  IPD DB only
Link               →  patient_ref (UUID copy)
```

---

## B6. Option B — Standalone IPD (no OPD UI)

Two sub-cases:

### B6a. Standalone — IPD register via flowMD Patient API

```mermaid
sequenceDiagram
    participant REC as Reception (IPD UI)
    participant IPD as IPD App + DB
    participant OPD as flowMD Patient API + DB

    REC->>IPD: Register patient form
    IPD->>OPD: POST /api/patients
    OPD->>OPD: INSERT patients (flowMD DB)
    OPD-->>IPD: patient_id
    IPD->>IPD: Store patient_ref on admission rows only

    REC->>IPD: Admit + bed
    IPD->>IPD: INSERT m1_admission (patient_ref)
```

**OPD app not shown to user. Patient still saved in flowMD DB via API.**

### B6b. Standalone — Hospital HIS (UAE)

```mermaid
sequenceDiagram
    participant HIS as Hospital HIS
    participant IPD as IPD App + DB
    participant OPD as flowMD API optional

    HIS->>IPD: P2 ADT inbound
    IPD->>IPD: admission + patient_ref (external id)

    opt Also sync patient to flowMD
        IPD->>OPD: POST /api/patients (upsert)
    end
```

---

## B7. Option B — what lives where

### flowMD Postgres (REUSE existing)

| Table | Purpose |
|-------|---------|
| organizations | Hospital master + opd_enabled, ipd_enabled |
| patients | **Patient registration master** |
| patient_coverage | Insurance |
| users, user_roles | Login (embedded: shared auth) |
| visits, encounters | OPD |
| visit_admissions | OPD handoff |
| rcm | OPD billing |

### IPD Postgres (NEW — separate)

| Table | Purpose |
|-------|---------|
| p1_config.config_profile | IPD deployment profile |
| p1_config.facility | `flowmd_organization_id` link |
| m1_admission.* | Admissions (uses `patient_ref`) |
| m2_capacity.* | Beds, assignments |
| m8_billing.* | IPD charges (later) |

**IPD does NOT have `patients` master table** — only `patient_ref` on operational rows.

---

## B8. User login — Option B

| Case | Login | Apps |
|------|-------|------|
| Embedded | flowMD auth (Better Auth) | OPD app URL + IPD app URL, same token/JWT |
| Standalone IPD | flowMD auth or IPD auth | IPD app only; API to flowMD for patients |

```text
Same JWT → both apps validate against flowMD identity
IPD API adds patient_ref from flowMD on each operation
```

---

# SIDE-BY-SIDE SUMMARY

```mermaid
flowchart TB
    subgraph A["OPTION A — Unified"]
        A1["1 Super Admin"]
        A2["1 App OPD+IPD"]
        A3["1 DB"]
        A4["patient_id FK"]
        A1 --> A2 --> A3
    end

    subgraph B["OPTION B — Separate"]
        B1["1 Super Admin"]
        B2["2 Apps"]
        B3["2 DBs"]
        B4["patient_ref + API"]
        B1 --> B2
        B2 --> B3
        B3 --> B4
    end
```

| Question | Option A | Option B |
|----------|----------|----------|
| How many DBs? | 1 | 2 |
| Patient register | Same `patients` table | flowMD DB; IPD has `patient_ref` |
| OPD ↔ IPD talk | SQL / internal modules | REST API + events |
| Super Admin | Writes one DB | Calls OPD API + IPD provision API |
| Deployment profile | One DB `config_profile` | Both systems; synced at provision |
| User sees modules | Flags + roles in one app | Two apps or linked shell |
| Phase 1 Kenya | **Recommended simpler** | More work |
| Standalone IPD | Same DB, OPD off | IPD DB + flowMD Patient API |
| Embedded | Natural fit | Sync + events needed |

---

# RECOMMENDATION

| Phase | Suggestion |
|-------|----------|
| **Phase 1 Kenya pilot (OPD+IPD embedded)** | **Option A** — one DB, extend his-global-south |
| **UAE sovereign IPD-only later** | Option B possible if hospital demands isolated IPD DB |
| **Long term** | Start A; extract to B only if contract requires hard DB separation |

---

# CURRENT CODE STATE

| Item | Option A path | Option B path |
|------|---------------|---------------|
| flowMD OPD | ✅ his-global-south | ✅ same |
| IPD | Build inside his-global-south | projects/ipd separate repo |
| Super Admin | ✅ exists | Needs provision API to IPD |
| config_profile | ❌ build | ❌ build both sides |
| Cross-system API | Not needed | ❌ build patient + provision APIs |
