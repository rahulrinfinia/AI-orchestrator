# Slices — lab-catalog-fulfillment

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `lab-catalog-fulfillment` |
| **Branch** | `feat/lab-catalog-fulfillment` (from `develop`) |
| **PRD** | [../prd.md](../prd.md) |
| **Technical design** | [../technical-design.md](../technical-design.md) |
| **Related** | [lab-send-out-vendors](../lab-send-out-vendors/slices/README.md) (desk workflows — prerequisite) |
| **G3 status** | **Pending slice approval** |

## Dependency graph

```text
LCF-1  Fulfilment type on enrollment — migration + item master API + Catalog Browser UI
  └── LCF-2  Enrolled-only doctor picker + catalog resolve + order create rules
        └── LCF-3  Vendor guard UX + consultation picker + regression / migration verify
```

Each slice is a **vertical tracer**. LCF-1 is the thinnest path: admin enrolls lab test with **In-house** or **Send-out** → saved on `items_master` → badge visible in Catalog Browser.

## Slice index

| Slice | Spec | Goal |
|-------|------|------|
| LCF-1 | [slice-1.md](./slice-1.md) | DB column + item master API + Catalog Browser enrol/add fulfilment UI |
| LCF-2 | [slice-2.md](./slice-2.md) | Enrolled-only lab picker + fixed `refer_out` resolve + order validation |
| LCF-3 | [slice-3.md](./slice-3.md) | Vendor guard UX, consultation alignment, regression on Laboratory tabs |

## PRD user-story coverage

| US | Slices |
|----|--------|
| US-A1 Choose fulfilment when enrolling | LCF-1 |
| US-A2 Edit fulfilment on enrollment | LCF-1 |
| US-A3 Send-out enrollment + vendor guard | LCF-2, LCF-3 |
| US-B1 Enrolled-only picker | LCF-2 |
| US-B2 Fulfilment badge for doctor | LCF-2 |
| US-B3 Submit uses catalog fulfilment | LCF-2 |
| US-B4 Block unenrolled API attempts | LCF-2 |
| US-C1 Tab routing matches enrollment | LCF-2, LCF-3 |
| US-C2 Regression send-out / in-house desk | LCF-3 |
| US-D1 Migration backfill in_house | LCF-1 |
| US-D2 No silent send-out inference | LCF-2 |

## Architecture decisions (reference only)

| AD | Topic | Primary slice |
|----|-------|---------------|
| AD-1 | `items_master.lab_fulfillment_type` | LCF-1 |
| AD-2 | Map to `FACILITY_AVAILABILITY` | LCF-1, LCF-2 |
| AD-3 | `refer_out` only for explicit send_out | LCF-2 |
| AD-4 | `enrolledOnly` on clinical lab-catalog | LCF-2 |
| AD-5 | 422 `CATALOG_NOT_ENROLLED` | LCF-2 |
| AD-6 | 422 `NO_ACTIVE_LAB_VENDORS` | LCF-2, LCF-3 |
| AD-7 | Snapshot refer_out at create | LCF-2 |
| AD-8 | Migration backfill | LCF-1 |
| AD-9 | Catalog Browser UI | LCF-1 |
| AD-10 | Laboratory desk regression | LCF-3 |

## Out of scope (all slices)

- Radiology fulfilment type
- Hospital `has_in_house_lab` org toggle
- Doctor vendor picker at order time
- New barcode / PDF / vendor master work (lab-send-out-vendors)

## After slice approval

Say **implement slice 1** (or **plan slice 1**) to start LCF-1 in `projects/his-global-south/`.
