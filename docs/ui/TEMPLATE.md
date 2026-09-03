# &lt;Screen name&gt;

**Source:** `src/components/.../Foo.tsx`
**Reach:** `/` → click X → click Y
**States:** a, b, c

> Copy this file to `docs/ui/<screen>.md` and fill it in. One document per screen
> *family* — spec and rubric live together because they are read together and rot
> together.

## Spec

What the screen is for. Its layout regions. What data comes in, what actions go
out. Keyboard affordances. Empty, loading, and error states.

## Addressability

How an agent targets things here. Prefer roles and names; add a testid only where
visible text is absent or ambiguous.

| What | Selector |
|---|---|
| container | `[data-testid="foo-root"]` |
| primary action | `role=button[name="Save"]` |

## Capture recipe

**Mandatory, not optional.** Almost nothing in this app has a deep URL — shell
state is React-internal — so a screen that does not document its click path
cannot be captured by anyone who did not write it.

1. Seed `localStorage["motion-ui-freeze"] = "1"`
2. Load `/`, viewport 1280×800
3. Wait for `[data-app-ready]`
4. &lt;click sequence&gt;
5. Wait for the state marker
6. Screenshot → `.artifacts/screenshots/ui/&lt;name&gt;.png`

## Wireframe

![](wireframes/png/foo-01-default.png) — source `wireframes/foo-01-default.puml`

## Rubric

Keep **Must Match** to 6–10 items. Mark each row `check:<e2e test name>` (merge
gate) or `agent` (PR report only).

### Must Match
- [ ] Structure, ordering, presence — the things a bad redesign would break — `check:…` or `agent`

### Acceptable Differences
- Font hinting, sub-pixel spacing, scrollbar presence
- Dynamic data (names, timestamps, counts)
- Wireframe proportion and monochrome Salt styling

### Must NOT Appear
- Hover affordances while capturing a rest state
- Spinners / volatile values (unless the state is *about* them)

### Failure Criteria
- Overlapping or clipped content, unreadable contrast, a control off-screen

## Out of scope

List sibling screens that own their own docs.
