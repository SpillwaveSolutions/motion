# Dev-server publish handlers have no test of their own

`01M1ABZH2F573CM32N93NDMAGB` · task/ops · **open**

POST /api/publish/gist and /api/publish/notion in src/server.ts are the browser-mode transport, but no test executes them: the E2E specs intercept those routes in the page, and the unit tests cover the pure cores underneath.

## Hierarchy

- epic: [[Ticket-01KYQYYN3SBWDT25TC6H3G4EAA]] Save discoverability, new-note persistence E2E, and post-v0.1 follow-ups — Make Save findable after New Note, lock create to edit to save to reload in Playwright, land dataset and SQL install E2E, and file post-v0.1 product gaps.
