# IPD slice 0 — reference mirror (hub-visible)

**Read-only copy** of what was implemented in `projects/his-global-south/` for slice 0.  
Use this folder to **review structure** in the hub repo without opening the gitignored clone.

| Item | Value |
|------|--------|
| Spec | [ipd-slice-0-scaffold.md](../../../specs/features/his-global-south/ipd-slice-0-scaffold.md) |
| Live code | `projects/his-global-south/` (gitignored clone) |
| Patterns | [his-global-south-patterns.md](../../../docs/conventions/his-global-south-patterns.md) |

## File tree (paths relative to app repo root)

```text
backend/src/modules/ipd/
├── index.ts
├── ipd.constants.ts
├── ipd.routes.ts
└── README.md

backend/src/build-app.ts          ← additive: import + register ipdPlugin (see additive-touches/)

src/routes/ipdRoutes.tsx
src/routes/appRoutes.tsx          ← additive: /ipd/v1/* mount only

src/pages/ipd/v1/
├── constants.ts
├── routes.tsx
└── index.tsx

src/services/ipd.service.ts
src/modules/ipd/index.ts

src/components/layout/AppSidebar.tsx  ← additive: Inpatient (IPD) link
```

## Routing check (locked)

```text
appRoutes.tsx       →  /ipd/v1/*
ipdRoutes.tsx       →  delegates to v1
pages/ipd/v1/routes.tsx  →  index (home shell)
```

## Sync note

When slice 0 changes in the clone, refresh this mirror manually or ask the agent to re-sync after implement.
