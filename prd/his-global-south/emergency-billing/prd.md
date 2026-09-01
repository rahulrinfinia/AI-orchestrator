# PRD: Emergency billing (Option C+)

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature key** | `emergency-billing` |
| **Product** | flowMD |
| **Version** | **2.0 draft** |
| **Date** | 2026-09-01 |
| **Status** | Draft — **Gate G1 pending** (product + finance review) |
| **Related** | [plan.md](./plan.md) · [technical-design.md](./technical-design.md) · [docs-update-checklist.md](./docs-update-checklist.md) |
| **Depends on** | [emergency-triage](../emergency-triage/prd.md) triage save (ET-3+) |
| **Supersedes** | Emergency Triage PRD **AC-14** (“Billing unchanged”) for **emergency encounters only** |

---

## 1. Summary

Auto-post **ED triage**, **ED consultation**, and **ED care-area/bed** charges to the patient **visit bill** using the **same RCM + Catalog Browser model as OPD**. Lab and radiology orders continue via existing `order.created` billing. **No new billing module.** **No hardcoded amounts in code.**

**Option C+:**

1. Nurse **triage save** (first complete) → triage fee + mapped bed fee  
2. ED doctor **sign** → ED consult fee  
3. **Lab / rad orders** → unchanged  
4. **Prescriptions** → unchanged where encounter/billing link exists today  

**Non-negotiable:** All existing **OPD** billing behaviour stays the same. This feature is **additive only**.

---

## 2. Background & problem

Emergency patients complete register → triage → doctor → orders, but revenue capture is incomplete:

| Charge (typical hospital) | System today |
|---------------------------|--------------|
| ED triage / nursing assessment | No auto line on triage save |
| ED doctor consultation | No — consult auto-fee runs for **OPD encounters only** |
| Lab / radiology in ED | Works when order creates billing encounter (`order.created`) |
| Prescription in ED | Partial — depends on existing Rx / encounter linkage |
| ED care area (triage disposition) | Captured clinically (`triage_disposition`); not billed |
| IPD ward bed after admit | Not in scope — separate IPD billing track |

Cashiers can use **Add Charge** on `/billing`, but missing auto-lines and empty receipts make ED collection unreliable.

Clinical **SATS / TEWS** defines acuity and workflow — **not** fee amounts. Prices are set in **Catalog Browser** like `CONSULT-NEW` for OPD.

---

## 3. Goals & success metrics

| Goal | Metric | Target |
|------|--------|--------|
| Triage billable without blocking clinical save | Triage API success when RCM/catalog fails | 100% |
| No duplicate ED fee lines | Idempotent lines per encounter | 0 duplicates in QA |
| Cashier sees ED charges | Visit visible in Charge Capture after first billable event | 100% pilot |
| Bed fee follows triage disposition | Mapped disposition → bed line | 100% when mapped + priced |
| OPD unchanged | OPD sign + lab regression | CI green |
| Amounts from catalog | Line `unit_price` matches STANDARD list | Spot-check pilot |

---

## 4. Personas

| Persona | Needs |
|---------|--------|
| **ED nurse (`ed_nurse`)** | Save triage without billing UI; never blocked by RCM |
| **ED doctor (`ed_doctor`)** | Sign note; consult fee auto-posted |
| **Cashier / biller** | All ED lines on visit bill at `/billing`; render & collect |
| **Hospital finance / `super_admin`** | Enrol ED service codes + STANDARD prices in Catalog Browser |
| **Product / clinical** | SATS reassessment does not silently re-bill (v1) |

---

## 5. Where amounts are set (same as OPD)

| Who | Where | Action |
|-----|--------|--------|
| Hospital admin | **Catalog Browser** `/catalogBrowser` → **Services** | Add/enrol codes; set **Prices per list → STANDARD** |
| Hospital admin | **Price Lists** `/priceLists` | Create list names (`STANDARD`, etc.) — amounts entered in Catalog Browser |
| System | RCM on clinical event | Looks up **code → item_prices**; never hardcodes KES |
| Cashier | `/billing/visits/:visitId` | Collects; may **Add Charge** if UNPRICED |

### Default service codes (finance may rename)

| Code | Posted when |
|------|-------------|
| `TRIAGE-ED` | First triage complete |
| `CONSULT-EMERGENCY` | Emergency encounter signed |
| `BED-ED-CRITICAL` | Critical / ITC critical dispositions (see Appendix A) |
| `BED-ED-STANDARD` | EMC, general ED bays |
| `BED-ED-OBS` | Observation / OBS dispositions |
| `BED-ED-ISOLATION` | Isolation disposition |

Lab/Rx: existing catalog codes via `order.created` / `prescription.created`.

### If price not configured

- Receipt line created with **`unit_price = 0`** and **UNPRICED** note (same as OPD consult)  
- Triage save / doctor sign **never fail** because of billing  

---

## 6. User workflows

### WF-1 — Standard emergency visit

