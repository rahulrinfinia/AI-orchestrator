---
name: decompose-slices
description: Breaks an approved PRD and technical design into vertical tracer-bullet slices for a modular monolith. Use when decomposing a feature, creating slice plans, or after technical-design approval.
---

# Decompose Slices

Input: `prd/<project>/prd.md` + `technical-design.md`  
Output: `prd/<project>/slices/README.md`, `slice-N.md`, `status.yaml`

## Rules

- **Vertical slices** — each delivers user-visible value UI + API + DB together.
- **Slice 1 = tracer bullet** — thinnest working path through all layers.
- **No new architecture** — only sizing and sequencing from existing AD-N.
- **Bad:** "all backend endpoints" with no UI.

## Process

1. Read PRD user stories and technical design dependency graph.
2. Identify tracer bullet: simplest workflow that proves stack.
3. Build slices 2+ as incremental depth on working system.
4. Write `slices/README.md` with:
   - Overview table (title, builds-on, user capability after slice)
   - User story progress matrix
   - Mermaid dependency graph
   - Critical path + parallelization notes
   - PRD coverage check
5. Write each `slice-N.md` with: purpose, US addressed, AC for slice, endpoints/components, scope boundaries, dependencies.
6. Initialize `slices/status.yaml` from `docs/templates/slices-status.yaml`.

## Slice file template

See platform-workspace `decompose.md` output format. Each slice must reference AD-N and modules from technical design.

**STOP after writing.** User approves before any plan-slice or implement.
