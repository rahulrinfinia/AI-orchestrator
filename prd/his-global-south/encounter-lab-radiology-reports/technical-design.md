# Technical Design: Encounter — Reports & Documents (Lab + Radiology)

| Field | Value |
|-------|--------|
| **Project** | `his-global-south` |
| **Feature** | `encounter-lab-radiology-reports` |
| **PRD** | [prd.md](./prd.md) |
| **Implementation spec** | [specs/features/his-global-south/encounter-lab-radiology-reports.md](../../../specs/features/his-global-south/encounter-lab-radiology-reports.md) |
| **Depends on** | [Diagnostic results approval workflow — technical design](../diagnostic-results-approval-workflow/technical-design.md) (`approval_status`, `released` gate, report-document 403) |
| **Target repo** | `projects/his-global-south/` |
| **Status** | Draft — pending Gate G2 approval |
| **Date** | 2026-09-05 |

---

## 0. Architecture decisions (AD-N)

| ID | Decision | Rationale |
|----|----------|-----------|
| **AD-1** | **No new backend routes for v1** — consume existing `GET /api/clinical/orders?encounterId=` + item report-documents + existing drawers | PRD reuse-first; approval TD adds item fields to list projection |
| **AD-2** | **Single shared list component** `EncounterDiagnosticReportsList` used by consultation tab **and** `EncounterReadOnly` | One classifier, one UX; `readOnly` prop disables nothing in v1 (already view-only) |
| **AD-3** | **Clinician visibility** = `approval_status === 'released'` **OR** `approval_exempt === true` | Matches approval workflow AD-1; do not use raw `resulted_at` alone after approval ships |
| **AD-4** | Insert stage **`reportsAndDocuments`** in nav **after Plan, before Care Templates**; add to `CONSULTATION_STAGES` for `?tab=` validation | Product placement; Back/Next walks through it in stage order (same as Care Templates today) |
| **AD-5** | **Rejected lines hidden from doctor list** (not rendered as rows); pending shown as “Awaiting approval” | PRD §8 — doctor never sees reject loop internals |
| **AD-6** | **PDF view:** reuse `SendOutReportDialog` in read-only mode OR extract **`ReportPdfPanel`** if dialog title/actions too tracker-specific | Prefer read-only dialog first; extract only if UX mismatch in review |
| **AD-7** | **Consultation workspace only v1** — gate tab mount on consult encounter type; no IPD workspace | Product decision #5 |
| **AD-8** | **Realtime refresh:** invalidate `['encounter-diagnostic-reports', encounterId]` on SSE `diagnostic_result.approval_pending` (optional) and on **`encounter.signed` / custom post-approve event** if added later; **v1 minimum:** refetch on tab focus + react-query staleTime 30s | No new backend; polish slice adds SSE hook |

---

## 1. Design summary

Add a read-only **Reports & Documents** surface in the consultation workspace and signed encounter chart. Doctors see encounter-scoped lab/radiology orders with per-line status, **view/print only when released**, reusing existing order list API (enriched after approval workflow) and existing result/PDF drawers.

```text
GET orders?encounterId=  →  map to EncounterReportLine[]  →  classify  →  drawers / PDF
```

---

## 2. Data flow

### 2.1 Fetch

**New service** `src/services/encounterReports.service.ts` (or extend `consultationWorkspace.service.ts`):

```typescript
export async function listEncounterDiagnosticReports(encounterId: string): Promise<EncounterDiagnosticOrder[]> {
  // Two parallel GETs OR one GET without orderType filter if backend supports omitting orderType
  const params = new URLSearchParams({ encounterId, limit: '100' });
  const data = await api.get<OrderListApiResponse>(`/api/clinical/orders?${params}`);
  return (data.items ?? data).map(mapApiOrderToEncounterReportOrder);
}
```

**Filter client-side:** `orderType ∈ { laboratory, radiology }` — ignore other types if any appear.

**Depends on approval TD:** item JSON includes `approval_status`, `approval_exempt`, `has_report_pdf`, `result_components`, radiology embed fields, `abnormal_flag` / `radiology_report_is_critical`.

### 2.2 Line classifier

**New file:** `src/clinical/constants/encounterReportAvailability.ts`

```typescript
export type EncounterReportLineStatus =
  | 'not_ready'
  | 'awaiting_approval'
  | 'available';

export function classifyEncounterReportLine(item: EncounterReportLine): EncounterReportLineStatus {
  if (item.approvalStatus === 'rejected') return 'not_ready'; // row hidden at list level
  if (item.approvalExempt || item.approvalStatus === 'released') {
    return hasViewableContent(item) ? 'available' : 'not_ready';
  }
  if (item.approvalStatus === 'pending_approval') return 'awaiting_approval';
  return 'not_ready';
}

function hasViewableContent(item: EncounterReportLine): boolean {
  if (item.hasReportPdf) return true;
  if (item.orderType === 'laboratory') {
    return Boolean(item.resultedAt && (item.resultComponents?.length || item.resultValue));
  }
  // radiology typed — content present after release (dual-write on approve)
  return Boolean(item.radiologyReportStatus === 'verified' || item.resultValue);
}
```