```text
1. Front desk — emergency register + check-in (visit_type = emergency)
2. ED nurse — complete triage; disposition e.g. ITC_CRITICAL_A
        → triage.completed
        → Lines: TRIAGE-ED + BED-ED-CRITICAL (if mapped & priced)
3. ED doctor — orders labs
        → order.created → lab lines (existing)
4. ED doctor — signs encounter
        → encounter.signed (emergency)
        → Line: CONSULT-EMERGENCY
5. Cashier — /billing → visit → all lines on visit (may span multiple receipt records — normal)
        → render → collect payment
```

### WF-2 — P1 resuscitation mode

Nurse saves with Emergency Sign YES (resuscitation banner). Triage fee still posts on save. Bed line follows **disposition code** nurse selects (often critical ITC room), not a separate “resuscitation” pseudo-code.

### WF-3 — Catalog missing

Triage save succeeds. Line posted at **0 / UNPRICED** if code not enrolled. Cashier or admin fixes via Add Charge or Catalog Browser.

### WF-4 — OPD unaffected

OPD visit → sign → `CONSULT-NEW` (or tier) only. No triage or ED bed lines.

---

## 7. Preserve existing behaviour

| Must not change | Emergency addition |
|-----------------|-------------------|
| OPD `encounter.signed` → `CONSULT-*` | Parallel branch for `encounter_type = emergency` |
| `order.created` / `prescription.created` handlers | No edits |
| Catalog Browser existing codes | Add ED codes only |
| `/billing` UI | Same APIs; new lines appear |
| Manual Add Charge | Still available |

Implementation requires **OPD regression tests** before release. Update hub docs per [docs-update-checklist.md](./docs-update-checklist.md).

---

## 8. Scope

### In scope (v1)

- Auto lines for **`encounter_type = emergency`** only  
- **Triage fee** on first `triage_status = complete` (`triage.completed` event)  
- **ED consult fee** on emergency sign  
- **ED bed/care-area fee** from `triage_disposition` (Appendix A mapping)  
- Idempotent lines; non-blocking RCM  
- Demo catalog seed for pilot orgs (should-have)  
- Supersede emergency-triage AC-14 for ED billing only  

### Out of scope (v1)

- IPD ward bed / daily inpatient charges (M8 / ward receipt)  
- Billing UI on triage or consultation screens  
- Reassessment or destination-change re-billing (SATS enhancement → v2)  
- Emergency registration fee at check-in  
- Paediatric ED fee tiers  
- Admin UI for disposition → price mapping (constants/seed in v1)  
- Changes to insurance adjudication rules  

---

## 9. User stories

### US-1 — Triage fee (Must)

**As** finance lead  
**I want** automatic triage fee when ED triage is first completed  
**So that** nursing assessment is billed without manual entry  

**Acceptance:**

- [ ] First triage complete → at most one `TRIAGE-ED` line per encounter  
- [ ] Reassessment / second save → no second triage line (v1)  
- [ ] RCM failure → triage save still succeeds  
- [ ] Missing catalog → line at 0 UNPRICED, not blocked  

### US-2 — ED consult fee (Must)

**As** cashier  
**I want** ED consult fee on emergency sign  
**So that** ED matches OPD automation  

**Acceptance:**

- [ ] Emergency sign → one `CONSULT-EMERGENCY` line  
- [ ] OPD sign → existing `CONSULT-*` only; regression test  
- [ ] Idempotent — no duplicate on re-sign attempt  

### US-3 — ED bed from disposition (Must)

**As** hospital admin  
**I want** bed/care-area fee from triage disposition  
**So that** critical vs EMC vs obs can differ in price  

**Acceptance:**

- [ ] Mapped `triage_disposition` → at most one bed line per encounter  
- [ ] Unmapped disposition → no bed line; triage fee may still apply  
- [ ] Mapping uses Appendix A codes (not generic “resuscitation” labels)  

### US-4 — Cashier visit bill (Must)

**As** biller  
**I want** all ED charges on the visit in Billing  
**So that** I collect in one place  

**Acceptance:**

- [ ] After triage and/or sign, visit appears in Charge Capture with lines  
- [ ] Visit view aggregates lines even if multiple receipt records exist (same as OPD lab + consult)  
- [ ] Manual Add Charge still works  

### US-5 — Catalog seed (Should)

**As** QA  
**I want** demo ED billing codes pre-enrolled  
**So that** I can smoke-test without manual catalog setup  

**Acceptance:**

- [ ] Seed includes ED codes + STANDARD prices for pilot orgs  
- [ ] Appendix A → bed code mapping documented in seed README  

### US-6 — OPD regression (Must)

**As** product owner  
**I want** proof OPD billing unchanged  
**So that** emergency work does not break existing revenue  

**Acceptance:**

- [ ] OPD sign + lab order integration tests pass unchanged  
- [ ] No modification to OPD branch logic except adding emergency `else` branch  

---

## 10. Feature acceptance criteria

