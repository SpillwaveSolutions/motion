# Carry `openFile` through the bootstrap payload

`01KZF796D6BPZCFNVPWEGYSSA0` · task/feature · **open**

Both the dev server and the Tauri app already tell the UI which folder to open at startup; add the file to that same message so web and desktop behave identically.

## Hierarchy

- epic: [[Ticket-01KZF796D647FD32J1W2452NWM]] CLI file argument, unsaved-changes guard, and editor zoom — Three independent usability gaps found while dogfooding the motion CLI.

## Subtasks

- [[Ticket-01KZF796D6PYF8DQXHV67QRJDD]] Add `openFile` to `/api/fs/workspace` in `src/server.ts` — Add `openFile` to `/api/fs/workspace` in `src/server.ts` (open)
- [[Ticket-01KZF796D71ATP5ZX7XZY1FG7V]] Extend `BootstrapInfo` in `src/lib/storage/index.ts` — Extend `BootstrapInfo` in `src/lib/storage/index.ts` (open)
- [[Ticket-01KZF796D72GZ2QWRAASHTNSRA]] Run `cargo test --lib` and `cargo clippy --all-targets -- -D warnings`, then commit — Run `cargo test --lib` and `cargo clippy --all-targets -- -D warnings`, then commit (open)
- [[Ticket-01KZF796D7PP25PNYZ3003PJ74]] Add `open_file` to `BootstrapInfo` in `src-tauri/src/lib.rs` — Add `open_file` to `BootstrapInfo` in `src-tauri/src/lib.rs` (open)

Progress: 0/4 done
