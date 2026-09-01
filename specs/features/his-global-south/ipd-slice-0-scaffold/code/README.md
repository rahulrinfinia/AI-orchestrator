# Slice 0 — implemented code (review here)

**This is the same code** that lives in the runnable app clone. Paths below match `projects/his-global-south/` exactly.

| | |
|---|---|
| **Run / test** | `projects/his-global-south/` |
| **Review structure here** | this `code/` folder (tracked in hub git) |

## Backend — new files

```text
code/backend/src/modules/ipd/
├── index.ts
├── ipd.constants.ts
├── ipd.routes.ts
└── README.md
```

## Frontend — new files

```text
code/src/routes/ipdRoutes.tsx
code/src/pages/ipd/v1/constants.ts
code/src/pages/ipd/v1/routes.tsx
code/src/pages/ipd/v1/index.tsx
code/src/services/ipd.service.ts
code/src/modules/ipd/index.ts
```

## Edits to existing OPD files

See [additive-touches.md](../additive-touches.md) — `build-app.ts`, `appRoutes.tsx`, `AppSidebar.tsx`.

## Open runnable repo in Cursor

**File → Open Workspace from File** → `ai-orchestrator-workspace.code-workspace` (repo root)

That adds **App — his-global-south** side by side with the hub.
