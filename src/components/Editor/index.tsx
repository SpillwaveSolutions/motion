import { useEffect, useRef, useState, useCallback } from "react";
import { useEditor, EditorContent, type Editor as TiptapEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import Toolbar from "./Toolbar";
import { FindBar, findInPmDoc, findInString } from "./FindBar";
import {
    filterSlashCommands,
    insertBlock,
    slashCommandKey,
    type SlashCommand,
} from "./insertBlock";
import { AskAiBubble, AskAiPanel, askAiStatesEqual, isAskAiPanelOpen, type AskAiState } from "./AskAi";
import { MarkdownPreview, MarkdownSource } from "./MarkdownSource";
import { applySerializedMarkdown } from "./dirtyBaseline";
import MermaidExtension from "./extensions/MermaidExtension";
import { DatasetExtension } from "./extensions/DatasetExtension";
import { QueryExtension } from "./extensions/QueryExtension";
import { ImageGenExtension } from "./extensions/ImageGenExtension";
import { DiagramGenExtension } from "./extensions/DiagramGenExtension";
import { tableKit } from "./extensions/tableKit";
import { htmlToMarkdown, markdownToHtml } from "./markdown";
import { storage } from "../../lib/storage";
import { escapeHtmlText, sanitizeHtml } from "../../lib/sanitize";
import {
    clampPos,
    dispatchDocCommands,
    planWysiwygApply,
    REFINE_INSTRUCTION,
    sessionForDoc,
    streamAskAiFromUI,
    summarizeReply,
    titleFromPath,
    type AiApplyMode,
    type AiScope,
    type CannedPrompt,
} from "../../lib/ai";

const lowlight = createLowlight(common);

type ViewMode = "wysiwyg" | "markdown" | "split";
export type SaveState = "idle" | "saving" | "saved" | "error";

// Leaving markdown mode is the only transition that needs an explicit push:
// wysiwyg/split edits keep rawMarkdown current via onUpdate, but typing in
// the markdown textarea never touches the editor doc directly.
export function shouldSyncMarkdownIntoEditor(
    prevMode: ViewMode | null,
    nextMode: ViewMode
): boolean {
    return prevMode === "markdown" && nextMode !== "markdown";
}

interface EditorProps {
    viewMode: ViewMode;
    filePath: string | null;
    saveSignal?: number;
    onSaveStateChange?: (state: SaveState) => void;
    onDirtyChange?: (dirty: boolean) => void;
    onSaved?: (path: string, content: string) => void;
    onMarkdownChange?: (markdown: string) => void;
}

interface SlashMenuState {
    range: { from: number; to: number };
    query: string;
    position: { top: number; left: number };
    selectedIndex: number;
}

// Slash menu only triggers when "/" is the very first character of the
// current block, followed by a whitespace-free query -- e.g. typing a
// normal "and/or" mid-sentence never opens it. Matches Notion-style
// slash-command scoping without needing prefix-boundary heuristics.
function detectSlashTrigger(editor: TiptapEditor): SlashMenuState | null {
    const { selection } = editor.state;
    if (!selection.empty) return null;
    const { $from } = selection;
    const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, "￼");
    const match = /^\/(\S*)$/.exec(textBefore);
    if (!match) return null;
    const coords = editor.view.coordsAtPos($from.pos);
    return {
        range: { from: $from.start(), to: $from.pos },
        query: match[1] ?? "",
        position: { top: coords.bottom, left: coords.left },
        selectedIndex: 0,
    };
}

function readSelectionBubble(editor: TiptapEditor): AskAiState | null {
    const { from, to, empty } = editor.state.selection;
    if (empty) return null;
    const selectedText = editor.state.doc.textBetween(from, to, "\n");
    if (!selectedText) return null;
    let start;
    let end;
    try {
        start = editor.view.coordsAtPos(from);
        end = editor.view.coordsAtPos(to);
    } catch {
        return null;
    }
    const selTop = Math.min(start.top, end.top);
    const selBottom = Math.max(start.bottom, end.bottom);
    const top = selTop > 48 ? selTop - 40 : selBottom + 4;
    const left = Math.min(start.left, end.left);
    return {
        phase: "bubble",
        range: { from, to },
        selectedText,
        top,
        left,
    };
}

