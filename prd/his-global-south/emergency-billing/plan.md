# Emergency billing — consolidated plan (Option C+)

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `emergency-billing` |
| **Date** | 2026-09-01 |
| **Status** | Draft — **awaiting G1 (PRD) + G2 (design) approval** |
| **Related docs** | [prd.md](./prd.md) · [technical-design.md](./technical-design.md) · [docs-update-checklist.md](./docs-update-checklist.md) · [slices/](./slices/) · [ticket.md](./ticket.md) |

This document is the **single end-to-end plan** from product discussion — how emergency charges work, where amounts are set, who triggers what, and how we build it **using the same RCM + Catalog Browser model as OPD**.

---

## 1. Executive summary

**Problem:** Emergency patients get full clinical care (register → triage → doctor → orders) but **auto-billing is missing** for triage, ED consult, and ED bed/care area. OPD consult auto-fees only run for `encounter_type = opd`, so emergency sign adds nothing.

**Solution (Option C+):** Extend the **existing event-driven RCM pipeline** — no new billing module, no amounts in code. Hospital sets prices in **Catalog Browser** (same as `CONSULT-NEW` for OPD). System posts receipt lines on:

1. **Nurse triage save** → triage fee + ED bed fee  
2. **ED doctor sign** → ED consult fee  
3. **Lab / Rx orders** → unchanged (`order.created` / `prescription.created`)

**Out of scope:** IPD ward bed daily charges (ward receipt / M8 — separate track).

**Supersedes:** Emergency Triage PRD AC-14 “Billing unchanged” for emergency encounters only.

### Non-negotiable: preserve existing behaviour

**Keep everything that works today exactly as-is** for OPD and shared modules:

- OPD `encounter.signed` → `CONSULT-NEW` (or tier) — **same code path, same handler branch**
- `order.created` / `prescription.created` / manual Add Charge — **no changes**
- Catalog Browser enrol/pricing UI — **additive only** (new ED service codes; do not alter existing codes)
- `/billing` UI — **no required changes** (lines appear from existing receipt API)
- Emergency triage clinical form/API — billing is **async post-commit**; save must not depend on RCM

Emergency billing is **additive**: new event `triage.completed`, new `encounter.signed` branch for `encounter_type = emergency` only.

**Documentation:** Update hub PRDs and slice status as you implement — see [docs-update-checklist.md](./docs-update-checklist.md).

---

## 2. How OPD works today (reference model)

Emergency billing **copies this pattern** — different codes and events, same machinery.

### Where hospital sets OPD amounts

| Who | Where | What |
|-----|--------|------|
| Hospital admin | **Catalog Browser** `/catalogBrowser` | Enroll services / labs / meds |
| | **Services tab** | Code e.g. `CONSULT-NEW` |
| | **Prices per list → STANDARD** | e.g. 1500 KES |
| | **Price Lists** `/priceLists` | Create list names only; amounts live in Catalog Browser |

### When OPD amounts hit the receipt

| Clinical action | Event | Service code | Amount from |
|-----------------|-------|--------------|-------------|
| Doctor **signs** OPD note | `encounter.signed` | `CONSULT-NEW` | Catalog STANDARD price |
| Doctor **orders lab** | `order.created` | `LAB-FBC`, etc. | Catalog lab price |
| Doctor **writes Rx** | `prescription.created` | medicine code | Catalog med price |
| Check-in / intake | — | — | **No auto charge** |

Cashier collects at **`/billing/visits/:visitId`** — does not type clinical amounts.

### If price not configured

- Receipt line still created with **`unit_price = 0`**
- Note: **⚠ UNPRICED — charge manually**
- Clinical flow **never blocked**

---

## 3. Emergency plan (Option C+) — mirror OPD

### 3.1 Catalog Browser setup (admin — before go-live)

**Sidebar → Organization → Catalog Browser → Services**

| Service code | Purpose | Example STANDARD price |
|--------------|---------|------------------------|
| `TRIAGE-ED` | Nurse triage assessment | 500 (hospital decides) |
| `CONSULT-EMERGENCY` | ED doctor consultation | 2000 |
| `BED-ED-STANDARD` | General ED bay / care area | 1000 |
| `BED-ED-RESUS` | Resuscitation bay | 1500 |
| `BED-ED-OBS` | Observation area (optional) | 1200 |

