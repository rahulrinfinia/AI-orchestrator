# Architecture index

| Project key | Clone | Architecture | Slices | ADRs |
|-------------|-------|--------------|--------|------|
| **his-global-south** | `projects/his-global-south/` | [his-global-south.md](architecture/his-global-south.md) | [specs/features/his-global-south/](../specs/features/his-global-south/) | [decisions/his-global-south/](decisions/his-global-south/) |

## IPD feature (within his-global-south)

| Item | Path |
|------|------|
| Slice status | [prd/his-global-south/ipd/slices/status.yaml](../prd/his-global-south/ipd/slices/status.yaml) |
| Design sources | [prd/his-global-south/ipd/design/sources.md](../prd/his-global-south/ipd/design/sources.md) |
| Journey | [journeys/his-global-south/ipd/admission-to-bed-tracer.md](journeys/his-global-south/ipd/admission-to-bed-tracer.md) |
| Open decisions | [ipd-open-decisions.md](architecture/ipd-open-decisions.md) |

## Resolution rule

```text
repos.yaml name  →  docs/architecture/<name>.md
                  →  specs/features/<name>/
                  →  prd/<name>/<feature>/
                  →  docs/decisions/<name>/
                  →  projects/<name>/
```

**Stage 0.5 complete** — project-keyed naming aligned.
