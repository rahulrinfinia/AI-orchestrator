---
name: drift
description: Compares docs/services/ and specs/ against actual code in projects/. Reports stale documentation and spec drift.
---

# Drift Check

Output: `reports/drift/<project>-<date>.md`

## Compare

| Source | Against |
|--------|---------|
| `docs/services/<project>.md` | `projects/<project>/` code |
| Slice specs | Implemented routes/components |
| `docs/contracts/` | OpenAPI or route schemas in code |

## Report sections

- Missing docs (code exists, doc silent)
- Stale docs (doc claims removed APIs)
- Spec vs code mismatches
- Recommended fixes (update doc vs fix code)

No code changes unless user asks to fix drift.
