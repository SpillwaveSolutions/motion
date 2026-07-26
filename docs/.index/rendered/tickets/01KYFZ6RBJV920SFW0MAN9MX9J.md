# Wire the per-note enrichment action into the UI

`01KYFZ6RBJV920SFW0MAN9MX9J` · task/feature · **open**

cliWrappers, TopicRefiner, TOCGenerator, SkillGenerator, and ContentInjector are all real,
tested, working modules with zero imports from App.tsx or anything under src/components/ — only
their own test files ever call them.

## Hierarchy

- epic: [[Ticket-01KYFZ6RBHABFSC9K9NJ90168Q]] Motion next development phase — Close the gap between Motion's stated vision (organize/edit/visualize documentation, local-first) and what a user can actually reach today: several real, working modules (enrichment pipeline, editor extensions) have no UI entry point, plus a pre-existing editor mode-desync data-loss bug.

## Subtasks

- [[Ticket-01KYFZ6RBJZNYDT9AK2V0RA11T]] Per-note "AI Refine"/"Generate Summary" toolbar action backed by ContentInjector — Per-note "AI Refine"/"Generate Summary" toolbar action backed by ContentInjector (open)

Progress: 0/1 done
