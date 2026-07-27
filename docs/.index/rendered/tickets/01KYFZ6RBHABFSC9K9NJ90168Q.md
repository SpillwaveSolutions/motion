# Motion next development phase

`01KYFZ6RBHABFSC9K9NJ90168Q` · epic/feature · **open**

Close the gap between Motion's stated vision (organize/edit/visualize documentation, local-first) and what a user can actually reach today: several real, working modules (enrichment pipeline, editor extensions) have no UI entry point, plus a pre-existing editor mode-desync data-loss bug.

## Children

- [[Ticket-01KYFZ6RBHA5DRP85QQ0EHTAJ6]] Give editor extensions a creation UX — DatasetExtension, QueryExtension, MermaidExtension, DiagramGenExtension, and ImageGenExtension
are real, working TipTap nodes with zero UI affordance to create one — no slash command, input
rule, or toolbar button. (done)
- [[Ticket-01KYFZ6RBHDMXV57V4JZW3PS5K]] Fix editor mode-desync between WYSIWYG, Markdown, and Split views — `src/components/Editor/index.tsx` keeps two independent sources of truth — the TipTap editor
document and the rawMarkdown string state — that only reconcile in handleSave and the
file-load effect. (done)
- [[Ticket-01KYFZ6RBHW4FJK9EGFAQ3XNJX]] Verify and fix the claude CLI system-prompt contract in cliWrappers — `src/lib/cliWrappers.ts`'s `claude` case passes `--system <prompt>` with a comment admitting
it's a guess. (done)
- [[Ticket-01KYFZ6RBJ5718M3GQPAB76RHS]] Real diagram generation, and scope a real ImageGen backend — DiagramGenExtension and ImageGenExtension both fully mock generation with a setTimeout and
keyword-matched fake output; no backend exists for either. (open)
- [[Ticket-01KYFZ6RBJC07FEQ0FT0KQ302M]] Fix web/dev storage mock so Dataset/Query are testable outside Tauri — WebStorage.readFile only returns real content for three hardcoded demo paths; any other
filename returns a placeholder string. (in-progress)
- [[Ticket-01KYFZ6RBJV920SFW0MAN9MX9J]] Wire the per-note enrichment action into the UI — cliWrappers, TopicRefiner, TOCGenerator, SkillGenerator, and ContentInjector are all real,
tested, working modules with zero imports from App.tsx or anything under src/components/ — only
their own test files ever call them. (open)

Progress: 3/6 done
