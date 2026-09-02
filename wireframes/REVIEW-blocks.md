# Adversarial Review: Content blocks (missing demo data)

**Wireframe:** `wireframes/blocks.md`
**Verdict:** PASS

## Criteria Results

- [x] Dataset/Query files must live inside the open workspace jail. — PASS (unchanged jail; listing is workspace-relative)
- [x] A Dataset whose source is not in the open folder shows a missing-file status, not a fetch 404 or "Failed to load dataset". — PASS (`e2e/data.spec.ts` missing source; no 404 allow)
- [x] Welcome demo sources name the demo-folder hint when those files are absent. — PASS (data-files stubbed to `[]`; both banners match "Demo data is not in this workspace")
- [x] Welcome demo still shows Alice rows when the files are present. — PASS (`e2e/data.spec.ts` + `e2e/blocks.spec.ts` after DuckDB init was serialized; previously "duckdb is not initialized")
- [x] A Query against an unregistered table does not show a DuckDB Catalog Error. — PASS (`explainQueryError` unit test; welcome JOIN green when files exist)

## Evidence
- `bun run typecheck`
- `bun run guard:client` (47 modules)
- `bun test src` (214, including `datasetErrors`)
- Playwright `e2e/data.spec.ts` + `e2e/blocks.spec.ts` — 8 passed

## Notes / Recommended Fixes
- Query still retries missing tables for ~20s when a Dataset will never register (existing timing for CI). Copy is fixed; the wait is not. Not blocking.
- Demo files are not shipped as Tauri resources this slice — degrade-in-place is the product when you open an arbitrary folder.
- DuckDB WASM init is now a single in-flight promise. Concurrent Dataset/Query mounts used to observe the instance before `instantiate()` finished.
