# flowMD × IPD — Full Architecture
## Super Admin · Deployment Profile · Kenya/UAE · OPD + IPD Modules

**Read top to bottom.**  
Covers: Super Admin → profile & config → regional stacks (Kenya / UAE) → OPD + IPD modules → how they communicate.

---

# PART 1 — SUPER ADMIN (start)

```mermaid
flowchart TB
    SA["flowMD Super Admin\nONE login"]

    SA --> A1["Add hospital"]
    SA --> A2["Set opd_enabled / ipd_enabled"]
    SA --> A3["Create users + roles"]
    SA --> A4["Pick region: Kenya or UAE"]

    A1 --> STACK["Regional stack\n(Kenya or UAE servers + DB)"]
    A2 --> STACK
    A3 --> STACK
    A4 --> STACK
```

| Super Admin action | Stored in |
|--------------------|-----------|
| Add hospital | `organizations` |
| Enable OPD / IPD | `organizations.opd_enabled`, `ipd_enabled` |
| Region (Kenya/UAE) | Which server stack + which profile |
| Users & roles | `auth.users`, `user_roles`, `module_permissions` |

---

# PART 2 — THREE CONFIG LAYERS (profile + flags + user)

```text
┌─────────────────────────────────────────────────────────────┐
│ LAYER 1 — DEPLOYMENT PROFILE (market / country rules)        │
│ Table: p1_config.config_profile                              │
│ Set at: install time per region                              │
│ Examples: kenya-l5-v1 (SHA, MoH) | ahcg-uae-v1 (HIS, ERP)   │
├─────────────────────────────────────────────────────────────┤
│ LAYER 2 — ORG MODULE FLAGS (per hospital)                    │
│ Table: organizations                                         │
│ Set by: Super Admin                                          │
│ opd_enabled | ipd_enabled                                    │
├─────────────────────────────────────────────────────────────┤
│ LAYER 3 — USER ACCESS (per staff)                            │
│ Tables: user_roles + module_permissions                      │
│ Set by: Super Admin / Hospital Admin                         │
│ Who sees OPD menus vs IPD menus                              │
└─────────────────────────────────────────────────────────────┘
```

**Profile and org flags are different tables — not merged into one.**

---

# PART 3 — KENYA & UAE (separate servers, separate databases)

```text
❌ NOT: one global database for Kenya + UAE
✅ YES: each country = own servers + own database(s)
        same TABLE NAMES in each — data never mixed across countries
```

---

## 3.1 Master diagram — flowMD × IPD in both regions

```mermaid
flowchart TB
    SA["Super Admin\nONE login"]

    SA --> KEN["Add hospital → Kenya"]
    SA --> UAE["Add hospital → UAE"]

    subgraph KENYA["🇰🇪 KENYA STACK — own servers"]
        direction TB

        K_PROF["Profile: kenya-l5-v1"]

        subgraph K_APP["flowMD × IPD Apps — Kenya"]
            K_OPD["OPD Module\nfrontdesk, clinical, rcm"]
            K_IPD["IPD Module\nadmin, admissions, beds"]
        end

        subgraph K_FLOWDB["flowMD Postgres — Kenya"]
            K_CP["config_profile"]
            K_ORG["organizations + flags"]
            K_PAT["patients, coverage"]
            K_OPDT["visits, encounters\nvisit_admissions"]
        end

        subgraph K_IPDDB["IPD Postgres — Kenya"]
            K_CP2["config_profile"]
            K_FAC["facility → org link"]
            K_M1["m1_admission"]
            K_M2["m2_capacity"]
        end

        K_PROF --> K_CP
        K_PROF --> K_CP2
        K_APP --> K_FLOWDB
        K_APP --> K_IPDDB
        K_OPD <-->|"API / patient_ref"| K_IPD
        K_ORG -.->|provision| K_FAC
        K_PAT -.->|patient_ref| K_M1
    end

    subgraph UAESTACK["🇦🇪 UAE STACK — own servers"]
        direction TB

        U_PROF["Profile: ahcg-uae-v1"]

        subgraph U_APP["flowMD × IPD Apps — UAE"]
            U_OPD["OPD Module\n(optional off)"]
            U_IPD["IPD Module\nprimary"]
        end

        subgraph U_FLOWDB["flowMD Postgres — UAE"]
            U_CP["config_profile"]
            U_ORG["organizations"]
            U_PAT["patients"]
        end

        subgraph U_IPDDB["IPD Postgres — UAE"]
            U_CP2["config_profile"]
            U_FAC["facility"]
            U_M1["m1_admission"]
            U_M2["m2_capacity"]
        end

        U_PROF --> U_CP
        U_PROF --> U_CP2
        U_APP --> U_FLOWDB
        U_APP --> U_IPDDB
        U_OPD <-->|API| U_IPD
        U_ORG -.-> U_FAC
        U_PAT -.-> U_M1
    end

    KEN --> KENYA
    UAE --> UAESTACK
```

