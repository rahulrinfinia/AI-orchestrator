# ICD-10-CM dev subset refresh (report)

**Repo:** `mitra-ai-scribe`  
**Target FY:** `FY2024` (`icd10cm_order_2024.txt` from CMS zip)  
**Not pushed.**

## Subset fixture

- **File:** `backend/scripts/fixtures/icd10cm-dev-subset.tsv`
- **Rows:** 103 (100 billable OPD codes + 3 category codes `J20`, `E11`, `M54` with `is_billable=0`)
- **Columns:** `code` (no dot) → `description` → `is_billable` (`1`|`0`)
- **Descriptions:** CMS **long description** (column 78+) from official order file — **all verified** against downloaded file; **none marked unverified**.

## CMS validation

Command:

```bash
node --env-file=../.env ./node_modules/tsx/dist/cli.mjs scripts/import-icd10cm.ts \
  --validate-subset \
  --fixture scripts/fixtures/icd10cm-dev-subset.tsv \
  --order /path/to/icd10cm_order_2024.txt
```

**Result:** all 103 fixture codes present in `icd10cm_order_2024.txt` (0 missing).

Download: [2024-code-descriptions-tabular-order.zip](https://www.cms.gov/files/zip/2024-code-descriptions-tabular-order.zip) → extract `icd10cm_order_2024.txt`.

## Import script changes

- Fixed-width CMS order parser (`parseCmsOrderLine`) — code, HIPAA billable flag, long description.
- Full file import via `--order` (local dev); fixture import for tests/CI only.
- `--validate-subset` checks fixture codes against an order file.

## Tests

| Check | Result |
|-------|--------|
| `backend npm test` | **Pass** — 26 unit tests (incl. 4 icd-import) |
| ICD integration (if run locally) | Updated category row to `M54` |

## Notes

- Row 78 clinical term “Headache in pregnancy” → code **O26899** only (CMS: *Other specified pregnancy related conditions, unspecified trimester*).
- Integration test no longer uses `R05.0`; category warning case uses **`M54`** to match fixture category codes.
