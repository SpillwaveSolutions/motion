# B14 fixed: list_markdown_files no longer re-roots the workspace jail

`01KYNKG3ZD866C3AGQS20T6H8J` · subtask/bug · **done**

list_markdown_files used to overwrite WorkspaceState with any directory passed to it -- a second write path into the jail that bypassed the folder dialog, so any caller could silently re-root the sandbox.

## Hierarchy

- task: [[Ticket-01KYK6NHSGP58Q6GQ3Z3HEMXXN]] Phase 1: make web mode a real filesystem backend — The keystone.
- epic: [[Ticket-01KYK6NHSFJNG9XV6D8K5SHWCV]] Validation loop: prove the UI works before the human launches it — Motion has real features and no way to know whether they work.
