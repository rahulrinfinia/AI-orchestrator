# PM-3 — Kenya Statutory Presets: SHA Level 2 & Level 3 Matrix

| Field | Value |
|---|---|
| **Feature** | `payer-master` / `accepted-plans` |
| **Slice** | 3 |
| **Depends on** | [PM-1](./slice-1.md) |
| **Status** | Planned |
| **Goal** | Administrator clicks one button to populate official statutory tariffs and codes for Kenya SHA/POMSF Level 2 or Level 3 facilities. |

---

## 1. Purpose

The Social Health Authority (SHA) of Kenya mandates strict statutory tariff caps and specific claim codes under the 19.03.2026 Primary Care & Secondary Care matrix. Instead of requiring hospital administrators to look up a 29-sheet Excel document, FlowMD provides 1-click statutory pre-fills.

---

## 2. Scope & Implementation Details

### A. Statutory Data Preset (`src/pages/payerCatalog/constants/shaStatutoryPresets.ts`)
Define statutory rules extracted directly from `Revised POMSF Benefits  Tariffs Matrix 19.03.2026.xlsx`:

```typescript
export interface StatutoryTariffPreset {
  hospitalCodePatterns: string[];
  payerClaimCode: string;
  tariffKes: number;
  description: string;
}

export const SHA_LEVEL_2_PRESETS: StatutoryTariffPreset[] = [
  { hospitalCodePatterns: ['CONSULT-NEW', 'CONSULT-OPD', 'REG-OPD'], payerClaimCode: 'PMF-12-001', tariffKes: 1200, description: 'Outpatient Consultation' },
  { hospitalCodePatterns: ['CONSULT-FLWUP', 'CONSULT-RETURN'], payerClaimCode: 'PMF-12-001', tariffKes: 0, description: 'Outpatient Return (Free)' },
  { hospitalCodePatterns: ['MED-ANTI-D', 'PHARM-ANTI-D'], payerClaimCode: 'SHA-08-004', tariffKes: 8000, description: 'Anti-D Immunoglobulin' },
  { hospitalCodePatterns: ['OPT-PEDIATRIC-GLASSES'], payerClaimCode: 'SHA-05-002', tariffKes: 1500, description: 'Pediatric Eyeglasses' },
  { hospitalCodePatterns: ['DENT-SCALING', 'PROC-DENTAL-SCALE'], payerClaimCode: 'SHA-11-005', tariffKes: 3000, description: 'Dental Scaling & Polishing' },
];

export const SHA_LEVEL_3_PRESETS: StatutoryTariffPreset[] = [
  ...SHA_LEVEL_2_PRESETS,
  { hospitalCodePatterns: ['BED-GENERAL-WARD', 'NURS-BED-GEN', 'BED-WARD'], payerClaimCode: 'PMF-07-001', tariffKes: 2240, description: 'General Ward Bed Per Diem' },
  { hospitalCodePatterns: ['DELIV-NORMAL', 'PROC-DELIVERY-NORMAL'], payerClaimCode: 'SHA-08-005', tariffKes: 10000, description: 'Normal Delivery Package' },
  { hospitalCodePatterns: ['DELIV-CS', 'PROC-CS', 'SURG-CS'], payerClaimCode: 'SHA-08-006', tariffKes: 30000, description: 'Caesarean Section Package' },
  { hospitalCodePatterns: ['DELIV-MULTI-VAG'], payerClaimCode: 'SHA-08-007', tariffKes: 13000, description: 'Multiple Births Vaginal' },
  { hospitalCodePatterns: ['DELIV-MULTI-CS'], payerClaimCode: 'SHA-08-008', tariffKes: 39000, description: 'Multiple Births CS' },
  { hospitalCodePatterns: ['RAD-CXR-PA', 'RAD-XRAY', 'RAD-CXR'], payerClaimCode: 'SHA-09-114', tariffKes: 1000, description: 'Diagnostic X-Ray' },
  { hospitalCodePatterns: ['RAD-US-OBS', 'RAD-US-PELVIS', 'RAD-ULTRASOUND'], payerClaimCode: 'SHA-09-105', tariffKes: 2500, description: 'Obstetric / Pelvic Ultrasound' },
  { hospitalCodePatterns: ['PROC-MINOR-ID', 'PROC-ID'], payerClaimCode: 'SHA-19-146', tariffKes: 14000, description: 'Incision & Drainage' },
  { hospitalCodePatterns: ['PROC-CIRCUMCISION'], payerClaimCode: 'SHA-19-155', tariffKes: 22400, description: 'Minor Surgery: Circumcision' },
  { hospitalCodePatterns: ['PROC-DEBRIDEMENT'], payerClaimCode: 'SHA-19-176', tariffKes: 33600, description: 'Minor Surgery: Debridement' },
  { hospitalCodePatterns: ['CARE-PALLIATIVE'], payerClaimCode: 'PMF-13-001', tariffKes: 2240, description: 'Palliative Care Daily' },
  { hospitalCodePatterns: ['REHAB-SUBSTANCE'], payerClaimCode: 'PMF-10-005', tariffKes: 67200, description: 'Substance Abuse Rehab (45d)' },
];
```

### B. Frontend Toolbar Buttons (`PayerTariffsTab.tsx`)
- Add buttons:
  - `[ 🇰🇪 Load SHA Level 2 Data ]`
  - `[ 🇰🇪 Load SHA Level 3 Data ]`
- Handlers iterate over the active matrix:
  - For each service matching a preset pattern:
    - Sets `payerServiceCode = preset.payerClaimCode`
    - Sets `customPrice = preset.tariffKes`
  - Enables Save button and triggers toast notification.

---

## 3. Automated Tests & Acceptance

1. **SHA Level 2 Button Test**:
   - Click "Load SHA Level 2 Data".
   - Verify `CONSULT-NEW` receives `customPrice = 1200` and `payerServiceCode = 'PMF-12-001'`.
   - Verify inpatient bed remains unconfigured (Level 2 dispensary does not support IPD).
2. **SHA Level 3 Button Test**:
   - Click "Load SHA Level 3 Data".
   - Verify `CONSULT-NEW` receives `1200` (`PMF-12-001`).
   - Verify `DELIV-NORMAL` receives `10000` (`SHA-08-005`).
   - Verify `DELIV-CS` receives `30000` (`SHA-08-006`).
   - Verify `NURS-BED-GEN` receives `2240` (`PMF-07-001`).
   - Verify `RAD-CXR-PA` receives `1000` (`SHA-09-114`).
