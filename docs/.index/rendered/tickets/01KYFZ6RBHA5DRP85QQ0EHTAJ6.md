# Give editor extensions a creation UX

`01KYFZ6RBHA5DRP85QQ0EHTAJ6` · task/feature · **in-progress**

DatasetExtension, QueryExtension, MermaidExtension, DiagramGenExtension, and ImageGenExtension
are real, working TipTap nodes with zero UI affordance to create one — no slash command, input
rule, or toolbar button.

## Hierarchy

- epic: [[Ticket-01KYFZ6RBHABFSC9K9NJ90168Q]] Motion next development phase — Close the gap between Motion's stated vision (organize/edit/visualize documentation, local-first) and what a user can actually reach today: several real, working modules (enrichment pipeline, editor extensions) have no UI entry point, plus a pre-existing editor mode-desync data-loss bug.

## Subtasks

- [[Ticket-01KYFZ6RBHBTXGWG8HREAG8AG9]] "/" slash-command popup wired to the same insertion actions (hand-rolled minimal popup, — not a new @tiptap/suggestion dependency, for 5 fixed commands) (open)
- [[Ticket-01KYFZ6RBHZQWH62SK631C3H1K]] Toolbar buttons to insert each of the 5 block extensions, reusing the existing — ToolbarButton component pattern in Toolbar.tsx (done)

Progress: 1/2 done
