# Fix editor mode-desync between WYSIWYG, Markdown, and Split views

`01KYFZ6RBHDMXV57V4JZW3PS5K` · task/bug · **done**

`src/components/Editor/index.tsx` keeps two independent sources of truth — the TipTap editor
document and the rawMarkdown string state — that only reconcile in handleSave and the
file-load effect.

## Hierarchy

- epic: [[Ticket-01KYFZ6RBHABFSC9K9NJ90168Q]] Motion next development phase — Close the gap between Motion's stated vision (organize/edit/visualize documentation, local-first) and what a user can actually reach today: several real, working modules (enrichment pipeline, editor extensions) have no UI entry point, plus a pre-existing editor mode-desync data-loss bug.

## Subtasks

- [[Ticket-01KYFZ6RBH7SW7J03FYN4XZ08J]] Sync content on viewMode transitions in Editor/index.tsx, reusing the existing — marked/turndown/sanitizeHtml calls (done)

Progress: 1/1 done
