# Fix web/dev storage mock so Dataset/Query are testable outside Tauri

`01KYFZ6RBJC07FEQ0FT0KQ302M` · task/bug · **done**

WebStorage.readFile only returns real content for three hardcoded demo paths; any other
filename returns a placeholder string.

## Hierarchy

- epic: [[Ticket-01KYFZ6RBHABFSC9K9NJ90168Q]] Motion next development phase — Close the gap between Motion's stated vision (organize/edit/visualize documentation, local-first) and what a user can actually reach today: several real, working modules (enrichment pipeline, editor extensions) have no UI entry point, plus a pre-existing editor mode-desync data-loss bug.

## Subtasks

- [[Ticket-01KYFZ6RBJ18SB2ZCSFK06BNJ2]] WebStorage.readFile/listFiles read real files via Bun.file instead of hardcoded branches — WebStorage.readFile/listFiles read real files via Bun.file instead of hardcoded branches (done)
- [[Ticket-01KYFZ6RBJT7FG0G30WYS3YF6Q]] File picker for Dataset's source field, populated from storage.listFiles — File picker for Dataset's source field, populated from storage.listFiles (done)

Progress: 2/2 done
