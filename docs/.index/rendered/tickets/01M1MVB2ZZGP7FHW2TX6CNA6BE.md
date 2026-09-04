# Editor surface, zoom scope, resizable layout, icon toolbar, and window drag

`01M1MVB2ZZGP7FHW2TX6CNA6BE` · epic/feature · **done**

Mac dogfood of 0.6.3: keep TOC.md, replace SKILL.md with a folder README, zoom content not chrome, drop the editor max-width cap, resize sidebar and split, show zoom percent, icon toolbar, and actually drag the window from the header.

## Children

- [[Ticket-01M1MVB2ZZFQX90WHGB0CA99RW]] Replace SKILL.md with a generated folder README — Synthesize keeps TOC.md. (done)
- [[Ticket-01M1MVB3005Z8WSN5R6KEW5BNN]] Replace header action labels with standard icons — New src/components/icons.tsx with seven inline SVGs (share, copy, open folder,
new note, new folder, save, synthesize) from a permissively licensed set;
record source and license in a comment. (done)
- [[Ticket-01M1MVB300EAR8PX5HKEACTKP1]] Make the header drag the window — Regression against 0.6.3. (done)
- [[Ticket-01M1MVB300TGVNPJBG8GJ6KG1T]] Scale content without scaling chrome — Stop writing documentElement.style.fontSize. (done)
- [[Ticket-01M1MVB300WHXWP5177D3BNDB2]] Let the panes grow and be resized — Remove max-width 900px from .editor-container and the inline 1400px split
override. (done)
- [[Ticket-01M1MVB300WYDPA67T9FNDM51R]] Show the zoom level briefly — Transient overlay with the rounded percentage on every zoom change, hidden
after ~1s. (done)

Progress: 6/6 done

## Linked PRs

- [[PR-56]]
- [[PR-57]]
