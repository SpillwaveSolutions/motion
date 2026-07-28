# Phase 0: console/network failure fixture with a measured baseline

`01KYK6NHSFD37YD6RN9KS2T4W8` · task/feature · **done**

The highest-leverage item in the plan.

## Hierarchy

- epic: [[Ticket-01KYK6NHSFJNG9XV6D8K5SHWCV]] Validation loop: prove the UI works before the human launches it — Motion has real features and no way to know whether they work.

## Subtasks

- [[Ticket-01KYK6NHSGAV4DHBNCJMXP086J]] Write e2e/fixtures.ts failing on console errors, requestfailed, and status >= 400 — Write e2e/fixtures.ts failing on console errors, requestfailed, and status >= 400 (done)
- [[Ticket-01KYK6NHSGGR1V5ACMDGZSJHF1]] Add a data-app-ready signal set after first mount — Add a data-app-ready signal set after first mount (done)
- [[Ticket-01KYK6NHSGHYEM1GVBPVT14SS1]] Measure the cold-load console and network baseline and record it — Measure the cold-load console and network baseline and record it (done)
- [[Ticket-01KYK7WZFJXKTH14WKSZR7FQEE]] Welcome doc's diagram-gen block sent the string "null" to mermaid.render on every cold load — Found by the first console baseline measurement in Phase 0. (done)
- [[Ticket-01KYK7WZM5846FPAQZH84S5D38]] Dev server answered every missing file with 200 + index.html instead of 404 — Found while proving the E2E network gate actually bites. (done)
- [[Ticket-01KYK7WZRS65D7DPP0D1DT58Z7]] Demo Query block returns zero rows: case mismatch in the demo data JOIN — Visible in the Phase 0 console baseline as 'Catalog Error: Table with name team does not exist!' from the DuckDB worker. (open)

Progress: 5/6 done