Lab tests: **unchanged** — enroll in **Lab tests** tab (same as OPD).

**No developer hardcodes KES amounts** — only codes in constants; prices in `item_prices`.

### 3.2 Who triggers what

| Role | Action | Billing trigger | Receipt lines |
|------|--------|-----------------|---------------|
| **Registrar** | Emergency register + check-in | None (v1) | — |
| **ED nurse (`ed_nurse`)** | **Complete triage form → Save** | `triage.completed` | `TRIAGE-ED` + `BED-ED-*` (if mapped) |
| **ED doctor** | Assess, order labs/Rx | `order.created` / `prescription.created` | Test / med lines (existing) |
| **ED doctor** | **Sign encounter** | `encounter.signed` (emergency branch) | `CONSULT-EMERGENCY` |
| **Cashier / biller** | `/billing` → visit | — | Render + collect payment |

**Nurse triage Save is the billing trigger for triage + bed** — not doctor, not cashier.

### 3.3 End-to-end emergency visit (with amounts)

```text
1. Emergency register + check-in
      → visit (emergency), encounter (triage pending)
      → receipt: empty

2. Nurse completes triage (signs, TEWS, disposition = e.g. Resuscitation)
      → clinical: emergency_triage_records + triage_status=complete
      → event: triage.completed
      → receipt lines:
           TRIAGE-ED        500   (from Catalog Browser)
           BED-ED-RESUS    1500   (destination → code map)

3. Doctor orders HIV VL + CD4
      → order.created (×2)
      → receipt lines: LAB-HIV-VL, LAB-CD4 (catalog lab prices)

4. Doctor signs note
      → encounter.signed
      → receipt line: CONSULT-EMERGENCY  2000

5. Cashier opens /billing/visits/:visitId
      → sees all lines (even if some were 0 / UNPRICED)
      → collect payment
```

### 3.4 What gets stored

| Layer | Stored when nurse saves triage |
|-------|--------------------------------|
| **Clinical** | `emergency_triage_records`, encounter triage fields |
| **Event bus** | `triage.completed` payload (encounterId, visitId, disposition, triagedBy, …) |
| **Billing** | `receipt_items` rows (source_type `emergency_triage`, `emergency_triage_bed`) |
| **Audit** | Optional log if price missing; clinical save always succeeds |

**Amount 0 lines are still stored** — same as OPD `CONSULT-NEW` when unpriced.

---

## 4. Technical approach (same as OPD RCM)

```text
Clinical API commits
  → serverEventBus.emit(...)
  → rcm/shared/handlers.ts (or emergencyBilling/handlers.ts)
  → resolveCatalogItemPrice(orgId, code)   // items_master + item_prices
  → addReceiptItem({ unitPrice, quantity: 1 })
  → adjudicateReceiptLine()                // insurance / copay split
  → recalculateReceiptTotals()
```

### New vs extended

| Piece | Change |
|-------|--------|
| Event `triage.completed` | **New** — emit after first triage save |
| RCM handler for triage | **New** — `TRIAGE-ED` + `BED-ED-*` |
| `encounter.signed` handler | **Extend** — emergency branch → `CONSULT-EMERGENCY` (today skips non-OPD) |
| `order.created` | **No change** |
| Catalog Browser UI | **No change** — admin adds new service codes |
| Billing UI | **No change** — lines appear on visit receipt |

### Idempotency (no double billing)

| Line | source_type | source_id | Rule |
|------|-------------|-----------|------|
| Triage fee | `emergency_triage` | encounterId | Once per encounter |
| ED bed fee | `emergency_triage_bed` | encounterId | Once per encounter |
| ED consult | `encounter` | encounterId | Once per encounter (existing pattern) |

**SATS reassessment (v1):** does **not** re-emit `triage.completed` → no second triage fee.

### ED bed code mapping (v1)

