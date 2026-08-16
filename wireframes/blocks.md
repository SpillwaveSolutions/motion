# Screen: Content blocks

## Goal
Five atom blocks live in the document, survive save/reload as real blocks (pre data-type, not plain code), and expose edit / run / generate without leaving the note.

## Shared chrome

Each block is a card: type label on the left, actions on the right, body below. Draggable atom. Insert via toolbar or slash menu.

```
+--------------------------------------------------+
| [icon] TYPE LABEL                    [actions]   |
+--------------------------------------------------+
| body (preview, table, image, or editor)          |
+--------------------------------------------------+
```

## Mermaid

| Element | Behavior |
|---------|----------|
| Label | Mermaid Diagram |
| View | Sanitized SVG, centered |
| Edit | Swaps to textarea titled Edit Mermaid Diagram; Cancel / Save |
| Error | In-block red banner. Failed parse must not leave mermaid orphans on document.body |

Default source: graph TD A[Start] --> B[End].

## Dataset

| Element | Behavior |
|---------|----------|
| Fields | source (workspace-relative CSV/JSON/JSONL), name, optional limit |
| View | Preview table of registered rows |
| Error | Load error if the file is missing from the open workspace |

Welcome demo expects sample-data.csv and sample-events.jsonl in the workspace.

## Query

| Element | Behavior |
|---------|----------|
| Label | SQL Query |
| View | SQL as code plus result table |
| Edit | Textarea; Cancel / Save |
| Run | Re-executes; button shows Running... while in flight |
| Empty | No results |
| Error | In-block error (including non-SELECT / unsafe SQL) |

SQL is SELECT/WITH only, validated identifiers, clamped row limit. Cannot modify data.

## AI Image

| Element | Behavior |
|---------|----------|
| Label | AI Image Generation |
| Base Prompt | Text field |
| Generate | Disabled if prompt empty or loading. Label Generate or Regenerate |
| Refine | Shown after a src exists. Enter or Refine button. Disabled if refinement empty |
| Preview | img alt=prompt, or dashed empty (Enter a prompt and click Generate) |
| Loading | Overlay Imagining changes... or Initializing AI model... |
| Error | In-block; imagen CLI required |

## AI Diagram

| Element | Behavior |
|---------|----------|
| Prompt | Natural language |
| Generate | Calls claude CLI, writes Mermaid source, renders |
| Error | In-block if CLI missing or generation fails |

## States
- **Default insert**: Sensible empty/default attrs; cursor in a new paragraph after the block.
- **Persisted**: Reload restores the same node type (not a fenced code block).
- **CLI missing**: Image/diagram show an error, do not crash the editor.

## Acceptance Criteria
- [ ] All five block types insert from the toolbar and the slash menu.
- [ ] Blocks round-trip through save/reload as the same node types.
- [ ] Mermaid renders SVG or an in-block error (never a blank card).
- [ ] Query Edit/Run/Save/Cancel exist; results render as a table or No results.
- [ ] Query cannot run non-SELECT statements.
- [ ] Image Generate is disabled without a prompt; Refine appears only after an image exists.
- [ ] Dataset/Query files must live inside the open workspace jail.
- [ ] Generated SVG/HTML is sanitized before insertion.

## Notes
- Sources: MermaidExtension, DatasetExtension, QueryExtension, ImageGenExtension, DiagramGenExtension.
