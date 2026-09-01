# Intake — Lab send-out vendors (outsourced laboratories)

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature key** | `lab-send-out-vendors` |
| **Requested by** | Rahul |
| **Date** | 2026-08-31 |
| **Target repo** | `apeiro-care/his-global-south` @ `develop` |
| **Domain** | Clinical orders / lab tracker + platform contracted organizations |

---

## Summary

Hospitals without in-house labs need to **send tests to outside vendors**, print **barcodes/requisitions**, and **upload PDF reports** when results return. **Hospital `super_admin`** maintains the vendor list per tenant.

Extends existing **diagnostic orders** and **`contracted_organizations`** (`org_type = laboratory`) — not a new LIS module.

---

## Acceptance criteria (intake)

- [ ] Super admin can add/edit/deactivate outsourced lab vendors for their hospital.
- [ ] Required vendor fields: name, code, (phone OR email), address line 1 + city.
- [ ] Send-out lab orders require vendor selection; tracker shows outsourced status.
- [ ] Barcode + requisition print for send-out samples.
- [ ] PDF report upload linked to order item.
- [ ] Platform admin does **not** manage hospital vendor lists.

---

## PRD & design

| Doc | Link |
|-----|------|
| PRD | [prd.md](./prd.md) |
| Technical design | [technical-design.md](./technical-design.md) |
| Slices | [slices/README.md](./slices/README.md) |
