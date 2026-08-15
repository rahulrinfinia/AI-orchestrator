---
name: test-implement
description: Implements tests from specs/tests/ plan in projects/. Writes reports/tests/. Use after test-plan is approved or user says implement tests.
---

# Test Implement

Input: `specs/tests/unit/<project>/<plan>.md` (or integration plan)

## Steps

1. Read test plan
2. `cd projects/<project>/` — create branch `test/<scope>`
3. Write tests following existing patterns in repo
4. Run validation commands from plan
5. Commit, push, open PR if user wants
6. Report: `reports/tests/<name>-report.md`

## Rules

- Test behavior, not private implementation
- No tests that only assert mocks were called
- Backend integration tests may use test Postgres if plan specifies