function surroundingText(
    editor: TiptapEditor,
    range: { from: number; to: number } | null
): { before: string; after: string; selection: string | null } {
    const doc = editor.state.doc;
    const from = range?.from ?? editor.state.selection.from;
    const to = range?.to ?? editor.state.selection.to;
    const size = doc.content.size;
    const safeFrom = clampPos(from, size);
    const safeTo = clampPos(to, size);
    return {
        before: doc.textBetween(1, Math.min(safeFrom, size), "\n"),
        after: doc.textBetween(Math.min(safeTo, size), size, "\n"),
        selection: safeTo > safeFrom ? doc.textBetween(safeFrom, safeTo, "\n") : null,
    };
}

const welcomeHTML = `
<h1>Welcome to Motion</h1>
<p>Motion is a <strong>local-first technical writing IDE</strong>. Select a folder to start editing your notes.</p>

<pre data-type="mermaid"><code class="language-mermaid">graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B</code></pre>

<h2>Data Analysis (Phase 3)</h2>
<p>Linked local CSV data and SQL queries powered by DuckDB WASM:</p>

<pre data-type="dataset"><code class="language-dataset">source: sample-data.csv
name: team
limit: 5</code></pre>

<pre data-type="dataset"><code class="language-dataset">source: sample-events.jsonl
name: events
limit: 5</code></pre>

<pre data-type="query"><code class="language-query">sql: SELECT team.name, events.event, events.timestamp FROM team JOIN events ON team.name = events.user ORDER BY events.timestamp DESC</code></pre>

<h2>Generative Features (Phase 4)</h2>
<p>Create visual assets and diagrams directly from natural language prompts:</p>
<pre data-type="image-gen"><code class="language-image-gen">prompt: A futuristic cyberpunk city at night with neon signs and flying cars</code></pre>

<p>Or generate technical diagrams with Mermaid:</p>
<pre data-type="diagram-gen"><code class="language-diagram-gen">prompt: A sequence diagram for a login flow</code></pre>
`;

