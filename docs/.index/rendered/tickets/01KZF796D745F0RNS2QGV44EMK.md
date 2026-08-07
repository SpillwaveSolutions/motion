# Add a validated zoom level to settings

`01KZF796D745F0RNS2QGV44EMK` · task/feature · **open**

Store the zoom level in the settings file so it survives restarts, clamped where every other setting is validated so a hand-edited file cannot make the app unreadable.

## Hierarchy

- epic: [[Ticket-01KZF796D647FD32J1W2452NWM]] CLI file argument, unsaved-changes guard, and editor zoom — Three independent usability gaps found while dogfooding the motion CLI.

## Subtasks

- [[Ticket-01KZF796D70MHWVDM1PZGFDCPN]] Run `bun test src/lib/settings.test.ts` green and commit — Run `bun test src/lib/settings.test.ts` green and commit (open)
- [[Ticket-01KZF796D75QVQM6MQYPGVMSKE]] Write failing tests for `zoom` absent, out of range, and non-numeric — Write failing tests for `zoom` absent, out of range, and non-numeric (open)
- [[Ticket-01KZF796D7ZQYQQPP1BX3H9HQB]] Add the field, default, and clamp to `src/lib/settings.ts` — Add the field, default, and clamp to `src/lib/settings.ts` (open)

Progress: 0/3 done