| ID | Criteria |
|----|----------|
| AC-EB-1 | ≤1 `TRIAGE-ED` line per emergency encounter |
| AC-EB-2 | ≤1 `CONSULT-EMERGENCY` line on emergency sign |
| AC-EB-3 | ≤1 bed line when disposition maps to `BED-ED-*` |
| AC-EB-4 | OPD consult + lab billing regression pass |
| AC-EB-5 | Clinical save/sign never fail due to billing |
| AC-EB-6 | UNPRICED (0) lines when catalog missing |
| AC-EB-7 | IPD ward bed assign does not trigger ED bed lines |
| AC-EB-8 | Amounts match Catalog Browser STANDARD prices when configured |

---

## 11. Edge cases

| Scenario | Expected |
|----------|----------|
| Provisional emergency patient | Bill allowed; self-pay default if no coverage |
| Doctor signs before triage complete | Consult line only; triage lines when triage completes (if clinical gate allows) |
| Doctor never signs | Triage (+ bed) lines may exist; no consult line |
| Multiple lab orders | One line per test (existing); no extra triage lines |
| Rx without encounter link | No auto Rx line (existing limitation); manual Add Charge |
| Multiple receipts on one visit | Normal (consult vs lab billing encounter); visit UI shows all |
| Visit void | Follow existing RCM void rules |

---

## 12. Integration points

| System | Change |
|--------|--------|
| Emergency triage save | Emit `triage.completed` after first complete (post-commit) |
| Encounter sign | RCM handles emergency consult fee |
| RCM / receipts | New triage handler; extend sign handler |
| Catalog Browser | Admin enrols new service codes (no UI code change required) |
| Billing `/billing` | No required UI change |
| [emergency-triage PRD](../emergency-triage/prd.md) | AC-14 footnote → this PRD |
| [SATS enhancement](../emergency-triage-sats-enhancement/prd.md) | Reassessment billing deferred v2 |

---

## 13. Confirmed decisions

| ID | Decision |
|----|----------|
| D-1 | Option C+ on **visit bill** (same cashier flow as OPD) |
| D-2 | Triage fee: first complete only |
| D-3 | Consult fee: emergency sign |
| D-4 | Bed fee: triage disposition → Appendix A mapping |
| D-5 | Amounts: Catalog Browser STANDARD only |
| D-6 | Additive; OPD untouched |
| D-7 | IPD ward bed: out of scope |
| D-8 | Reassessment re-bill: v2 |

---

## 14. Open items (before G1)

| ID | Item | Owner | Default |
|----|------|-------|---------|
| OI-1 | Final catalog code names | Finance | See §5 |
| OI-2 | Bed fee flat vs daily | Finance | **Flat per visit** v1 |
| OI-3 | Per-disposition price vs grouped `BED-ED-*` | Finance | Grouped codes v1 |
| OI-4 | `receipt_items.source_type` DB constraint | Engineering | Verify in G2 |
| OI-5 | Reassessment billing | Product | v2 |

---

## Appendix A — Triage disposition → bed bill code (v1)

Maps [Emergency Triage Appendix A](../emergency-triage/prd.md#appendix-a--disposition-codes) `triage_disposition` values to catalog service codes. Finance sets **price** in Catalog Browser for each `BED-ED-*` code.

| `triage_disposition` | Suggested bill code |
|----------------------|---------------------|
| `ITC_CRITICAL_A` | `BED-ED-CRITICAL` |
| `ITC_CRITICAL_B` | `BED-ED-CRITICAL` |
| `ITC_SURGICAL_9` | `BED-ED-CRITICAL` |
| `ITC_ROOM_6` | `BED-ED-STANDARD` |
| `ITC_OBS_GYN` | `BED-ED-OBS` |
| `ITC_ISOLATION` | `BED-ED-ISOLATION` |
| `EMC` | `BED-ED-STANDARD` |
| `GENERAL_CLINIC` | *(no bed line — or finance-defined)* |
| Unmapped / future unit UUID | No bed line; triage fee still applies |

**Note:** [Dynamic disposition](../emergency-triage-dynamic-disposition/prd.md) may store **unit id** instead of Appendix A code later — v2 mapping table or admin UI may extend this without changing triage/clinical flow.

---

## Appendix B — OPD vs Emergency billing

| | OPD | Emergency (this PRD) |
|--|-----|----------------------|
| Consult trigger | Doctor sign | Doctor sign |
| Consult code | `CONSULT-NEW` | `CONSULT-EMERGENCY` |
| Triage/intake fee | None | `TRIAGE-ED` on nurse triage save |
| Bed/care area | None | `BED-ED-*` from disposition |
| Lab/rad | `order.created` | Same |
| Rx | `prescription.created` if linked | Same (linking limits apply) |
| Amounts | Catalog Browser | Same |
| Cashier | `/billing` | Same |

---

## Approval (Gate G1)

- [ ] Product  
- [ ] Finance / hospital admin  
- [ ] Engineering (feasibility)  

**Approved by:** _______________  
**Date:** _______________  

Reply **APPROVE PRD** to proceed to [technical-design.md](./technical-design.md) (G2). Do not implement until G1 + G2 + slice approval.
