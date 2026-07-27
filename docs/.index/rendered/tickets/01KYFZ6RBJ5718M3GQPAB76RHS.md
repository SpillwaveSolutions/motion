# Real diagram generation, and scope a real ImageGen backend

`01KYFZ6RBJ5718M3GQPAB76RHS` · task/feature · **in-progress**

DiagramGenExtension and ImageGenExtension both fully mock generation with a setTimeout and
keyword-matched fake output; no backend exists for either.

## Hierarchy

- epic: [[Ticket-01KYFZ6RBHABFSC9K9NJ90168Q]] Motion next development phase — Close the gap between Motion's stated vision (organize/edit/visualize documentation, local-first) and what a user can actually reach today: several real, working modules (enrichment pipeline, editor extensions) have no UI entry point, plus a pre-existing editor mode-desync data-loss bug.

## Subtasks

- [[Ticket-01KYFZ6RBJCWMMF7THJZFB6943]] Real diagram generation via cliWrappers.callLLM + Mermaid-validate-before-accept, — mirroring ContentInjector.verifyCodeBlocks()'s cheap-check-before-accept pattern (done)
- [[Ticket-01KYFZ6RBJEYPZ9RX0F86490TM]] Research spike: what a real ImageGen backend would require (candidate CLIs/APIs, — local-first implications, rough integration shape) — output is a decision/design doc, not code (open)

Progress: 1/2 done
