---
name: feature-orchestrator
description: Runs the full AI delivery pipeline for a cloned modular-monolith project with mandatory human approval gates. Use when the user provides Jira, Figma, or a feature request for a project under projects/, or asks to run the orchestrator, start a PRD, or deliver a feature slice-by-slice.
---

# Feature Orchestrator

Central workflow for this hub. Code changes only in `projects/<name>/`; plans in `prd/` and `specs/`.

## Hard rules

1. **Never implement without approval** — plan/PRD must include checked `## Approval` from `docs/templates/approval.md`.
2. **Stop after each phase** — wait for user to say proceed or approve.
3. **Tracer bullet** — slice 1 is thinnest end-to-end (UI → API → DB).
4. **One slice ≈ one PR** in the cloned repo.
5. Read `docs/conventions/modular-monolith-fastify-react.md` for app structure.

## Phases

Run in order. Stop at each gate.

### Phase 0 — Verify project

- Read `repos.yaml` and confirm `projects/<name>/` exists (or tell user to run `scripts/setup.ps1`).
- Create `prd/<name>/design/` for Figma links and screenshots.

### Phase 1 — Intake

- Write `prd/<name>/ticket.md` from Jira/Figma/user input.
- List acceptance criteria checklist.

**STOP.** Ask user to confirm intake before PRD.

### Phase 2 — PRD (Gate G1)

- Read `docs/architecture.md`, `docs/services/<name>.md` if present.
- Draft `prd/<name>/prd.md` using `docs/templates/prd.md`.
- Do not make architecture decisions in PRD.

**STOP.** User must add approval block before Phase 3.

### Phase 3 — Technical design (Gate G2)

- Draft `prd/<name>/technical-design.md`:
  - AD-1, AD-2… decisions
  - Endpoints, migrations, modules under `backend/src/modules/`
  - Frontend features under `src/features/`
  - Dependency graph
- System boundary only — no file-level plans.

**STOP.** User approves before decompose.

### Phase 4 — Decompose (Gate G3)

- Use `decompose-slices` skill logic.
- Output: `prd/<name>/slices/README.md`, `slice-N.md`, `status.yaml` from template.

**STOP.** User approves slice order.

### Phase 5 — Plan slice (Gate G4)

- For current slice only: use `plan-slice` skill.
- Output: `specs/features/<name>/slice-N-*.md`

**STOP.** User approves plan.

### Phase 6 — Implement

- Use `implement-slice` skill only if plan has approval.

### Phase 7 — Report

- Write `reports/features/<branch>-report.md`
- Update `prd/<name>/slices/status.yaml`

## User commands

| User says | Phase |
|-----------|-------|
| "Orchestrator for X, Jira …" | Start Phase 0–1 |
| "PRD approved, continue" | Phase 3 |
| "Design approved, decompose" | Phase 4 |
| "Plan slice 2" | Phase 5 |
| "Implement slice 2" | Phase 6 (verify approval) |