**View kind when `available`:**

| Condition | Drawer |
|-----------|--------|
| `hasReportPdf` | PDF panel / `SendOutReportDialog` read-only |
| Lab typed | `LabResultDrawer` |
| Radiology typed | `RadiologyReportDrawer` |

Update **`isPdfOnlyLabResult` / `isPdfOnlyRadiologyResult`** callers in this path to require `available` status first — do not treat PDF as viewable when pending approval.

### 2.3 Actions (doctor)

| Action | Implementation |
|--------|----------------|
| View typed lab | `getLabOrderResult(orderId, itemId)` → `LabResultDrawer` |
| View radiology | `getRadiologyReport(orderId, itemId)` → `RadiologyReportDrawer` |
| View PDF | `listLabOrderReportDocuments(itemId)` → open PDF URL (403 if not released — show toast) |
| Print | Existing `printPdfFromUrl` / drawer print buttons |

---

## 3. Frontend components

### 3.1 New files

| File | Responsibility |
|------|----------------|
| `src/services/encounterReports.service.ts` | Fetch + map encounter orders to view model |
| `src/clinical/constants/encounterReportAvailability.ts` | Status classifier + helpers |
| `src/components/consultation/EncounterDiagnosticReportsList.tsx` | Order/line list, badges, actions, empty states |
| `src/pages/consultationWorkspace/components/tabs/ReportsAndDocumentsTab.tsx` | Sub-tabs Laboratory / Radiology; wraps list |

### 3.2 Types

**`EncounterReportLine`** (frontend view model):

```typescript
interface EncounterReportLine {
  itemId: string;
  orderId: string;
  orderType: 'laboratory' | 'radiology';
  accessionNumber: string;
  testName: string;
  priority: 'routine' | 'urgent' | 'stat';
  orderedAt: string;
  approvalStatus: string | null;
  approvalExempt: boolean;
  hasReportPdf: boolean;
  resultedAt: string | null;
  resultValue: string | null;
  resultComponents: LabResultComponent[] | null;
  radiologyReportStatus: string | null;
  isCritical: boolean;
}
```

Map from API using same field names as `ordersWorkspace.service` list mappers (`toLabOrderTestRow` patterns) — **extend mappers**, do not duplicate status logic.

### 3.3 `EncounterDiagnosticReportsList` props

```typescript
interface EncounterDiagnosticReportsListProps {
  encounterId: string;
  modality?: 'laboratory' | 'radiology' | 'all';
  /** Signed chart embed — same UI, no edit affordances */
  variant?: 'consultation' | 'encounter-chart';
}
```

**UI per line:**

- Test/procedure name, accession, priority badge
- Status label: Not ready | Awaiting approval | Result available
- CRITICAL badge when `isCritical` (including awaiting approval)
- Actions row: View report, Print — **only when `available`**

**Rejected lines:** filter out in mapper (`approval_status === 'rejected'` → omit).

**Empty states:**

- No orders on encounter
- Orders but no lines in modality sub-tab

### 3.4 Consultation tab wiring

**`types.ts`:**

```typescript
export const CONSULTATION_STAGES = [
  'intake', 'subjective', 'objective', 'assessment', 'plan',
  'reportsAndDocuments',  // NEW — after plan
  'careTemplates',
] as const;

export const consultationReportsPath = (visitId: string) =>
  `/consultation/${visitId}?tab=reportsAndDocuments`;
```

**`ConsultationStageNav.tsx`:** add `TabsTrigger` for `reportsAndDocuments` (“Reports & Documents”) — `pointer-events-auto` like Care Templates.

**`index.tsx`:**

- Import `ReportsAndDocumentsTab`
- Render `<TabsContent value="reportsAndDocuments">` when `clinicalEncounterId` present
- Pass `clinicalEncounterId` from existing encounter context (same as Plan tab diagnostic orders)
- Optional: tab badge count = number of `available` lines (slice 4)

**Sign flow:** tab does not block finalize — no validation gate on reports stage.

### 3.5 Signed encounter — `EncounterReadOnly.tsx`

Add section **“Reports & Documents”** below existing diagnostic order name badges (or replace badges-with-names-only for results):

```tsx
<EncounterDiagnosticReportsList
  encounterId={clinicalEncounterId}
  variant="encounter-chart"
/>
```

