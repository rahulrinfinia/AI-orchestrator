# Slices — lab-send-out-vendors

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `lab-send-out-vendors` |
| **Branch** | `feat/lab-send-out-vendors` (from `develop`) |
| **PRD** | [../prd.md](../prd.md) |
| **Technical design** | [../technical-design.md](../technical-design.md) |
| **G3 status** | **LSO-1 approved** — implement plan ready |

## Dependency graph

```text
LSO-1  Lab vendor master — API + super_admin UI
  └── LSO-2  Vendor on send-out orders + tracker status + migration (order items)
        └── LSO-3  Barcode generate / print / lookup
              └── LSO-4  PDF report upload + history + viewer
```

Each slice is a **vertical tracer**. LSO-1 is the thinnest path: `super_admin` → Org setup → Lab vendors → add vendor → vendor appears in list (API + UI).

## Slice index

| Slice | Spec | Plan | Goal |
|-------|------|------|------|
| LSO-1 | [slice-1.md](./slice-1.md) | [lso-1 plan](../../../../specs/features/his-global-south/lab-send-out-vendors-lso-1-vendor-master.md) | Lab vendor CRUD API + org-setup UI (`super_admin` writes) |
| LSO-2 | [slice-2.md](./slice-2.md) | [lso-2 plan](../../../../specs/features/his-global-south/lab-send-out-vendors-lso-2-send-out-orders.md) | Assign vendor on send-out orders + tracker badges/status |
| LSO-3 | [slice-3.md](./slice-3.md) | — | Specimen barcode generate, print requisition, scan lookup |
| LSO-4 | [slice-4.md](./slice-4.md) | — | PDF report upload, document history, tracker viewer |

## PRD user-story coverage

| US | Slices |
|----|--------|
| US-A1 Super admin creates lab vendor | LSO-1 |
| US-A2 List and deactivate vendors | LSO-1 |
| US-B1 Assign vendor on send-out line | LSO-2 |
| US-B2 Send-out status pipeline | LSO-2 |
| US-C1 Generate and print barcode | LSO-3 |
| US-D1 Upload vendor report PDF | LSO-4 |
| US-E Vendor portal | **Out of scope** (future slice 5 if approved) |

## Architecture decisions (reference only — do not re-decide)

| AD | Topic | Primary slice |
|----|-------|---------------|
| AD-1 | Extend clinical orders + providerMaster | All |
| AD-2 | Reuse `contracted_organizations` | LSO-1 |
| AD-3 | Item-level `send_out_status` | LSO-2 |
| AD-4 | `super_admin` gate on vendor writes | LSO-1 |
| AD-5 | Vendor required at order submit | LSO-2 |
| AD-6 | Barcode format | LSO-3 |
| AD-7 | PDF via uploads + junction table | LSO-4 |
| AD-8 | Backend joins vendor fields on list/detail | LSO-2 |
| AD-9–AD-15 | Schemas, errors, pagination, audit, org validation | All (see TD §9) |

## Out of scope (all slices)

- Vendor self-service portal
- HL7/FHIR lab interfaces
- Email inbox parsing
- flowMD `platform_admin` managing hospital vendors
- Global shared vendor catalogue
- Full LIS (specimen storage, QC, analyser interfaces)
- Hospital `has_in_house_lab` org toggle (deferred post–LSO-2)
- RCM / vendor billing settlement

## Coding rules

Every slice must satisfy [technical-design.md §9](../technical-design.md#9-coding-rules-compliance-matrix) before marking done. CI: frontend `npm run lint` + `npx tsc -b`; backend `npm run build` + relevant tests.

## After LSO-1 approval

LSO-1 is approved. Say **implement slice 1** to code in `projects/his-global-south/` on branch `feat/lab-send-out-vendors`.