function Editor({
    viewMode,
    filePath,
    saveSignal = 0,
    onSaveStateChange,
    onDirtyChange,
    onSaved,
    onMarkdownChange,
}: EditorProps) {
    const [rawMarkdown, setRawMarkdown] = useState("");
    const rawMarkdownRef = useRef("");
    rawMarkdownRef.current = rawMarkdown;
    const [saveState, setSaveState] = useState<SaveState>("idle");
    const [dirty, setDirty] = useState(false);
    const snapshotRef = useRef("");
    const hydratingRef = useRef(false);
    const hydrateGenRef = useRef(0);
    const [findOpen, setFindOpen] = useState(false);
    const [findQuery, setFindQuery] = useState("");
    const [findIndex, setFindIndex] = useState(0);
    const findInputRef = useRef<HTMLInputElement>(null);
    const markdownRef = useRef<HTMLTextAreaElement>(null);
    // Tracks the previously active view mode so we can sync content only on
    // an actual mode transition, not on every render.
    const prevViewModeRef = useRef<ViewMode | null>(null);
    const viewModeRef = useRef(viewMode);
    viewModeRef.current = viewMode;
    const filePathRef = useRef(filePath);
    filePathRef.current = filePath;

    const [slashMenu, setSlashMenu] = useState<SlashMenuState | null>(null);
    const [inTable, setInTable] = useState(false);
    // editorProps callbacks are registered once at editor creation, so they
    // must read state/editor through refs to avoid closing over stale values.
    const slashMenuRef = useRef<SlashMenuState | null>(null);
    const editorRef = useRef<TiptapEditor | null>(null);
    const onMarkdownChangeRef = useRef(onMarkdownChange);
    onMarkdownChangeRef.current = onMarkdownChange;
    useEffect(() => {
        slashMenuRef.current = slashMenu;
    }, [slashMenu]);

    const [askAi, setAskAi] = useState<AskAiState>({ phase: "idle" });
    const askAiRef = useRef<AskAiState>(askAi);
    const setAskAiState = useCallback((next: AskAiState) => {
        if (askAiStatesEqual(askAiRef.current, next)) return;
        askAiRef.current = next;
        setAskAi(next);
    }, []);
    const genIdRef = useRef(0);
    const abortRef = useRef<AbortController | null>(null);

    const executeSlashCommand = useCallback((cmd: SlashCommand) => {
        const menu = slashMenuRef.current;
        const currentEditor = editorRef.current;
        if (!menu || !currentEditor) return;
        if (cmd.kind === "insert") {
            insertBlock(currentEditor, cmd.nodeType, menu.range);
            setSlashMenu(null);
            return;
        }
        currentEditor.chain().focus().deleteRange(menu.range).run();
        setSlashMenu(null);
        const pos = menu.range.from;
        setAskAiState({
            phase: "prompt",
            scope: "cursor",
            range: { from: pos, to: pos },
            selectedText: "",
            instruction: "",
        });
    }, [setAskAiState]);

    const syncOverlays = useCallback((ed: TiptapEditor) => {
        setInTable(ed.isActive("table"));
        if (isAskAiPanelOpen(askAiRef.current)) {
            setSlashMenu(null);
            return;
        }
        setSlashMenu(detectSlashTrigger(ed));
        queueMicrotask(() => {
            if (isAskAiPanelOpen(askAiRef.current)) return;
            if (slashMenuRef.current) {
                if (askAiRef.current.phase === "bubble") setAskAiState({ phase: "idle" });
                return;
            }
            const bubble = readSelectionBubble(ed);
            setAskAiState(bubble ?? { phase: "idle" });
        });
    }, [setAskAiState]);

    const executeSlashCommandRef = useRef(executeSlashCommand);
    executeSlashCommandRef.current = executeSlashCommand;
    const syncOverlaysRef = useRef(syncOverlays);
    syncOverlaysRef.current = syncOverlays;

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                codeBlock: false,
            }),
            tableKit,
            MermaidExtension,
            DatasetExtension,
            QueryExtension,
            ImageGenExtension,
            DiagramGenExtension,
            CodeBlockLowlight.configure({
                lowlight,
                defaultLanguage: "typescript",
            }),
        ],
        content: welcomeHTML,
        editorProps: {
            attributes: {
                class: "tiptap-editor",
            },
            // Registered once at editor creation -- reads slashMenuRef/
            // executeSlashCommand (both stable via refs/empty deps) rather
            // than closing over component state directly.
            handleKeyDown: (_view, event) => {
                const menu = slashMenuRef.current;
                if (!menu) return false;
                const filtered = filterSlashCommands(menu.query);
                if (event.key === "Escape") {
                    setSlashMenu(null);
                    return true;
                }
                if (event.key === "ArrowDown") {
                    setSlashMenu((m) =>
                        m ? { ...m, selectedIndex: (m.selectedIndex + 1) % Math.max(filtered.length, 1) } : m
                    );
                    return true;
                }
                if (event.key === "ArrowUp") {
                    setSlashMenu((m) =>
                        m
                            ? {
                                  ...m,
                                  selectedIndex:
                                      (m.selectedIndex - 1 + Math.max(filtered.length, 1)) %
                                      Math.max(filtered.length, 1),
                              }
                            : m
                    );
                    return true;
                }
                if (event.key === "Enter") {
                    const chosen = filtered[menu.selectedIndex];
                    if (chosen) {
                        executeSlashCommandRef.current(chosen);
                        return true;
                    }
                    setSlashMenu(null);
                    return false;
                }
                return false;
            },
        },
        // Keep rawMarkdown in sync with WYSIWYG/split edits as they happen, so
        // switching to markdown mode (or the split pane) never shows stale
        // content and no edits are lost. Also re-checks the slash-command
        // trigger, since typing after "/" changes the query.
        onUpdate: ({ editor: updatedEditor }) => {
            // Markdown mode's textarea is the source of truth. A Tiptap
            // onUpdate (setEditable, leftover transactions) must not clobber it.
            if (viewModeRef.current === "markdown") return;
            const md = htmlToMarkdown(updatedEditor.getHTML());
            if (hydratingRef.current) {
                const next = applySerializedMarkdown(
                    { snapshot: snapshotRef.current, hydrating: true },
                    md
                );
                snapshotRef.current = next.snapshot;
                setRawMarkdown(md);
                setDirty(false);
                onMarkdownChangeRef.current?.(md);
                syncOverlaysRef.current(updatedEditor);
                return;
            }
            setRawMarkdown(md);
            onMarkdownChangeRef.current?.(md);
            syncOverlaysRef.current(updatedEditor);
        },
        // Cursor movement (arrow keys, clicks) without a content change can
        // also enter/leave the "/" trigger position.
        onSelectionUpdate: ({ editor: updatedEditor }) => {
            if (viewModeRef.current === "markdown") return;
            syncOverlaysRef.current(updatedEditor);
        },
    });

    useEffect(() => {
        editorRef.current = editor;
    }, [editor]);

    const adoptHydratedBaseline = useCallback((ed: TiptapEditor) => {
        const gen = ++hydrateGenRef.current;
        const run = () => {
            if (gen !== hydrateGenRef.current) return;
            const md = htmlToMarkdown(ed.getHTML());
            snapshotRef.current = applySerializedMarkdown(
                { snapshot: md, hydrating: true },
                md
            ).snapshot;
            setRawMarkdown(md);
            setDirty(false);
            onMarkdownChangeRef.current?.(md);
            hydratingRef.current = false;
        };
        requestAnimationFrame(() => {
            requestAnimationFrame(run);
        });
    }, []);

    const askAiPanelOpen = isAskAiPanelOpen(askAi);
    useEffect(() => {
        if (!editor) return;
        editor.setEditable(!askAiPanelOpen);
    }, [editor, askAiPanelOpen]);

    useEffect(() => {
        genIdRef.current += 1;
        abortRef.current?.abort();
        abortRef.current = null;
        setAskAiState({ phase: "idle" });
        setSlashMenu(null);
    }, [filePath, setAskAiState]);

    /**
     * True while a write is in flight. A ref, not state: the debounced autosave
     * and an explicit ⌘S can both call this within one render, and state would
     * still read stale for the second caller.
     */
    const savingRef = useRef(false);

    // Handle saving
    const handleSave = useCallback(async (opts?: { silent?: boolean }) => {
        if (!editor || !filePath) return;

        // Two callers race for every save: the 1.5s autosave and the Save
        // button / ⌘S. Writing twice put a redundant POST on the wire whose
        // only observable effect was an aborted request when the page moved on
        // before it landed. Whoever gets here second has nothing left to write.
        if (savingRef.current) return;
        if (rawMarkdown === snapshotRef.current) {
            setSaveState("saved");
            return;
        }

        savingRef.current = true;
        setSaveState("saving");
        try {
            await storage.writeFile(filePath, rawMarkdown);
            snapshotRef.current = rawMarkdown;
            setDirty(false);
            setSaveState("saved");
            onSaved?.(filePath, rawMarkdown);
        } catch (error) {
            setSaveState("error");
            console.error("Failed to save file:", error);
            if (!opts?.silent) {
                alert(`Error saving file: ${error}`);
            }
        } finally {
            savingRef.current = false;
        }
    }, [editor, filePath, rawMarkdown, onSaved]);

    const saveRef = useRef(handleSave);
    saveRef.current = handleSave;

    useEffect(() => {
        onSaveStateChange?.(saveState);
    }, [saveState, onSaveStateChange]);

    useEffect(() => {
        onDirtyChange?.(dirty);
    }, [dirty, onDirtyChange]);

    useEffect(() => {
        if (!filePath) {
            setDirty(false);
            return;
        }
        setDirty(rawMarkdown !== snapshotRef.current);
    }, [rawMarkdown, filePath]);

    useEffect(() => {
        if (saveSignal === 0) return;
        void saveRef.current();
    }, [saveSignal]);

    useEffect(() => {
        if (!dirty || !filePath || saveState === "saving") return;
        const t = window.setTimeout(() => {
            void saveRef.current({ silent: true });
        }, 1500);
        return () => window.clearTimeout(t);
    }, [dirty, rawMarkdown, filePath, saveState]);

    const discardAskAi = useCallback(() => {
        genIdRef.current += 1;
        abortRef.current?.abort();
        abortRef.current = null;
        setAskAiState({ phase: "idle" });
        queueMicrotask(() => editorRef.current?.commands.focus());
    }, [setAskAiState]);

    const submitAskAi = useCallback(async (instruction: string, fromState?: AskAiState) => {
        const current = fromState ?? askAiRef.current;
        if (current.phase === "idle" || current.phase === "bubble") return;
        const trimmed = instruction.trim();
        if (!trimmed) return;

        abortRef.current?.abort();
        const abort = new AbortController();
        abortRef.current = abort;
        const id = ++genIdRef.current;
        const nextWorking: AskAiState = {
            phase: "working",
            scope: current.scope,
            range: current.range,
            selectedText: current.selectedText,
            instruction: trimmed,
        };
        setAskAiState(nextWorking);

        const ed = editorRef.current;
        const scope: AiScope = current.scope;
        let before = "";
        let after = rawMarkdownRef.current;
        let selection: string | null = current.selectedText || null;
        if (scope === "document" || viewModeRef.current === "markdown") {
            before = "";
            after = rawMarkdownRef.current;
            selection = null;
        } else if (ed) {
            const around = surroundingText(ed, current.range);
            before = around.before;
            after = around.after;
            selection = around.selection ?? selection;
        }

        try {
            const outcome = await streamAskAiFromUI(
                {
                    title: titleFromPath(filePathRef.current),
                    before,
                    selection,
                    after,
                    priorOps: sessionForDoc(filePathRef.current).list(),
                    instruction: trimmed,
                },
                {
                    signal: abort.signal,
                    onText: (full) => {
                        if (id !== genIdRef.current) return;
                        setAskAiState({
                            ...nextWorking,
                            reply: full,
                        });
                    },
                    onCommands: (commands) => {
                        if (id !== genIdRef.current) return;
                        setAskAiState({
                            ...nextWorking,
                            commands,
                        });
                    },
                }
            );
            if (id !== genIdRef.current) return;
            if (outcome.commands.length > 0) {
                const planned = dispatchDocCommands(rawMarkdownRef.current, outcome.commands);
                if (!planned.ok) {
                    setAskAiState({
                        phase: "error",
                        scope: nextWorking.scope,
                        range: nextWorking.range,
                        selectedText: nextWorking.selectedText,
                        instruction: trimmed,
                        commands: outcome.commands,
                        error: planned.error,
                    });
                    return;
                }
                setAskAiState({
                    phase: "preview",
                    scope: nextWorking.scope,
                    range: nextWorking.range,
                    selectedText: nextWorking.selectedText,
                    instruction: trimmed,
                    reply: outcome.text,
                    commands: outcome.commands,
                    edits: planned.edits,
                });
                return;
            }
            setAskAiState({
                phase: "preview",
                scope: nextWorking.scope,
                range: nextWorking.range,
                selectedText: nextWorking.selectedText,
                instruction: trimmed,
                reply: outcome.text,
            });
        } catch (error) {
            if (id !== genIdRef.current) return;
            const message = error instanceof Error ? error.message : String(error);
            if (/cancel/i.test(message)) return;
            setAskAiState({
                phase: "error",
                scope: nextWorking.scope,
                range: nextWorking.range,
                selectedText: nextWorking.selectedText,
                instruction: trimmed,
                error: message,
            });
        }
    }, [setAskAiState]);

    const applyMarkdownToEditor = useCallback(async (md: string, mode: AiApplyMode, scope: AiScope, range: { from: number; to: number } | null) => {
        const ed = editorRef.current;
        if (viewModeRef.current === "markdown" || !ed) {
            if (mode === "replace") {
                setRawMarkdown(md);
                onMarkdownChangeRef.current?.(md);
            } else {
                const combined = rawMarkdownRef.current.replace(/\s*$/, "") + "\n\n" + md;
                setRawMarkdown(combined);
                onMarkdownChangeRef.current?.(combined);
            }
            return;
        }
        const html = sanitizeHtml(await markdownToHtml(md));
        const plan = planWysiwygApply(scope, mode, range);
        const size = ed.state.doc.content.size;
        const chain = ed.chain().focus();
        if (plan.kind === "setContent") {
            chain.setContent(html);
        } else if (plan.kind === "replaceRange") {
            chain
                .deleteRange({
                    from: clampPos(plan.from, size),
                    to: clampPos(plan.to, size),
                })
                .insertContent(html);
        } else {
            chain.insertContentAt(clampPos(plan.pos, size), html);
        }
        chain.run();
    }, []);

    const applyAskAiCommands = useCallback(async () => {
        const current = askAiRef.current;
        if (current.phase !== "preview" || !current.commands?.length) return;
        const planned = dispatchDocCommands(rawMarkdownRef.current, current.commands);
        if (!planned.ok) {
            setAskAiState({
                phase: "error",
                scope: current.scope,
                range: current.range,
                selectedText: current.selectedText,
                instruction: current.instruction,
                commands: current.commands,
                error: planned.error,
            });
            return;
        }
        try {
            await applyMarkdownToEditor(planned.markdown, "replace", "document", null);
            sessionForDoc(filePathRef.current).push({
                instruction: current.instruction,
                selection: current.selectedText || null,
                resultSummary: summarizeReply(planned.edits.map((e) => e.summary).join("; ")),
                ts: Date.now(),
            });
            setAskAiState({ phase: "idle" });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            setAskAiState({
                phase: "error",
                scope: current.scope,
                range: current.range,
                selectedText: current.selectedText,
                instruction: current.instruction,
                commands: current.commands,
                error: message,
            });
        }
    }, [applyMarkdownToEditor, setAskAiState]);

    const applyAskAi = useCallback(async (mode: AiApplyMode) => {
        const current = askAiRef.current;
        if (current.phase !== "preview") return;
        if (current.commands?.length) {
            await applyAskAiCommands();
            return;
        }
        if (!current.reply) return;
        const md = current.reply;

        try {
            await applyMarkdownToEditor(md, mode, current.scope, current.range);
            sessionForDoc(filePathRef.current).push({
                instruction: current.instruction,
                selection: current.selectedText || null,
                resultSummary: summarizeReply(md),
                ts: Date.now(),
            });
            setAskAiState({ phase: "idle" });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            setAskAiState({
                phase: "error",
                scope: current.scope,
                range: current.range,
                selectedText: current.selectedText,
                instruction: current.instruction,
                error: message,
            });
        }
    }, [applyAskAiCommands, applyMarkdownToEditor, setAskAiState]);

    /**
     * Document-scoped Ask AI. Same pipeline and preview as the bubble / /ai,
     * without Insert below. Failures land in the panel, not window.alert.
     */
    const handleRefine = useCallback(() => {
        if (isAskAiPanelOpen(askAiRef.current) && askAiRef.current.phase !== "error") return;
        const current = rawMarkdownRef.current.trim();
        if (!current) return;
        const next: AskAiState = {
            phase: "working",
            scope: "document",
            range: null,
            selectedText: "",
            instruction: REFINE_INSTRUCTION,
        };
        setAskAiState(next);
        void submitAskAi(REFINE_INSTRUCTION, next);
    }, [setAskAiState, submitAskAi]);

    const openAskAiFromBubble = useCallback(() => {
        const current = askAiRef.current;
        if (current.phase !== "bubble") return;
        setAskAiState({
            phase: "prompt",
            scope: "selection",
            range: current.range,
            selectedText: current.selectedText,
            instruction: "",
        });
    }, [setAskAiState]);

    // A save is only "saved" until the next keystroke.
    useEffect(() => {
        setSaveState((prev) => (prev === "saved" ? "idle" : prev));
    }, [rawMarkdown]);

    // Load file content
    useEffect(() => {
        if (!editor) return;

        // B13: reads are async and unordered. Without this flag a slow read for
        // the previously-selected file lands after a fast read for the current
        // one and silently overwrites it -- the user sees the wrong note, or
        // worse, edits it and saves it over the right one.
        let cancelled = false;

        const loadFile = async () => {
            if (filePath) {
                try {
                    const content = await storage.readFile(filePath);
                    if (cancelled) return;
                    setRawMarkdown(content);
                    onMarkdownChangeRef.current?.(content);
                    snapshotRef.current = content;
                    setDirty(false);
                    hydratingRef.current = true;
                    const rawHtml = await markdownToHtml(content);
                    // Sanitize Markdown→HTML before TipTap to prevent XSS from untrusted .md files
                    const html = sanitizeHtml(rawHtml);
                    if (cancelled) return;
                    editor.commands.setContent(html, { emitUpdate: false });
                    adoptHydratedBaseline(editor);
                } catch (error) {
                    if (cancelled) return;
                    console.error("Failed to read file:", error);
                    const message =
                        error instanceof Error ? error.message : String(error);
                    // Escape as text — never inject the raw error object into HTML
                    editor.commands.setContent(
                        `<p style="color: red">Error loading file: ${escapeHtmlText(message)}</p>`,
                        { emitUpdate: false }
                    );
                }
            } else {
                setRawMarkdown("");
                onMarkdownChangeRef.current?.("");
                snapshotRef.current = "";
                setDirty(false);
                hydratingRef.current = true;
                editor.commands.setContent(welcomeHTML, { emitUpdate: false });
                adoptHydratedBaseline(editor);
            }
        };

        loadFile();
        return () => {
            cancelled = true;
            hydrateGenRef.current += 1;
            hydratingRef.current = false;
        };
    }, [filePath, editor, adoptHydratedBaseline]);

    // Sync markdown-mode edits into the editor doc when leaving markdown mode.
    // The reverse direction (wysiwyg/split -> markdown) is already covered by
    // onUpdate keeping rawMarkdown current at all times.
    //
    // setContent is deferred to a macrotask: Tiptap flushSync's into React, and
    // calling it from this effect (even via an async IIFE) logs
    // "flushSync was called from inside a lifecycle method" which fails E2E.
    useEffect(() => {
        if (!editor) return;
        const prev = prevViewModeRef.current;
        prevViewModeRef.current = viewMode;
        if (!shouldSyncMarkdownIntoEditor(prev, viewMode)) return;
        const wasClean = rawMarkdownRef.current === snapshotRef.current;
        const timer = window.setTimeout(() => {
            void (async () => {
                if (wasClean) hydratingRef.current = true;
                const rawHtml = await markdownToHtml(rawMarkdownRef.current);
                const html = sanitizeHtml(rawHtml);
                editor.commands.setContent(html, { emitUpdate: false });
                if (wasClean) adoptHydratedBaseline(editor);
            })();
        }, 0);
        return () => window.clearTimeout(timer);
    }, [viewMode, editor]);

    // Keyboard shortcut for save
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "s") {
                e.preventDefault();
                handleSave();
            }
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
                e.preventDefault();
                setFindOpen(true);
                requestAnimationFrame(() => findInputRef.current?.focus());
            }
            if (e.key === "Escape" && isAskAiPanelOpen(askAiRef.current)) {
                e.preventDefault();
                discardAskAi();
                return;
            }
            if (e.key === "Escape" && findOpen) {
                e.preventDefault();
                setFindOpen(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown, true);
        return () => window.removeEventListener("keydown", handleKeyDown, true);
    }, [handleSave, findOpen, discardAskAi]);

    if (!editor) {
        return (
            <div className="editor-container">
                <div className="tiptap-editor loading">Loading editor...</div>
            </div>
        );
    }

    const matches =
        findOpen && findQuery
            ? viewMode === "markdown"
                ? findInString(rawMarkdown, findQuery)
                : findInPmDoc(editor.state.doc, findQuery)
            : [];

    const revealMatch = (index: number) => {
        if (!matches.length) return;
        const i = ((index % matches.length) + matches.length) % matches.length;
        setFindIndex(i);
        const m = matches[i]!;
        if (viewMode === "markdown") {
            const ta = markdownRef.current;
            if (ta) {
                ta.focus();
                ta.setSelectionRange(m.from, m.to);
            }
        } else {
            editor.chain().focus().setTextSelection({ from: m.from, to: m.to }).scrollIntoView().run();
        }
    };

    const findBar = findOpen ? (
        <FindBar
            query={findQuery}
            current={matches.length ? findIndex % matches.length : 0}
            total={matches.length}
            onQuery={(q) => {
                setFindQuery(q);
                setFindIndex(0);
            }}
            onNext={() => revealMatch(findIndex + 1)}
            onPrev={() => revealMatch(findIndex - 1)}
            onClose={() => setFindOpen(false)}
            inputRef={findInputRef}
        />
    ) : null;

    const filteredSlashCommands = slashMenu
        ? filterSlashCommands(slashMenu.query)
        : [];

    // position: fixed uses coordsAtPos's viewport-relative coords directly.
    // onMouseDown (not onClick) + preventDefault keeps editor focus/selection
    // intact so executeSlashCommand's stored range is still valid.
    const slashMenuPopup = slashMenu && (
        <div
            className="slash-menu"
            role="listbox"
            aria-label="Slash commands"
            style={{ top: slashMenu.position.top + 4, left: slashMenu.position.left }}
        >
            {filteredSlashCommands.length === 0 ? (
                <div className="slash-menu-empty">No matches</div>
            ) : (
                filteredSlashCommands.map((cmd, i) => (
                    <div
                        key={slashCommandKey(cmd)}
                        role="option"
                        aria-selected={i === slashMenu.selectedIndex}
                        className={`slash-menu-item ${i === slashMenu.selectedIndex ? "selected" : ""}`}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            executeSlashCommand(cmd);
                        }}
                    >
                        {cmd.label}
                    </div>
                ))
            )}
        </div>
    );

    const askAiPanel = isAskAiPanelOpen(askAi) ? (
        <AskAiPanel
            phase={askAi.phase}
            scope={askAi.scope}
            instruction={askAi.instruction}
            reply={askAi.reply}
            commands={askAi.commands}
            edits={askAi.edits}
            error={askAi.error}
            onInstruction={(value) => {
                const current = askAiRef.current;
                if (current.phase !== "prompt") return;
                setAskAiState({ ...current, instruction: value });
            }}
            onSubmit={() => {
                const current = askAiRef.current;
                if (current.phase !== "prompt") return;
                void submitAskAi(current.instruction, current);
            }}
            onCanned={(chip: CannedPrompt) => {
                const current = askAiRef.current;
                if (current.phase !== "prompt") return;
                const next = { ...current, instruction: chip.instruction };
                setAskAiState(next);
                void submitAskAi(chip.instruction, next);
            }}
            onReplace={() => void applyAskAi("replace")}
            onInsertBelow={() => void applyAskAi("insert-below")}
            onApplyCommands={() => void applyAskAiCommands()}
            onTryAgain={() => {
                const current = askAiRef.current;
                if (current.phase === "idle" || current.phase === "bubble") return;
                void submitAskAi(current.instruction, current);
            }}
            onDiscard={discardAskAi}
        />
    ) : null;

    const askAiBubble =
        askAi.phase === "bubble" && viewMode !== "markdown" ? (
            <AskAiBubble top={askAi.top} left={askAi.left} onAsk={openAskAiFromBubble} />
        ) : null;

    const refining = askAi.phase === "working";
    const refineBusy = isAskAiPanelOpen(askAi);

    const toolbar = (
        <Toolbar
            editor={editor}
            onSave={handleSave}
            onFind={() => {
                setFindOpen(true);
                requestAnimationFrame(() => findInputRef.current?.focus());
            }}
            onRefine={handleRefine}
            refining={refining}
            refineDisabled={refineBusy}
            saveState={saveState}
            inTable={inTable && viewMode !== "markdown"}
        />
    );

    if (viewMode === "markdown") {
        return (
            <div className="editor-container">
                {toolbar}
                {findBar}
                {askAiPanel}
                <MarkdownSource
                    textareaRef={markdownRef}
                    value={rawMarkdown}
                    onChange={(value) => {
                        setRawMarkdown(value);
                        onMarkdownChangeRef.current?.(value);
                    }}
                />
            </div>
        );
    }

    if (viewMode === "split") {
        return (
            <div className="editor-container" style={{ maxWidth: "1400px" }}>
                {toolbar}
                {findBar}
                {askAiPanel}
                {slashMenuPopup}
                {askAiBubble}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)", flex: 1 }}>
                    <EditorContent editor={editor} />
                    <MarkdownPreview value={rawMarkdown} />
                </div>
            </div>
        );
    }

    return (
        <div className="editor-container">
            {toolbar}
            {findBar}
            {askAiPanel}
            {slashMenuPopup}
            {askAiBubble}
            <EditorContent editor={editor} />
        </div>
    );
}

export default Editor;
