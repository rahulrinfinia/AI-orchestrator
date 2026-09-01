# PRD: Lab catalog fulfillment — in-house vs send-out enrollment

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `lab-catalog-fulfillment` |
| **Version** | 1.0 draft |
| **Date** | 2026-08-31 |
| **Status** | Approved — **Gate G1 passed** (2026-08-31) |
| **Related** | [`lab-send-out-vendors`](../lab-send-out-vendors/prd.md) (vendor master, Laboratory desk workflows, barcode, PDF intake) |

---

## Background & Problem

Hospitals configure which lab tests they offer through **Catalog Browser** (enrollment into the org catalog with prices). Clinicians order tests from the **Orders → Laboratory** flow. Lab desk staff fulfil orders on the **Laboratory** page, which now has separate **In-house** and **Send-out** tabs and workflows (built under `lab-send-out-vendors`).

### Problem today

1. **Enrollment does not express fulfilment intent.** Adding a lab test in Catalog Browser enrolls it in the hospital catalog but does not let the hospital say **“we run this in-house”** vs **“we always send this to an external lab.”**

2. **Doctors see too much of the catalog.** The lab order picker can surface tests from the broader lab test catalogue that the hospital has **not** enrolled. That contradicts operational reality: if the hospital never configured a test, staff should not be ordering it.

3. **`refer_out` is inferred incorrectly.** Backend logic can treat **“not enrolled”** as send-out (`refer_out = true`). That is not the intended rule. Send-out should mean the hospital **explicitly configured** the test as external — not “we forgot to add it.”

4. **POC is conflated with send-out.** Point-of-care (POC) tests are a **test category** (bedside / ward-side), not the same as outsourced laboratory fulfilment. They must not be auto-classified as send-out because of enrollment gaps.

### What we are fixing (product intent)

```text
Catalog Browser (hospital admin)
  → Add / enroll lab test
  → Choose fulfilment: In-house  OR  Send-out (external)
  → Set prices as today

Doctor
  → Orders → Laboratory
  → Sees ONLY tests the hospital enrolled (with clear in-house vs send-out indicator)
  → Does NOT pick vendor or send-out flag (lab desk handles vendor assignment)

Lab desk (Laboratory page)
  → In-house tab: collect → receive → process → enter results
  → Send-out tab: assign vendor → print → mark sent → awaiting report → upload PDF
```

This PRD defines **catalog and ordering policy**. It does **not** re-specify vendor master, barcode, or PDF upload (covered by `lab-send-out-vendors`).

---

## Confirmed product decisions

| Decision | Answer |
|----------|--------|
| **Who configures fulfilment type?** | Hospital admin via **Catalog Browser** when enrolling (or editing) a lab test. |
| **Fulfilment types (v1)** | **`in_house`** and **`send_out`** (external). |
| **Doctor order picker scope** | **Enrolled lab tests only** for this hospital. No ordering of tests the hospital has not configured. |
| **Doctor sends out at order time?** | **No.** Doctor selects tests only. `refer_out` is derived from catalog enrollment. Vendor assignment stays at **lab desk** (existing send-out workflow). |
| **“Not enrolled” means** | **Not orderable** — not “defaults to send-out.” |
| **POC tests** | Remain a **catalog category** (`point_of_care`). Enrollment + fulfilment rules apply the same way: hospital must enroll; fulfilment type is explicit. POC ≠ automatic send-out. |
| **National / global catalogue browse** | Admin may still **browse** national entries to enroll; clinicians do not order directly from the unenrolled national list. |
| **Existing open orders** | Unaffected. Policy applies to **new** orders after rollout. |

---

## Goals & Success Metrics

| Goal | Metric | Target |
|------|--------|--------|
| Hospitals explicitly mark external tests | % enrolled lab tests with fulfilment type set | 100% at enroll time |
| Doctors only order configured tests | Orders with unenrolled catalog lines | 0 (422 or hidden in UI) |
| Send-out routing is intentional | Send-out orders where test enrollment = `send_out` | 100% (no “not enrolled” inference) |
| Lab desk tabs match catalog | Mismatch between enrollment type and Laboratory tab | 0 in pilot tracer |
| Admin clarity | CSAT / UAT: “I understand why a test landed in send-out” | Pass in hospital UAT |

---

## Personas

| Persona | Role | Needs |
|---------|------|--------|
| **Hospital catalog admin** | `super_admin` / `provider_admin` | Enroll lab tests; mark in-house vs send-out; price lists |
| **Doctor** | `doctor` | Order only from hospital menu; see whether test is in-house or external (informational) |
| **Lab desk** | lab staff | Receive correctly routed orders on In-house vs Send-out tabs |
| **Platform admin** | `platform_admin` | No change — does not set per-hospital fulfilment |

---

## User workflows

