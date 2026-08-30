# Screen: Ask AI

## Goal
Edit a note with AI the way old Notion did: select text or type `/ai`, give an
instruction, preview the reply, then commit it as one undoable edit. Toolbar
**Refine** is the same pipeline scoped to the whole document. Never silently
replace the note. Tokens stream into the preview as they arrive.

## Layout

```
WYSIWYG / Split
+------------------------------------------------------------------+
| toolbar … | Refine | Find                                        |
+------------------------------------------------------------------+
| Ask AI panel (prompt / working / preview / error) — docked       |
|   chips: Rewrite  Tighten  Expand  Fix grammar  Continue         |
|   [ instruction textarea ]                         [ Ask AI ]    |
|   --- or ---                                                     |
|   Asking AI…                                                     |
|   Preview (live tokens, mono, scroll)                            |
|   [ Discard ]                                                    |
|   --- or ---                                                     |
|   Preview (mono, scroll)                                         |
|   [ Replace ] [ Insert below ] [ Try again ] [ Discard ]         |
+------------------------------------------------------------------+
| document                                                         |
|   selected text                                                  |
|      [ Ask AI ]  <- floating bubble, above the selection         |
+------------------------------------------------------------------+

Markdown mode: toolbar + Refine + the same docked panel. No bubble, no slash.
```

The bubble is `position: fixed` from `coordsAtPos` (same pattern as the slash
menu). The prompt/preview is **docked under the toolbar**, not a second floating
layer — a long reply has to be readable.

## Key Elements

| Element | Type | Behavior / Notes |
|---------|------|------------------|
| Ask AI bubble | button | Visible on a non-empty WYSIWYG/Split text selection. `aria-label` **Ask AI**. `onMouseDown` preventDefault so the selection stays valid. Hidden in Markdown mode, while the panel is open, and when the slash menu is open. |
| Slash **Ask AI** | option | First slash command (`kind: "ai"`). `/ai` filters with Ask AI first. `/mer` still Mermaid. Consumes the `/query` text, opens the prompt at the cursor. |
| Slash listbox | listbox | `aria-label` **Slash commands** (no longer insert-only). |
| Instruction | textarea | `aria-label` **Ask AI instruction**. ⌘/Ctrl+Enter submits. Empty instruction does not submit. |
| Canned chips | buttons | Selection: Rewrite, Tighten, Expand, Fix grammar. Cursor: Continue, Expand. Document (if the prompt is shown): Refine, Fix grammar. A chip fills the instruction and submits. |
| Ask AI (submit) | button | Disabled when the instruction is blank or a call is in flight. |
| Preview body | region | `aria-label` **AI preview** when complete. Raw markdown, mono, scroll. During **working**, the same body fills in as tokens arrive. The document is not mutated until Replace / Insert below. |
| Replace | button | One ProseMirror transaction (or markdown-buffer replace). Default for selection and Refine. Hidden for cursor-only (`/ai`). |
| Insert below | button | Inserts at the end of the stored range. Hidden for Refine / document scope. Default for cursor-only. |
| Try again | button | Re-runs the same instruction. Visible on preview and error. Hits the prompt cache prefix (title + surrounding text + prior ops) so the SDK can reuse it. |
| Discard | button | Closes the panel, applies nothing, **aborts** an in-flight stream. Escape does the same while the panel is open. |
| Working | status | Copy **Asking AI…**. `aria-busy`. Live tokens appear under the status when any text has arrived. Discard still works (cancels). |
| Error | alert | The failure message lives in the panel. No `window.alert`. HTTP 200 SSE `{type:"error"}` so the E2E ≥400 gate does not fire. |
| Refine | toolbar | Document-scoped Ask AI. One click runs the canned Refine instruction and opens the preview. No Insert below. Disabled while a call is in flight or the panel is already open. Works in all three view modes. |

## States
- **Idle**: no bubble, no panel.
- **Bubble**: non-empty WYSIWYG/Split selection.
- **Prompt**: textarea + chips. Editor is not editable so the stored range stays valid.
- **Working**: Asking AI… plus streaming tokens. Editor not editable. Discard aborts.
- **Preview**: reply shown; Replace / Insert below / Try again / Discard per scope.
- **Error**: message + Try again / Discard. Same panel, not an alert.
- **Markdown mode**: Refine only (panel). No bubble. No slash menu.
- **Empty note**: Refine is a no-op (nothing to send).

## Acceptance Criteria
- [ ] Selecting text in WYSIWYG/Split shows an **Ask AI** bubble; Markdown mode never does.
- [ ] `/` at the start of a block lists **Ask AI** first; `/ai` highlights Ask AI; `/mer` still inserts Mermaid.
- [ ] `/ai` (Enter or click) opens the prompt and consumes the slash query.
- [ ] A reply is previewed before any document mutation.
- [ ] Tokens appear in the panel while the call is in flight (working + preview body).
- [ ] Discard during working cancels the request; the document is unchanged.
- [ ] Replace and Insert below each apply as a single undo step (⌘Z undoes the whole AI op).
- [ ] Refine uses this panel, hides Insert below, and does not `alert()` on failure.
- [ ] Escape / Discard leaves the document unchanged.
- [ ] Try again re-runs the same instruction.
- [ ] Failure copy is in the panel (no alert, no uncaught exception, no HTTP ≥400).
- [ ] Markdown mode: Refine preview + Replace still work.

## Notes
- Transport is `POST /api/ai/stream` (SSE, always HTTP 200). The shared TS
  service (`src/lib/ai/service.ts`) talks to the Anthropic SDK when
  `ANTHROPIC_API_KEY` is set, otherwise the `claude` CLI one-shot. Prompt cache
  breakpoints sit on the system prompt and the packed document context.
  Packaged Tauri without a sidecar still falls back to `run_llm_cli` (one
  chunk). Sidecar is a later task — do not add a second Rust LLM loop.
- Context is packed by `buildAiContext` (title, surrounding text, selection,
  prior accepted ops). Per-doc session is `sessionForDoc`.
- Source: `src/lib/ai/*`, `src/components/Editor/AskAi.tsx`, `insertBlock.ts`, `index.tsx`.
- Related: [slash-menu.md](./slash-menu.md), [editor.md](./editor.md).
