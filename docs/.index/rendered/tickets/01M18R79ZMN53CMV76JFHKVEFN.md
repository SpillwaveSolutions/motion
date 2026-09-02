# AI editor: selection, /ai, preview

`01M18R79ZMN53CMV76JFHKVEFN` · epic/feature · **open**

Three entry points, one pipeline, preview before commit.

## Children

- [[Ticket-01M18R79ZM3BMYZ56C7P874YN1]] DocCommands registry and tool-use loop — replace_range, insert_after_block, table_add_row, table_update_cell. (done)
- [[Ticket-01M18R79ZM90HJ0MBG3CX6VW7E]] Dictation last — Depends on DocCommands (and tables, for "new table"). (open)
- [[Ticket-01M18R79ZMD6BCM0CQGSSAEM05]] Wireframes for Ask AI bubble and pending preview — UI Guard: selection menu, /ai prompt, preview panel (Replace / Insert
below / Try again / Discard), Refine routed through the same panel. (done)
- [[Ticket-01M18R79ZMERNNHSH0KYY819SN]] Selection bubble, /ai, preview panel on the CLI transport — Floating Ask AI on a non-empty WYSIWYG selection. (done)
- [[Ticket-01M18R79ZMGXNJ9D8JJ5P4W96J]] Route Refine through the same pipeline — Toolbar Refine is document-scoped Ask AI (no Insert below). (done)
- [[Ticket-01M18R79ZMK0DX0PE2DPWMZ60D]] Tiptap tables + markdown round-trip — Independently valuable. (done)
- [[Ticket-01M18R79ZMKBXK2PGWR6911MJQ]] Shared TS AI service: stream, per-doc session, prompt cache — Anthropic SDK behind /api/ai/*. (done)
- [[Ticket-01M18R79ZMSX2XFW3N4RG4X4DP]] buildAiContext, canned prompts, session log, unwrap reply — Pure TS. (done)
- [[Ticket-01M19Z6Z3XQZ03EYNXKKBG5WK7]] Bun sidecar so packaged Tauri streams Ask AI — Packaged Tauri still one-shots Ask AI via run_llm_cli. (open)
- [[Ticket-01M19Z6Z5DJ54227R1WYVVX2GF]] Insert Table nests when the caret is already in a table — Insert Table (toolbar or /tab) while the caret is already in a table can nest a table, because cells allow block+. (done)
- [[Ticket-01M19Z6Z6X06VRZM95741Y2748]] DocCommands batch should resolve against the original document — DocCommands apply sequentially against the updated markdown. (done)
- [[Ticket-01M1ABYDSANE2N1W2HDTF350EV]] Autosave races page teardown, so a write aborts and the E2E gate trips — Two related problems, one symptom: an in-flight POST /api/fs/write cancelled when the page navigates, which the page-error gate correctly refuses to ignore. (done)
- [[Ticket-01M1ABZH14RJDDJ7M7HT3TZKYW]] Ask AI does not say when a reply was cut off at max_tokens — The Anthropic stream stops at max_tokens (8192) without telling anyone. (open)

Progress: 10/13 done

## Linked PRs

- [[PR-43]]
