# ADR 0009: IPD naming and API/UI versioning

**Status:** Accepted  
**Date:** 2026-08-19  
**Project:** his-global-south

## Decision

| Layer | Pattern |
|-------|---------|
| API | `/api/v1/ipd/{module}/{resource}` |
| UI | `/ipd/v1/{module}/…` |
| DB | `ipd_{module}_{entity}` |
| Events | `ipd.*` new; listen to `admission.advised` only |

## References

- [his-global-south.md](../../architecture/his-global-south.md)