Requires `clinicalEncounterId` on encounter detail payload — already available via visit/encounter join used elsewhere on page.

---

## 4. Backend / API (consumer only)

| Endpoint | Use | Change from this feature |
|----------|-----|---------------------------|
| `GET /api/clinical/orders?encounterId=` | List orders + items | **None** if approval TD extended projection |
| `GET /api/clinical/orders/items/:itemId/report-documents` | PDF list | **None** — doctor allowed; 403 when not released (approval TD AD-7) |
| `GET /api/clinical/orders/:orderId` | Drawer detail fallback | Existing |

**Auth check before slice 1:** manual or integration test — doctor role can list orders + report-documents for **released** item. If 403 on orders list, widen `listDiagnosticOrdersHandler` to `CLINICAL_ROLES` (likely already clinical).

**No new endpoints.**

---

## 5. Integration with approval workflow

| Approval state | Encounter UI |
|----------------|--------------|
| `null` / `draft_ops` | Line shown — **Not ready** |
| `pending_approval` | **Awaiting approval** — no View/Print |
| `rejected` | **Hidden** from doctor list |
| `released` | View/Print when content exists |
| `approval_exempt` | View/Print immediately |

Implement **after** approval workflow slice B (API + fields) for slice 2; slice 1 tracer may use mocked `released` rows or feature flag in dev.

---

## 6. Testing

| Layer | Cases |
|-------|--------|
| **Unit** | `classifyEncounterReportLine` — all states; rejected filtered; bedside exempt |
| **Unit** | `mapApiOrderToEncounterReportOrder` — critical flag lab vs radiology |
| **Component** | Empty state; awaiting approval hides buttons; available shows View |
| **Component** | CRITICAL badge visible when awaiting approval |
| **Integration** | Doctor + released lab → drawer opens; pending → 403 on PDF GET |
| **Manual** | Plan order → ops → approve → tab refresh → view + print |

---

## 7. Implementation slices

| Slice | Scope | Depends on |
|-------|--------|------------|
| **1** | Stage wiring + tab shell + `listEncounterDiagnosticReports` + list with one **released** lab line → `LabResultDrawer` + print | Approval B deployed OR test seed with `approval_status=released` |
| **2** | PDF + radiology sub-tabs + `RadiologyReportDrawer` + symmetric classifier | Approval workflow C live |
| **3** | `EncounterReadOnly` embed | Slice 1 list component |
| **4** | Empty/loading states, tab badge count (`available` lines), SSE/query invalidation on tab focus | Optional SSE from approval D |

**Tracer bullet done when:** Doctor opens consult → Reports & Documents → released lab → print.

---

## 8. Files to touch

| Area | Path |
|------|------|
| Stages | `consultationWorkspace/types.ts`, `ConsultationStageNav.tsx`, `index.tsx` |
| Tab | `components/tabs/ReportsAndDocumentsTab.tsx` |
| List | `components/consultation/EncounterDiagnosticReportsList.tsx` |
| Service | `encounterReports.service.ts` |
| Classifier | `clinical/constants/encounterReportAvailability.ts` |
| Mappers | `ordersWorkspace.service.ts` (shared map helpers) |
| Signed chart | `pages/encounters/EncounterReadOnly.tsx` |
| Reuse | `LabResultDrawer`, `RadiologyReportDrawer`, `SendOutReportDialog` |
| Tests | `encounterReportAvailability.test.ts`, component tests for list |

---

## 9. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Thin fetch still used elsewhere | New `listEncounterDiagnosticReports` — do not break `listEncounterDiagnosticOrders` for Plan tab |
| Drawer assumes tracker context | Pass `orderId` + `itemId` only; drawers already support read-only |
| Stale list after approve | react-query key + refetch on tab focus; SSE invalidation in slice 4 |
| Spec slice 2 text outdated (“tracker save = live”) | Implementation follows **released** gate only |

---

## 10. Out of scope (confirm)

- IPD workspace tab
- Non-clinical documents section
- Order placement from this tab
- Doctor critical acknowledgement
- New aggregator endpoint `GET .../encounters/:id/diagnostic-reports`

---

## Approval

Plans and PRDs must include this block before implement phase.

- [ ] Product — matches PRD (tab placement, states, encounter + signed chart, released-only)
- [ ] Tech — AD-1–AD-8 respected; depends on approval workflow TD; no duplicate backend
- [ ] **Approved by:** ___
- [ ] **Date:** YYYY-MM-DD

**Agent rule:** Do not implement until all boxes are checked and approver name is filled.

**Implement order:** Approval workflow slices A–C (minimum) before encounter slice 2; encounter slice 1 can proceed in parallel if test data has released rows.