---

## 3.2 ASCII poster — complete stack

```text
                         SUPER ADMIN (one login)
                                    │
                 ┌──────────────────┴──────────────────┐
                 ▼                                      ▼
    ┌────────────────────────────┐      ┌────────────────────────────┐
    │  🇰🇪 KENYA                    │      │  🇦🇪 UAE                      │
    │  Servers: Kenya DC           │      │  Servers: UAE DC           │
    │  Profile: kenya-l5-v1        │      │  Profile: ahcg-uae-v1        │
    ├────────────────────────────┤      ├────────────────────────────┤
    │  flowMD × IPD APPLICATION    │      │  flowMD × IPD APPLICATION    │
    │  ┌──────────┐ ┌──────────┐ │      │  ┌──────────┐ ┌──────────┐ │
    │  │ OPD      │ │ IPD      │ │      │  │ OPD off  │ │ IPD      │ │
    │  │ Register │ │ Admin    │ │      │  │ or on    │ │ Admin    │ │
    │  │ Consult  │ │ Admit    │ │      │  │          │ │ Admit    │ │
    │  │ RCM      │ │ Bed board│ │      │  │          │ │ Bed board│ │
    │  └────┬─────┘ └────┬─────┘ │      │  └────┬─────┘ └────┬─────┘ │
    │       └──────┬──────┘       │      │       └──────┬──────┘       │
    ├──────────────┼──────────────┤      ├──────────────┼──────────────┤
    │  flowMD Postgres (Kenya)     │      │  flowMD Postgres (UAE)     │
    │   config_profile             │      │   config_profile           │
    │   organizations + flags      │      │   organizations + flags    │
    │   patients, coverage         │      │   patients, coverage       │
    │   visits, clinical, rcm      │      │   visits, clinical         │
    ├──────────────┬───────────────┤      ├──────────────┬─────────────┤
    │       REST API / patient_ref │      │       REST API             │
    ├──────────────┴───────────────┤      ├──────────────┴─────────────┤
    │  IPD Postgres (Kenya)        │      │  IPD Postgres (UAE)        │
    │   config_profile             │      │   config_profile           │
    │   facility (org link)        │      │   facility (org link)      │
    │   m1_admission, m2_capacity  │      │   m1_admission, m2_capacity│
    └────────────────────────────┘      └────────────────────────────┘
```

---

# PART 4 — OPD × IPD MODULES (what each does)

## 4.1 Module map inside flowMD × IPD app

```mermaid
flowchart LR
    subgraph OPD["OPD Module — flowMD existing"]
        O1["frontdesk\nRegister, check-in"]
        O2["clinical\nConsult, orders"]
        O3["visit_admissions\nAdvise admit"]
        O4["rcm\nClaims, billing"]
    end

    subgraph IPD["IPD Module — new"]
        I1["ipd-admin\nCategories, wards, beds"]
        I2["ipd-admissions\nADT queue, accept"]
        I3["ipd-beds\nAssign, bed board"]
        I4["ipd-billing\nlater M8"]
    end

    subgraph SHARED["Shared platform"]
        S1["patients"]
        S2["organizations"]
        S3["users / auth"]
        S4["config_profile"]
    end

    O1 --> S1
    O3 -.->|handoff| I2
    I2 --> S1
    I2 --> I3
    OPD --> S2
    IPD --> S2
    OPD --> S4
    IPD --> S4
```

## 4.2 Who sees what (org flags + user role)

