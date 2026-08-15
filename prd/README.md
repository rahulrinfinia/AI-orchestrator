# PRD projects

Each product or initiative gets a folder:

```text
prd/<project-name>/
├── ticket.md              ← pasted Jira / intake notes
├── prd.md                 ← product requirements (human-approved)
├── technical-design.md    ← architecture decisions AD-1… (human-approved)
├── jira-mapping.md        ← optional: US-N ↔ JIRA keys
├── design/
│   ├── figma-links.md
│   └── screenshots/
└── slices/
    ├── status.yaml        ← machine-readable slice progress
    ├── README.md          ← overview + dependency graph
    └── slice-N.md
```

Start with `feature-orchestrator` skill or copy templates from `docs/templates/`.
