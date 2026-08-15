---
name: prd
description: Creates or updates a Product Requirements Document in prd/. Use standalone when user wants PRD only without full orchestrator pipeline.
---

# PRD

Output: `prd/<feature-name>.md`

Use template: `docs/templates/prd.md`

## Sections

- Problem, goals, non-goals
- Users and personas
- Requirements (must/should/could)
- UX notes, open questions
- Success metrics
- Out of scope

After PRD → user may run **feature-orchestrator**, **decompose-slices**, or **create-stories**.

Do not write application code in this step.
