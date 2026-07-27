# Verify and fix the claude CLI system-prompt contract in cliWrappers

`01KYFZ6RBHW4FJK9EGFAQ3XNJX` · task/bug · **done**

`src/lib/cliWrappers.ts`'s `claude` case passes `--system <prompt>` with a comment admitting
it's a guess.

## Hierarchy

- epic: [[Ticket-01KYFZ6RBHABFSC9K9NJ90168Q]] Motion next development phase — Close the gap between Motion's stated vision (organize/edit/visualize documentation, local-first) and what a user can actually reach today: several real, working modules (enrichment pipeline, editor extensions) have no UI entry point, plus a pre-existing editor mode-desync data-loss bug.

## Subtasks

- [[Ticket-01KYFZ6RBH4J746JDANTQKYVSN]] Rename/dedupe EnrichmentTools.test.ts to match what it actually tests (no matching — EnrichmentTools.ts exists; the test re-tests TopicRefiner/SkillGenerator/TOCGenerator under a
misleading name) (done)
- [[Ticket-01KYFZ6RBHBG53PG8SKVMMNCC4]] Verify and fix the claude CLI system-prompt argument in cliWrappers.callLLM — Verify and fix the claude CLI system-prompt argument in cliWrappers.callLLM (done)

Progress: 2/2 done
