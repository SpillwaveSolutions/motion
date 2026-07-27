# Mermaid's internal parse-error UI ('bomb' error graphic) injects into document.body instead of staying inside the failing block's container

`01KYJXSYEZ97M9638S91GYZWV0` · task/bug · **open**

Observed while live-verifying the sanitizeSvg fix: when an AI-generated diagram has invalid Mermaid syntax, DiagramGenExtension.tsx correctly catches the error and shows its own inline message, but mermaid.render() itself also has a side effect of appending a bomb-icon error overlay to document.body -- outside any of our React-managed containers, appearing as a stray fixed-position toast unrelated to the failing block's on-screen position.

## Hierarchy

- task: [[Ticket-01KYFZ6RBJ5718M3GQPAB76RHS]] Real diagram generation, and scope a real ImageGen backend — DiagramGenExtension and ImageGenExtension both fully mock generation with a setTimeout and
keyword-matched fake output; no backend exists for either.
- epic: [[Ticket-01KYFZ6RBHABFSC9K9NJ90168Q]] Motion next development phase — Close the gap between Motion's stated vision (organize/edit/visualize documentation, local-first) and what a user can actually reach today: several real, working modules (enrichment pipeline, editor extensions) have no UI entry point, plus a pre-existing editor mode-desync data-loss bug.