### WF-1 — Enroll in-house lab test (catalog admin)

1. Admin opens **Catalog Browser → Lab tests**.
2. Admin finds or creates a test (from national catalogue or custom).
3. Admin enrolls the test and sets **Fulfilment: In-house**.
4. Admin sets prices on required price lists (unchanged).
5. Test appears in doctor lab picker with **In-house** indicator.

**Result:** When ordered, line is **`refer_out = false`** → **Laboratory → In-house** tab.

### WF-2 — Enroll send-out (external) lab test (catalog admin)

1. Admin opens **Catalog Browser → Lab tests**.
2. Admin enrolls a test (e.g. specialised assay not run on site).
3. Admin sets **Fulfilment: Send-out (external)**.
4. Admin sets prices (unchanged).
5. Hospital must have **at least one active lab vendor** configured (existing vendor master) before send-out tests can be ordered — or doctor sees clear block message.

**Result:** When ordered, line is **`refer_out = true`**, **`send_out_status = pending_collection`**, **no vendor at order time** → **Laboratory → Send-out** tab → lab desk assigns vendor.

### WF-3 — Doctor orders lab tests

1. Doctor opens **Orders → Laboratory → New order**.
2. Picker lists **only enrolled** tests for this hospital.
3. Each row shows name, specimen, category (Panel / Individual / **POC**), and badge **In-house** or **Send-out**.
4. Doctor selects tests, indication, priority — **no vendor, no send-out checkbox**.
5. Order submits.

**Result:** Backend sets `refer_out` per enrolled fulfilment type. Mixed orders (in-house + send-out lines) allowed; each line routes to the correct Laboratory tab.

### WF-4 — Change fulfilment type (admin)

1. Admin edits enrolled lab test in Catalog Browser.
2. Admin changes fulfilment from In-house → Send-out or reverse.
3. **Open orders** keep fulfilment at time of order (no retroactive change).
4. **New orders** use updated type.

### WF-5 — POC test (explicit enrollment)

1. Admin enrolls a **point_of_care** category test with fulfilment **In-house** (typical: done at bedside/nursing station).
2. Doctor orders it from picker like any other enrolled test.
3. Fulfilment follows enrolled type — POC is **not** treated as send-out unless admin marked it send-out.

---

## User stories & acceptance criteria

### Epic A — Catalog Browser fulfilment type

**US-A1 — Choose fulfilment when enrolling lab test**

- [ ] Enroll / Add lab test flow includes required field **Fulfilment type**: `In-house` | `Send-out (external)`.
- [ ] Default for new enrollment: **`In-house`** (hospital must opt in to send-out).
- [ ] Saved enrolment persists fulfilment type and is visible when editing the enrolled row.
- [ ] List view shows fulfilment badge (In-house / Send-out) on enrolled lab rows.

**US-A2 — Edit fulfilment on existing enrollment**

- [ ] Admin can change fulfilment type on an active enrolled test.
- [ ] Deactivating enrollment removes test from doctor picker (unchanged behaviour if already supported).

**US-A3 — Send-out enrollment requires vendor capability**

- [ ] If hospital has **zero active lab vendors**, enrolling send-out tests is **allowed**, but ordering them is **blocked** with message: *“Add an outsourced lab vendor before ordering send-out tests.”*
- [ ] If at least one active vendor exists, send-out tests are orderable.

### Epic B — Doctor lab order picker

**US-B1 — Enrolled-only picker**

- [ ] Lab order picker shows **only** lab tests enrolled for the current hospital.
- [ ] Tests present in national catalogue but **not enrolled** do **not** appear.
- [ ] Search within picker returns enrolled matches only.

**US-B2 — Fulfilment visible to doctor (read-only)**

- [ ] Each picker row shows **In-house** or **Send-out** badge (informational).
- [ ] Doctor cannot change fulfilment or select vendor at order time.

**US-B3 — Submit uses catalog fulfilment**

- [ ] On submit, each line’s `refer_out` matches enrolled fulfilment type (`in_house` → false, `send_out` → true).
- [ ] **No** line becomes send-out solely because enrollment is missing (that case cannot occur in picker).

**US-B4 — Block unenrolled order attempts**

- [ ] API rejects order lines referencing catalog IDs not enrolled for the org (422 with clear code/message).
- [ ] Free-text test names without catalog enrollment remain **out of scope** or **blocked** (see open questions).

### Epic C — Laboratory desk routing (alignment)

**US-C1 — Tab routing matches enrollment**

- [ ] Orders with all lines in-house appear on **In-house** tab only.
- [ ] Orders with any send-out line appear on **Send-out** tab (line-level or order-level display per existing tracker design).
- [ ] No in-house pipeline shown for send-out lines; no send-out actions on in-house lines.

**US-C2 — Regression on existing send-out workflow**

