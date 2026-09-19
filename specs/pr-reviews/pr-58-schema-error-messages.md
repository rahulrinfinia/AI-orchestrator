# PR #58 — AJV custom validation error messages

**Project:** `his-global-south`  
**Branch:** `feat/dra-radiology-inhouse-approval`  
**Reviewer:** @hemantinfinia — “Custom validation error messages are missing” on `upsertRadiologyReportBodySchema`  
**Goal:** Add human-readable `errorMessage` strings on **request** validation schemas introduced or extended in this PR. Title Case labels per HIS convention. No behavior change beyond 400 response message text.

---

## PR context

| Field | Value |
|-------|--------|
| PR | #58 vs `develop-l2` |
| Trigger file | `backend/src/modules/clinical/orders/orders.schema.ts` |
| Related spec | `specs/features/his-global-south/diagnostic-results-approval-workflow-slice-2.md` |

---

## Comment categorization

| Comment | Category | Action |
|---------|----------|--------|
| `upsertRadiologyReportBodySchema` missing `errorMessage` | **Fix Required** | Batch 1 — reviewer explicitly flagged |
| `listDiagnosticOrdersQuerySchema.approvalStatus` enum (PR-added) | **Optional polish** | Batch 2 — same PR, low risk; matches `patchSendOutBodySchema` style |
| `searchRadiologyCatalogQuerySchema.enrolled_only` enum (PR-added) | **Optional polish** | Batch 2 — mirrors lab catalog field (also lacks message pre-PR) |
| Response schemas (`diagnosticOrderDetailResponseSchema`, etc.) | **Will Defend / skip** | Response serialization only — not client request validation |
| Pre-existing gaps (`orderType`, `status`, `sendOut`, `abnormal_flag`) | **Out of scope** | Not introduced by this PR; avoid scope creep unless reviewer expands ask |

---

## Analysis summary (PR-scoped scan)

### Already correct in this PR

| Schema | Used on | Messages |
|--------|---------|----------|
| `rejectApprovalBodySchema` | `POST .../reject` | `Rejection Reason must be at least 3 characters` |
| `radiologyReportIdParamsSchema` | upload link/clear | `Report Id must be a valid UUID` |
| `radiologyReportUploadBodySchema` | `POST .../upload` | `Upload Id must be a valid UUID` |
| `diagnosticOrderIdParamsSchema` | `GET /:id` | `Order Id must be a valid UUID` |
| `orderItemIdParamsSchema` | approval + radiology params | `Item Id must be a valid UUID` (pre-existing) |

### Gaps to fix

| Schema | Field | Constraint | Proposed `errorMessage` |
|--------|-------|------------|-------------------------|
| **`upsertRadiologyReportBodySchema`** | `report_id` | `format: uuid` | `Report Id must be a valid UUID` |
| **`upsertRadiologyReportBodySchema`** | `amends_report_id` | `format: uuid` | `Amends Report Id must be a valid UUID` |
| **`upsertRadiologyReportBodySchema`** (root) | `additionalProperties: false` | unknown top-level keys | `Unknown field in radiology report request` |
| **`upsertRadiologyReportBodySchema.content`** (nested) | `additionalProperties: false` | unknown content keys | `Unknown field in radiology report content` |
| `listDiagnosticOrdersQuerySchema` | `approvalStatus` | `enum: APPROVAL_STATUS_VALUES` | `Approval Status must be one of: draft_ops, pending_approval, released, rejected` |
| `searchRadiologyCatalogQuerySchema` | `enrolled_only` | `enum: ['true','false']` | `Enrolled Only must be true or false` |

**Note:** `is_critical` (boolean) and `status` (plain string) need no custom messages unless we add `enum`/`minLength` later.

**Convention:** Title Case labels; include **UUID** in uuid format messages (existing tests elsewhere may grep for that word — none in `orders` today).

---

## Files to modify

| File | Batch | Change |
|------|-------|--------|
| `backend/src/modules/clinical/orders/orders.schema.ts` | 1 + 2 | `upsertRadiologyReportBodySchema`; optional `approvalStatus` |
| `backend/src/modules/clinical/catalogs/catalogs.schema.ts` | 2 (optional) | `enrolled_only` on radiology search only |

**No changes:** routes, controllers, services, frontend, migrations.

**Tests:** No existing `orders.schema.test.ts`. Integration tests assert **400 status only**, not message body — Batch 1 should not break CI. Optional: add one integration case for bad `report_id` UUID (see Step 4).

---

## Implementation steps

### Batch 1 — Required (reviewer fix)

**Step 1.1** — Edit `upsertRadiologyReportBodySchema` in `orders.schema.ts`:

