---
name: user-stories
description: Refines or validates user stories against PRD and conventions. Use when reviewing story quality or aligning Jira with hub specs.
---

# User Stories

## Actions

- **Validate** existing stories in `specs/stories/` against `prd/`
- **Refine** acceptance criteria for testability
- **Map** stories → vertical slices in `specs/features/<project>/<feature>/slices-status.yaml`

## Rules

- One story should map to at most one slice when possible
- Acceptance criteria must be verifiable without subjective judgment
- Flag gaps vs PRD non-goals

Output: updated `specs/stories/` or validation report in `reports/features/`.
