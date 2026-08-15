---
name: create-stories
description: Breaks PRD or feature into Jira-ready user stories with acceptance criteria. Output specs/stories/. Use when user wants tickets before implementation.
---

# Create Stories

Output: `specs/stories/<project>/<feature>/stories.md`

## Input

- `prd/<feature>.md` or user description
- Optional: Jira project key

## Each story

- Title, user story format, acceptance criteria (Given/When/Then)
- Priority, estimate hint (S/M/L)
- Links to slice if already decomposed
- Out of scope note if needed

## Jira (optional)

If user provides Jira MCP or API access, create issues from stories. Otherwise output markdown ready to paste.

Do not implement code — planning only.