```typescript
export const upsertRadiologyReportBodySchema = {
  type: 'object',
  properties: {
    report_id: {
      type: 'string',
      format: 'uuid',
      errorMessage: 'Report Id must be a valid UUID',
    },
    amends_report_id: {
      type: 'string',
      format: 'uuid',
      errorMessage: 'Amends Report Id must be a valid UUID',
    },
    content: {
      type: 'object',
      properties: {
        findings: { type: 'string' },
        impression: { type: 'string' },
        recommendation: { type: 'string' },
      },
      additionalProperties: false,
      errorMessage: {
        additionalProperties: 'Unknown field in radiology report content',
      },
    },
    is_critical: { type: 'boolean' },
    status: { type: 'string' },
  },
  additionalProperties: false,
  errorMessage: {
    additionalProperties: 'Unknown field in radiology report request',
  },
} as const;
```

Align wording with sibling schemas in the same file (`radiologyReportIdParamsSchema`, `radiologyReportUploadBodySchema`, `linkReportDocumentBodySchema`).

**Step 1.2** — Run validation gate (from `projects/his-global-south/backend`):

```sh
npm test
npm run test:integration
npx tsc -b
npm run lint:backend
```

**Step 1.3** — Commit (when user asks):

```text
fix(orders): add AJV error messages on radiology report upsert body schema
```

---

### Batch 2 — Optional polish (same PR, reviewer did not flag)

Only do if you want consistency on **new** query fields in this PR.

**Step 2.1** — `listDiagnosticOrdersQuerySchema.approvalStatus`:

```typescript
approvalStatus: {
  type: 'string',
  enum: [...APPROVAL_STATUS_VALUES],
  description: 'Filter orders with at least one line in this approval state',
  errorMessage:
    'Approval Status must be one of: draft_ops, pending_approval, released, rejected',
},
```

**Step 2.2** — `searchRadiologyCatalogQuerySchema.enrolled_only`:

```typescript
enrolled_only: {
  type: 'string',
  enum: ['true', 'false'],
  description: 'When true, return only procedures enrolled for this organization',
  errorMessage: 'Enrolled Only must be true or false',
},
```

**Step 2.3** — Re-run same validation gate as Batch 1.

**Step 2.4** — Separate commit or squash with Batch 1 per user preference.

---

### Step 3 — Optional test (recommended if touching Batch 1)

Add to `backend/src/__tests__/integration/orders-approval-radiology.integration.test.ts`:

```typescript
it('POST radiology-report returns 400 when report_id is not a UUID', async () => {
  const res = await app.inject({
    method: 'POST',
    url: `/api/clinical/orders/items/${validItemId}/radiology-report`,
    headers: authHeaders,
    payload: { report_id: 'not-a-uuid', content: { findings: 'x' } },
  });
  expect(res.statusCode).toBe(400);
  // Optional strict assertion:
  // expect(res.body).toMatch(/Report Id must be a valid UUID/i);
});
```

Use existing test fixtures for `validItemId` / auth — copy pattern from adjacent radiology tests.

**Scope:** One test is enough; do not add a full schema unit test file unless team asks.

---

## Validation checklist

| Check | Command / action |
|-------|------------------|
| Unit tests | `cd projects/his-global-south/backend && npm test` |
| Integration | `npm run test:integration` |
| Types | `npx tsc -b` |
| Lint | `npm run lint:backend` |
| Manual smoke | `POST .../items/:itemId/radiology-report` with `report_id: "bad"` → 400 with readable message |

Expected baseline before change: **461 unit**, **101 integration** (as of last branch run).

---

## Draft replies to reviewer

**Batch 1 (required):**

> Added Title Case `errorMessage` on `upsertRadiologyReportBodySchema` for `report_id` and `amends_report_id` UUID fields, plus root/nested `additionalProperties` messages — consistent with `radiologyReportUploadBodySchema` and `radiologyReportIdParamsSchema` in the same file.

**Batch 2 (if done):**

> Also added enum messages on the new `approvalStatus` list filter and radiology catalog `enrolled_only` query param for consistency with other body schemas in this PR.

**If skipping Batch 2:**

> Left list/catalog query enum messages unchanged — they follow the existing pattern for `orderType`/`sendOut` in the same query schema (pre-PR). Happy to add in a follow-up if you want full enum coverage on query params.

---

## Risk assessment

| Risk | Mitigation |
|------|------------|
| Behavior change | Only 400 error **text** changes; validation rules unchanged |
| Test breakage | No tests assert old generic AJV strings for these fields |
| Scope creep | Do not touch pre-existing `orderType`/`status`/`sendOut`/`abnormal_flag` in this pass |

---

## Approval

- [x] Batch 1 only (reviewer fix) — **implemented**
- [x] Batch 2 (query enum polish) — **implemented**
- [x] Optional integration test (Step 3) — **implemented**

---

## After implement

1. Push branch (4+ commits ahead of remote).
2. Reply on GitHub thread for `upsertRadiologyReportBodySchema`.
3. Resolve review thread when CI green.
