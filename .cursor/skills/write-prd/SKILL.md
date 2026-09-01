---
name: write-prd
description: Drafts a product requirements document from Jira, Figma, or user description into prd/<project>/prd.md. Use during orchestrator phase 2 or when the user asks for a PRD before technical design.
---

# Write PRD

## Output

`prd/<project>/prd.md`

## Before writing

1. Read `docs/architecture.md` if it exists for this project
2. Read any files in `prd/<project>/design/`
3. Ask one question at a time only if acceptance criteria or workflows are unclear

## PRD must include

- Background & problem
- Goals & success metrics
- Personas
- User workflows (step-by-step, not feature lists)
- User stories US-1… with testable acceptance criteria
- In scope / out of scope
- Edge cases (empty, error, permissions)

## Do not

- Make architecture decisions (no AD-N, no file paths)
- Implement code

## After draft

Ask user to review and reply **APPROVE PRD** before technical design.
