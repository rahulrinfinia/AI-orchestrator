---
name: changelog
description: Summarizes merged work into docs/changelog/ from slice reports, PRs, or git history. Use after releases or sprint end.
---

# Changelog

Output: `docs/changelog/<project>/YYYY-MM-DD.md` or append to CHANGELOG pattern

## Sources

- `reports/features/`, merged slice PRs
- `git log` in `projects/<project>/`
- User-provided release tag

## Format

- Added / Changed / Fixed / Security
- Link to spec or PR when known
- User-visible vs internal

Keep entries concise — not a dump of every commit.