Uses **Emergency Triage Appendix A** `triage_disposition` codes — see [prd.md Appendix A](./prd.md#appendix-a--triage-disposition--bed-bill-code-v1).

```text
ITC_CRITICAL_* / ITC_SURGICAL_9  → BED-ED-CRITICAL
ITC_ROOM_6 / EMC                 → BED-ED-STANDARD
ITC_OBS_GYN                      → BED-ED-OBS
ITC_ISOLATION                    → BED-ED-ISOLATION
GENERAL_CLINIC / unmapped        → no bed line (triage fee may still apply)
```

Dynamic disposition (unit UUID) → extend mapping in v2.

---

## 5. Explicitly out of scope

| Item | Why |
|------|-----|
| IPD ward bed / daily inpatient charge | Ward receipt slice 7 / M8 — different module |
| Billing fields on triage form | Cashier stays on `/billing` |
| Reassessment re-billing | v2 product rule |
| Hardcoded amounts in backend | Finance owns Catalog Browser prices |
| SATS clinical changes | TEWS/priority unchanged |

---

## 6. Implementation slices

| Slice | Deliverable | Tracer |
|-------|-------------|--------|
| **EB-1** | `triage.completed` event after nurse triage save | Event emitted; triage save still works |
| **EB-2** | `TRIAGE-ED` receipt line (priced or UNPRICED at 0) | Nurse save → line on receipt |
| **EB-3** | `CONSULT-EMERGENCY` on emergency sign; OPD regression | ED sign → consult line; OPD unchanged |
| **EB-4** | `BED-ED-*` from triage destination | Resus vs standard bed lines |
| **EB-5** | Demo catalog seed + integration smoke + doc AC-14 update | QA hospital can demo full path |

**Build order:** EB-1 → EB-2 → EB-4 (same handler) and EB-3 in parallel after EB-1.

**Implement in:** `projects/his-global-south/` only after slice **Approval** filled.

Details: [slices/README.md](./slices/README.md) · [slices/slice-1.md](./slices/slice-1.md) … slice-5.

---

## 7. Acceptance criteria (release)

| ID | Criteria |
|----|----------|
| AC-EB-1 | First triage complete adds ≤1 `TRIAGE-ED` line per encounter |
| AC-EB-2 | Emergency sign adds ≤1 `CONSULT-EMERGENCY` line |
| AC-EB-3 | Mapped triage destination adds ≤1 ED bed line |
| AC-EB-4 | OPD `CONSULT-NEW` on sign unchanged |
| AC-EB-5 | Triage save / sign never fail due to billing |
| AC-EB-6 | UNPRICED (0) lines created when catalog missing |
| AC-EB-7 | IPD ward bed assign does not trigger ED bed lines |
| AC-EB-8 | Amounts match Catalog Browser STANDARD prices |

---

## 8. Validation (same as CI)

| Changed | Run |
|---------|-----|
| `backend/**` | `npm run build` + RCM integration tests |
| `src/**` (if any) | `npm run lint` + `npx tsc -b` |

---

## 9. Approval gates

| Gate | Owner | Action |
|------|-------|--------|
| **G1** | Product + finance | Approve [prd.md](./prd.md) — code names, flat vs daily bed fee |
| **G2** | Engineering | Approve [technical-design.md](./technical-design.md) |
| **G3** | Per slice | Fill **Approval** in slice spec before implement |

---

## 10. Open decisions (confirm before G1)

| # | Question | Proposed default |
|---|----------|------------------|
| 1 | Bed fee v1: flat per visit or daily? | **Flat per visit** |
| 2 | Catalog code names OK? | `TRIAGE-ED`, `CONSULT-EMERGENCY`, `BED-ED-*` |
| 3 | Demo ED unit → bed code mapping | Document in EB-5 seed |
| 4 | Reassessment billing | **No** in v1 |

---

## 11. OPD vs Emergency quick comparison

| | OPD | Emergency (after this plan) |
|--|-----|----------------------------|
| Consult fee trigger | Doctor sign | Doctor sign |
| Consult code | `CONSULT-NEW` | `CONSULT-EMERGENCY` |
| Triage fee | N/A (intake not billed) | Nurse triage save → `TRIAGE-ED` |
| Bed fee | N/A | Nurse triage destination → `BED-ED-*` |
| Lab/Rx | order / Rx events | Same |
| Where amounts set | Catalog Browser | **Same** Catalog Browser |
| Where cashier collects | `/billing` | **Same** `/billing` |

---

## 12. Next steps

1. Review this plan + [prd.md](./prd.md) with product/finance  
2. Reply **APPROVE PRD** (G1) and **APPROVE DESIGN** (G2)  
3. Approve **EB-1** slice spec → implement in `projects/his-global-south/`  
4. EB-2 → EB-5 sequentially (EB-3 parallel after EB-1)

No git commit/push unless explicitly requested.