| User | opd_enabled | ipd_enabled | Role | Sees |
|------|:-----------:|:-----------:|------|------|
| Reception | ✅ | ✅ | receptionist | OPD Register |
| Doctor | ✅ | ✅ | doctor | OPD Consult, advise admit |
| Ward nurse | ✅ | ✅ | nurse + beds | IPD Admit, bed board |
| Hospital Admin | ✅ | ✅ | admin | Org setup + IPD Admin |
| Reception | ❌ | ✅ | receptionist | **IPD Register** (standalone) |
| Ward staff | ❌ | ✅ | nurse | IPD Admit, beds only |

---

# PART 5 — HOW OPD & IPD COMMUNICATE

## 5.1 Option A — Unified (ONE Postgres per country)

*OPD and IPD in same DB — FK links, no cross-DB API.*

```mermaid
flowchart TB
    subgraph KenyaUnified["🇰🇪 Kenya — ONE Postgres"]
        subgraph Modules["Same app"]
            OPD["OPD Module"]
            IPD["IPD Module"]
        end

        subgraph Tables["Same database"]
            CP["config_profile"]
            ORG["organizations"]
            PAT["patients"]
            OPDT["visits, visit_admissions"]
            IPDT["m1_admission, m2_capacity"]
        end

        OPD --> PAT
        OPD --> OPDT
        IPD --> PAT
        IPD --> IPDT
        PAT -->|"patient_id FK"| IPDT
        OPDT -.->|handoff| IPDT
        ORG --> CP
    end
```

### Embedded journey (Option A, Kenya)

```text
OPD Register  →  WRITE patients
OPD Consult   →  WRITE visit_admissions
IPD Admit     →  READ patients, WRITE m1_admission (patient_id FK)
IPD Bed       →  WRITE m2_capacity
```

### Standalone journey (Option A, Kenya — opd off)

```text
IPD Register  →  WRITE patients (same table)
IPD Admit     →  READ/WRITE m1_admission
(OPD tables unused)
```

---

## 5.2 Option B — Separate IPD DB (TWO Postgres per country)

*flowMD DB + IPD DB — REST API + patient_ref UUID.*

```mermaid
flowchart TB
    subgraph KenyaSeparate["🇰🇪 Kenya — TWO Postgres"]
        subgraph Apps["Apps"]
            OPD["OPD Module"]
            IPD["IPD Module"]
        end

        subgraph FDB["flowMD Postgres"]
            F_CP["config_profile"]
            F_ORG["organizations"]
            F_PAT["patients ← MASTER"]
            F_OPD["visits, visit_admissions"]
        end

        subgraph IDB["IPD Postgres"]
            I_CP["config_profile"]
            I_FAC["facility"]
            I_M1["m1_admission\npatient_ref"]
            I_M2["m2_capacity"]
        end

        OPD --> FDB
        IPD --> IDB
        OPD <-->|"REST API"| IPD
        F_ORG -.->|flowmd_organization_id| I_FAC
        F_PAT -.->|patient_ref| I_M1
        F_CP --- I_CP
    end
```

### Embedded journey (Option B, Kenya)

```mermaid
sequenceDiagram
    participant OPD as OPD + flowMD DB
    participant IPD as IPD + IPD DB

    OPD->>OPD: INSERT patients
    OPD->>OPD: INSERT visit_admissions advised
    OPD->>IPD: event admission.advised

    IPD->>OPD: GET /api/patients/:id
    OPD-->>IPD: patient details

    IPD->>IPD: INSERT m1_admission (patient_ref)
    IPD->>IPD: INSERT m2_capacity bed assign
```

### Standalone journey (Option B, Kenya or UAE)

```text
IPD Register UI
  → IPD API calls POST flowMD /api/patients
  → patient saved in flowMD Postgres
  → IPD stores patient_ref on admission only

IPD Admit + Bed
  → all in IPD Postgres
  → patient name fetched from flowMD API when needed
```

---

# PART 6 — DEPLOYMENT PROFILE TABLE (same name, each DB)

```text
TABLE: p1_config.config_profile   ← SAME structure everywhere

┌─────────────────────────────────────────────────────────────┐
│ Kenya flowMD DB    │ row: kenya-l5-v1  │ SHA, MoH, offline  │
│ Kenya IPD DB       │ row: kenya-l5-v1  │ aligned copy        │
│ UAE flowMD DB      │ row: ahcg-uae-v1  │ HIS, sovereign      │
│ UAE IPD DB         │ row: ahcg-uae-v1  │ aligned copy        │
└─────────────────────────────────────────────────────────────┘

organizations table (flowMD DB only):
  opd_enabled | ipd_enabled | config_profile_id FK
```

