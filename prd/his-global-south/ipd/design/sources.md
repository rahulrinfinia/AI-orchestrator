# Design sources — IPD feature in his-global-south

**Project key:** `his-global-south`  
**Feature key:** `ipd` (embedded module)

## Product documents (external)

| Document | Path |
|----------|------|
| HLD v2.3 | `flowMD-IPD/02-HLD/current/FLOWMD-IPD-HLD-v2.3.md` |
| LLD v2.6 | `flowMD-IPD/03-LLD/current/flowMD_IPD_LLD_v2.6.md` |
| PRD v1.0 | `flowMD-IPD/01-PRD/` |

Remap LLD API paths per [ADR 0009](../../../docs/decisions/his-global-south/0009-ipd-naming-and-versioning.md).

## Code target

| Item | Value |
|------|--------|
| Clone | `projects/his-global-south/` |
| Branch | `develop` |
| IPD backend | `backend/src/modules/ipd/` |
| IPD frontend | `src/pages/ipd/v1/`, `src/modules/ipd/` |

## Hub docs (orchestrator reads these)

| Doc | Path |
|-----|------|
| Project architecture | [docs/architecture/his-global-south.md](../../../docs/architecture/his-global-south.md) |
| Code patterns | [docs/conventions/his-global-south-patterns.md](../../../docs/conventions/his-global-south-patterns.md) |
| Slice status | [slices/status.yaml](../slices/status.yaml) |
| Slice specs | `specs/features/his-global-south/ipd-slice-*.md` |
| ADRs | [docs/decisions/his-global-south/](../../../docs/decisions/his-global-south/) |
| Journey | [docs/journeys/his-global-south/ipd/admission-to-bed-tracer.md](../../../docs/journeys/his-global-south/ipd/admission-to-bed-tracer.md) |

Do not attach full HLD/LLD to orchestrator — link this file + one slice spec only.
