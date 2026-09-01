---
name: decompose-slices
description: Breaks an approved PRD and technical design into vertical tracer-bullet slices under prd/<project>/slices/. Use after technical design is approved, before plan-slice or implement.
---

# Decompose Slices

## Inputs

- `prd/<project>/prd.md`
- `prd/<project>/technical-design.md`

## Rules (tracer bullet)

1. **Slice 1** — thinnest end-to-end path: UI → API → DB in `projects/<name>/`
2. Each later slice adds depth to a **working** system
3. No horizontal slices ("all backend endpoints" with no UI)
4. Do not re-decide architecture — reference AD-N from technical design only

## Outputs

- `prd/<project>/slices/README.md` — overview, dependency graph, US coverage matrix
- `prd/<project>/slices/slice-N.md` — per slice (purpose, AC, endpoints, scope boundaries)
- Update `prd/<project>/slices/status.yaml` from `docs/templates/slices-status.yaml`

## After

Ask user **APPROVE SLICES** before any plan-slice work.