- [ ] Send-out lines still: assign vendor → print → mark sent → awaiting report → upload PDF (per `lab-send-out-vendors` PRD).
- [ ] In-house lines still: collect → receive → process → enter results → verify (per current Laboratory in-house workflow).

### Epic D — Data migration & rollout

**US-D1 — Existing enrollments**

- [ ] All existing enrolled lab tests backfilled to **`in_house`** unless product identifies explicit send-out list with hospital.
- [ ] Unenrolled catalogue entries are **not** backfilled (they were never valid for intentional send-out).

**US-D2 — No silent send-out inference**

- [ ] Remove behaviour where **`not_offered` / not enrolled** automatically sets `refer_out = true` on order create.

---

## In scope

- Fulfilment type on **lab test enrollment** (Catalog Browser add/edit/enroll).
- **Enrolled-only** doctor lab order picker with fulfilment badges.
- Server-side **`refer_out` resolution from enrollment** (not from clinician wire input, not from “not enrolled”).
- Validation blocking orders for unenrolled catalog lines.
- Alignment with existing **Laboratory In-house / Send-out** tabs and desk workflows.
- Migration default: existing enrollments → in-house.

## Out of scope (v1)

- Changing radiology enrollment (separate PRD if needed).
- Doctor selecting vendor at order time.
- Auto-suggest send-out from national catalogue without admin enrollment.
- Hospital-level **“we have no in-house lab”** org toggle (may default new enrollments to send-out in v2).
- LIS analyser interfaces, HL7, vendor portal.
- Re-pricing or plan-benefit logic changes beyond displaying fulfilment on enrolled rows.

---

## Edge cases & permissions

| Scenario | Expected behaviour |
|----------|-------------------|
| Hospital enrolls test as send-out, no vendors | Picker may show test; **submit blocked** with vendor message |
| Mixed order (FBC in-house + GeneXpert send-out) | Allowed; lines route to respective tabs/actions |
| Admin changes fulfilment after orders placed | Open orders unchanged; new orders use new type |
| POC test enrolled in-house | Doctor orders; **In-house** tab (or nursing POC workflow if product adds later — not send-out by default) |
| Admin deactivates enrolled test | Removed from picker; existing open orders unchanged |
| Doctor API tamper (`refer_out: true` on in-house enrollment) | Server ignores wire flag; uses enrollment |
| Order line catalog ID from another org | 422 not found / not enrolled |
| National catalogue browse (admin) | Can enroll with fulfilment; not orderable until enrolled |

| Role | Configure fulfilment | Order lab tests | Lab desk workflows |
|------|---------------------|-----------------|-------------------|
| `super_admin` / catalog admin | Yes | Yes | Yes |
| `doctor` | No | Yes (enrolled only) | No |
| Lab desk | No | No | Yes |
| `platform_admin` | No | No | No |

---

## Relationship to `lab-send-out-vendors`

| Area | `lab-send-out-vendors` | This PRD (`lab-catalog-fulfillment`) |
|------|------------------------|--------------------------------------|
| Vendor master | ✅ Specified | Uses existing |
| Laboratory tabs & desk actions | ✅ Built | Must align routing |
| Barcode / PDF | ✅ Specified | Unchanged |
| **Why a test is send-out** | Implicit / broken | **Explicit at enrollment** |
| **Doctor picker scope** | Not specified | **Enrolled only** |
| **POC vs send-out** | Not specified | **Clarified** |

---

## Dependencies

- Catalog Browser lab enroll flows (existing).
- Clinical diagnostic orders create + catalog resolve (existing).
- Laboratory page In-house / Send-out tabs (implemented).
- Lab vendor master for send-out fulfilment (existing PRD).
- Org-scoped auth (unchanged).

---

## Open questions (Gate G1)

| # | Question | Default if no answer |
|---|----------|----------------------|
| 1 | Allow free-text lab test on order without `catalog_id`? | **No** — require enrolled catalog line in v1 |
| 2 | Default fulfilment for **new** enrollments when hospital has no in-house lab? | **`in_house`**; hospital admin must mark send-out explicitly |
| 3 | Show send-out tests in picker when zero vendors (disabled vs hidden)? | **Show disabled** with tooltip explaining vendor setup |
| 4 | Mixed-order display: one order on both tabs or split by line? | **Line appears on correct tab** (current tracker behaviour) |
| 5 | Can one catalog test change from in-house to send-out while specimens in lab? | **New orders only**; in-flight uses type at order time |

---

## Approval

| Role | Name | Date | Status |
|------|------|------|--------|
| Product | | 2026-08-31 | Approved |
| Engineering | | 2026-08-31 | Pending (design review) |

Reply **APPROVE DESIGN** after [technical-design.md](./technical-design.md) review, then **APPROVE SLICES** before implement.
