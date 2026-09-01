# Slice ET-6 — Order deep links

| Field | Value |
|-------|--------|
| **ID** | ET-6 |
| **Depends on** | ET-3 |
| **Technical design refs** | §6 |
| **Tracer** | From the triage form's Orders section, click "Nursing and POC Orders" → lands on the existing `/orders` page pre-filtered/pre-loaded to this encounter, not a blank search |

## Purpose

Smallest, lowest-risk slice — three links, no new order-entry UI (explicitly forbidden by PRD §4/§19: "do not embed order UI in triage," "do not rebuild order UIs").

## In scope

- Confirm (first task of this slice, per technical-design.md §6's flagged open item) whether `/orders` (`src/pages/Orders.tsx`) and `/prescriptions` (`src/pages/Prescriptions.tsx`) currently accept an encounter-context query param. If yes, use it as-is. If no, add the minimal query-param read (e.g. `?encounterId=`) to those two existing pages — this is the only place this slice touches code outside the triage form itself, and it should be a small, additive read of a query param, not a redesign of either page.
- Three links in the triage form's "Orders and procedures" section (PRD §9.3):
  - Nursing and POC Orders → `/orders?encounterId=:id`
  - POC Result Entry → same `/orders` page/route, confirm exact result-entry sub-view during implementation (technical-design.md §6 flagged this as not yet traced to a specific sub-route)
  - Medication Order → `/prescriptions?encounterId=:id`

## Out of scope

- Any order-entry or result-entry UI logic — those pages already exist and already work; this slice only makes them reachable with context pre-filled
- Result data flowing back into the triage record — PRD doesn't ask for this, links are one-way navigation

## Acceptance (slice)

- [ ] All three links present in the triage form, visible in both resuscitation and full-form mode (PRD §10 BR-1 explicitly keeps "Orders links" visible even in resuscitation mode)
- [ ] Clicking each link navigates to the correct existing page with the encounter already in context (verified by the page showing/allowing action against the right patient/encounter without a manual search step)
- [ ] No new order or prescription creation logic was added anywhere — this slice is pure navigation wiring
