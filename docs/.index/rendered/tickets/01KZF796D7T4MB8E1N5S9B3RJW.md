# Zoom the app with ⌘+, ⌘− and ⌘0

`01KZF796D7T4MB8E1N5S9B3RJW` · task/feature · **open**

Let the user change text size from the keyboard and have Motion remember it.

## Hierarchy

- epic: [[Ticket-01KZF796D647FD32J1W2452NWM]] CLI file argument, unsaved-changes guard, and editor zoom — Three independent usability gaps found while dogfooding the motion CLI.

## Subtasks

- [[Ticket-01KZF796D88VACJ230R487YY1K]] Implement `src/lib/zoom.ts` and the `useZoom` hook with debounced persistence — Implement `src/lib/zoom.ts` and the `useZoom` hook with debounced persistence (open)
- [[Ticket-01KZF796D88XT43Y4PTYPCKP7E]] Write `e2e/zoom.spec.ts` asserting the computed root font size and survival across reload — Write `e2e/zoom.spec.ts` asserting the computed root font size and survival across reload (open)
- [[Ticket-01KZF796D89YD00DR64VGVAJ1V]] Mount it in `src/App.tsx` and apply the saved value at boot — Mount it in `src/App.tsx` and apply the saved value at boot (open)
- [[Ticket-01KZF796D8GRCQVQYQ8RM2J301]] Run `bun run verify` and commit — Run `bun run verify` and commit (open)
- [[Ticket-01KZF796D8QZRGNVV5VS2VJKMH]] Write failing tests for the scale reducer — Write failing tests for the scale reducer (open)

Progress: 0/5 done