| Data | Table | Which DB |
|------|-------|----------|
| Market rules (profile) | `config_profile` | flowMD + IPD (each region) |
| Hospital on/off OPD/IPD | `organizations` | flowMD |
| User menus | `user_roles`, `module_permissions` | flowMD |
| Patient master | `patients` | flowMD |
| IPD beds/admissions | `m1_admission`, `m2_capacity` | IPD (Option B) or same DB (Option A) |

---

# PART 7 — SUPER ADMIN CREATE HOSPITAL (full flow)

```mermaid
sequenceDiagram
    participant SA as Super Admin
    participant ADM as Admin UI
    participant OPD as flowMD API + DB
    participant IPD as IPD API + DB

    SA->>ADM: Hospital: Nairobi General<br/>Region: Kenya<br/>Profile: kenya-l5-v1<br/>opd✅ ipd✅

    ADM->>OPD: POST /organizations
    OPD->>OPD: INSERT organizations<br/>(config_profile_id, opd_enabled, ipd_enabled)

    alt ipd_enabled
        ADM->>IPD: POST /internal/provision-facility
        IPD->>IPD: INSERT p1_config.facility<br/>(flowmd_organization_id)
    end

    SA->>ADM: Add users (reception, doctor, ward)
    ADM->>OPD: INSERT user_roles, module_permissions

    ADM-->>SA: Hospital live on Kenya stack
```

---

# PART 8 — TABLES: REUSE vs NEW

## flowMD Postgres (REUSE — existing his-global-south)

`organizations`, `patients`, `patient_coverage`, `auth.users`, `profiles`, `user_roles`, `module_permissions`, `visits`, `encounters`, `visit_admissions`, `facilities`, `departments`, `units`, `rcm/*`, payer catalog

**EXTEND:** `organizations` + `opd_enabled`, `ipd_enabled`, `config_profile_id`

## NEW (IPD — in same DB Option A, or IPD DB Option B)

| Table | Purpose |
|-------|---------|
| `p1_config.config_profile` | Deployment profile |
| `p1_config.facility` | IPD hospital config |
| `p1_config.bed_category` | Admin |
| `p1_config.billing_category` | Admin |
| `m1_admission.admission_request` | ADT |
| `m1_admission.admission_disposition` | Accept/decline |
| `m2_capacity.bed` | Bed master |
| `m2_capacity.bed_assignment` | Patient on bed |

---

# PART 9 — COMPARE OPTIONS (per country)

| | Option A — Unified | Option B — Separate IPD DB |
|--|---------------------|----------------------------|
| Kenya DBs | **1** Postgres | **2** Postgres (flowMD + IPD) |
| UAE DBs | **1** Postgres | **2** Postgres |
| OPD ↔ IPD | SQL FK same DB | REST API + patient_ref |
| config_profile | 1 table per country DB | 2 tables per country (aligned) |
| Embedded OPD+IPD | Natural | API sync |
| Standalone IPD | Same DB, OPD off | IPD DB + flowMD Patient API |
| Phase 1 Kenya | **Simpler** | More integration |

---

# PART 10 — ONE-PAGE SUMMARY

```text
Super Admin (one login)
    → picks region: Kenya | UAE
    → picks profile:  kenya-l5-v1 | ahcg-uae-v1  (in config_profile table)
    → sets org flags: opd_enabled | ipd_enabled
    → creates users + module permissions

Kenya stack (own servers)                UAE stack (own servers)
├── flowMD × IPD app                     ├── flowMD × IPD app
│   ├── OPD: register, consult, rcm    │   ├── OPD (optional)
│   └── IPD: admin, admit, beds        │   └── IPD: admin, admit, beds
├── flowMD Postgres                      ├── flowMD Postgres
│   config_profile, org, patients      │   (same table names)
└── IPD Postgres (Option B)              └── IPD Postgres (Option B)
    config_profile, m1, m2                   (same table names)

Embedded: OPD register → IPD admit (same or linked DB)
Standalone: IPD register → flowMD patients API → IPD admit
```

---

## Related docs

- [flowmd-architecture-option-a-vs-b.md](./flowmd-architecture-option-a-vs-b.md) — detailed Option A vs B
- [flowmd-platform-full-architecture.md](./flowmd-platform-full-architecture.md) — narrative walkthrough
