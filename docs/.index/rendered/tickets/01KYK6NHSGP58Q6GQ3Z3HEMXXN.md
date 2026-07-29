# Phase 1: make web mode a real filesystem backend

`01KYK6NHSGP58Q6GQ3Z3HEMXXN` · task/feature · **done**

The keystone.

## Hierarchy

- epic: [[Ticket-01KYK6NHSFJNG9XV6D8K5SHWCV]] Validation loop: prove the UI works before the human launches it — Motion has real features and no way to know whether they work.

## Subtasks

- [[Ticket-01KYK6NHSG0VG2NDWC3E7FRJFA]] Implement the path jail with component-aware containment, not string startsWith — Implement the path jail with component-aware containment, not string startsWith (done)
- [[Ticket-01KYK6NHSGSAMNDS6CJ47YST2C]] Add /api/fs/* routes to server.ts with an env-only workspace root — Add /api/fs/* routes to server.ts with an env-only workspace root (done)
- [[Ticket-01KYK6NHSGXDY0C5GZRQDVEQGC]] Extract pure filesystem cores: src/lib/fsCore.ts and src-tauri/src/fs_core.rs — Extract pure filesystem cores: src/lib/fsCore.ts and src-tauri/src/fs_core.rs (done)
- [[Ticket-01KYK6NHSH1PJ0YBJ1WEG3SZ4R]] Give each Playwright worker a seeded temp workspace — Give each Playwright worker a seeded temp workspace (done)
- [[Ticket-01KYK6NHSH2RMTJQ3SR7MGW7Q8]] Add resolveWorkspacePath so documents are portable between modes — Add resolveWorkspacePath so documents are portable between modes (done)
- [[Ticket-01KYK6NHSH8WXC8MEGFPFM8DYC]] Add the language-neutral parity fixture run by both bun test and cargo test — Add the language-neutral parity fixture run by both bun test and cargo test (done)
- [[Ticket-01KYK6NHSHKCZWFNWZX3NATX04]] Replace WebStorage with a real HttpStorage — Replace WebStorage with a real HttpStorage (done)
- [[Ticket-01KYK6NHSHVJEFG9W6TZYWXNEF]] Delete the stale root index.html and generate dev and prod shells from one template — Delete the stale root index.html and generate dev and prod shells from one template (done)
- [[Ticket-01KYNKG3ZD866C3AGQS20T6H8J]] B14 fixed: list_markdown_files no longer re-roots the workspace jail — list_markdown_files used to overwrite WorkspaceState with any directory passed to it -- a second write path into the jail that bypassed the folder dialog, so any caller could silently re-root the sandbox. (done)

Progress: 9/9 done
