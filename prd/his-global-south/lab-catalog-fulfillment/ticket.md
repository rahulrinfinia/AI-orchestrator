# Ticket: Lab catalog fulfillment — in-house vs send-out enrollment

| Field | Value |
|-------|--------|
| **Project** | his-global-south |
| **Feature** | lab-catalog-fulfillment |
| **PRD** | [prd.md](./prd.md) |
| **Technical design** | [technical-design.md](./technical-design.md) |
| **Slices** | [slices/README.md](./slices/README.md) |
| **Branch** | `feat/lab-catalog-fulfillment` |
| **Depends on** | `lab-send-out-vendors` desk workflows (Laboratory tabs) |

## Summary

Hospital admins explicitly mark lab tests as **In-house** or **Send-out** when enrolling in Catalog Browser. Doctors order **enrolled tests only**. Backend sets `refer_out` from enrollment — not from “missing catalog” inference. Laboratory desk tabs route orders to the correct workflow.

## Slice delivery order

1. **LCF-1** — `items_master.lab_fulfillment_type` + Catalog Browser UI
2. **LCF-2** — Enrolled-only doctor picker + order create validation
3. **LCF-3** — Vendor guard UX + consultation picker + regression

## Definition of done (feature)

- [ ] All three slices merged to `develop`
- [ ] Migration applied; existing enrollments `in_house`
- [ ] No order creates with unenrolled catalog lines
- [ ] Send-out orders only when enrollment = send_out
- [ ] CI green (lint, tsc, backend build, relevant tests)
