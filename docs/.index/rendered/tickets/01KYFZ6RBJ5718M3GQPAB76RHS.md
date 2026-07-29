# Real diagram generation, and scope a real ImageGen backend

`01KYFZ6RBJ5718M3GQPAB76RHS` · task/feature · **done**

DiagramGenExtension and ImageGenExtension both fully mock generation with a setTimeout and
keyword-matched fake output; no backend exists for either.

## Hierarchy

- epic: [[Ticket-01KYFZ6RBHABFSC9K9NJ90168Q]] Motion next development phase — Close the gap between Motion's stated vision (organize/edit/visualize documentation, local-first) and what a user can actually reach today: several real, working modules (enrichment pipeline, editor extensions) have no UI entry point, plus a pre-existing editor mode-desync data-loss bug.

## Subtasks

- [[Ticket-01KYFZ6RBJCWMMF7THJZFB6943]] Real diagram generation via cliWrappers.callLLM + Mermaid-validate-before-accept, — mirroring ContentInjector.verifyCodeBlocks()'s cheap-check-before-accept pattern (done)
- [[Ticket-01KYFZ6RBJEYPZ9RX0F86490TM]] Research spike: what a real ImageGen backend would require (candidate CLIs/APIs, — Decision (user-confirmed): use the locally-installed `imagen` CLI (wraps Google's Gemini Imagen API, already configured with a working API key on this machine). (done)
- [[Ticket-01KYJXSMV02C0PP9H8BKE1PNEZ]] sanitizeSvg strips Mermaid's HTML-based node labels (foreignObject), leaving diagrams with empty shapes and no text — DOMPurify's svg-only sanitize profile in src/lib/sanitize.ts hard-excludes the foreignObject tag (a known SVG XSS vector), which is how Mermaid renders flowchart/state-diagram node labels (HTML span/p inside foreignObject, not plain SVG <text>). (done)
- [[Ticket-01KYJXSYEZ97M9638S91GYZWV0]] Mermaid's internal parse-error UI ('bomb' error graphic) injects into document.body instead of staying inside the failing block's container — Observed while live-verifying the sanitizeSvg fix: when an AI-generated diagram has invalid Mermaid syntax, DiagramGenExtension.tsx correctly catches the error and shows its own inline message, but mermaid.render() itself also has a side effect of appending a bomb-icon error overlay to document.body -- outside any of our React-managed containers, appearing as a stray fixed-position toast unrelated to the failing block's on-screen position. (done)

Progress: 4/4 done
