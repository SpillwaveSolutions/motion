import { useEffect, useRef, useState, useCallback } from "react";
import { useEditor, EditorContent, type Editor as TiptapEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { marked } from "marked";
import TurndownService from "turndown";
import Toolbar from "./Toolbar";
import { FindBar, findInPmDoc, findInString } from "./FindBar";
import { INSERT_COMMANDS, insertBlock } from "./insertBlock";
import MermaidExtension from "./extensions/MermaidExtension";
import { DatasetExtension } from "./extensions/DatasetExtension";
import { QueryExtension } from "./extensions/QueryExtension";
import { ImageGenExtension } from "./extensions/ImageGenExtension";
import { DiagramGenExtension } from "./extensions/DiagramGenExtension";
import { storage } from "../../lib/storage";
import { ContentInjector } from "../../lib/ContentInjector";
import { escapeHtmlText, sanitizeHtml } from "../../lib/sanitize";

const lowlight = createLowlight(common);

const turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
});

// Configure turndown to handle language classes on code blocks
turndown.addRule("fencedCodeBlock", {
    filter: ["pre"],
    replacement: function (content, node) {
        const code = (node as HTMLElement).querySelector("code");
        const className = code ? code.getAttribute("class") || "" : "";
        const language = className.replace("language-", "");
        return "\n\n```" + language + "\n" + content + "\n```\n\n";
    },
});

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
}: EditorProps) {
    const [rawMarkdown, setRawMarkdown] = useState("");
    const [saveState, setSaveState] = useState<SaveState>("idle");
    const [dirty, setDirty] = useState(false);
    const snapshotRef = useRef("");
    const [findOpen, setFindOpen] = useState(false);
    const [findQuery, setFindQuery] = useState("");
    const [findIndex, setFindIndex] = useState(0);
    const findInputRef = useRef<HTMLInputElement>(null);
    const markdownRef = useRef<HTMLTextAreaElement>(null);
    // Tracks the previously active view mode so we can sync content only on
    // an actual mode transition, not on every render.
    const prevViewModeRef = useRef<ViewMode | null>(null);

    const [slashMenu, setSlashMenu] = useState<SlashMenuState | null>(null);
    // editorProps callbacks are registered once at editor creation, so they
    // must read state/editor through refs to avoid closing over stale values.
    const slashMenuRef = useRef<SlashMenuState | null>(null);
    const editorRef = useRef<TiptapEditor | null>(null);
    useEffect(() => {
        slashMenuRef.current = slashMenu;
    }, [slashMenu]);

    const executeSlashCommand = useCallback((nodeType: string) => {
        const menu = slashMenuRef.current;
        const currentEditor = editorRef.current;
        if (!menu || !currentEditor) return;
        insertBlock(currentEditor, nodeType, menu.range);
        setSlashMenu(null);
    }, []);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                codeBlock: false,
            }),
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
                const filtered = INSERT_COMMANDS.filter((c) =>
                    c.label.toLowerCase().includes(menu.query.toLowerCase())
                );
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
                        executeSlashCommand(chosen.nodeType);
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
            setRawMarkdown(turndown.turndown(updatedEditor.getHTML()));
            setSlashMenu(detectSlashTrigger(updatedEditor));
        },
        // Cursor movement (arrow keys, clicks) without a content change can
        // also enter/leave the "/" trigger position.
        onSelectionUpdate: ({ editor: updatedEditor }) => {
            setSlashMenu(detectSlashTrigger(updatedEditor));
        },
    });

    useEffect(() => {
        editorRef.current = editor;
    }, [editor]);

    // Handle saving
    const handleSave = useCallback(async (opts?: { silent?: boolean }) => {
        if (!editor || !filePath) return;

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

    const [refining, setRefining] = useState(false);

    // A save is only "saved" until the next keystroke.
    useEffect(() => {
        setSaveState((prev) => (prev === "saved" ? "idle" : prev));
    }, [rawMarkdown]);

    /**
     * Runs the current document through ContentInjector and replaces it with the
     * refined version.
     *
     * This is the last unbuilt item of the July plan: ContentInjector and its
     * three siblings were real, tested modules with no way for a user to reach
     * them. They also could not have run from here until they were routed
     * through llmClient -- they called Bun.spawn, which is undefined in both the
     * browser and the Tauri webview.
     */
    const handleRefine = useCallback(async () => {
        if (!editor || refining) return;
        const current = rawMarkdown.trim();
        if (!current) return;

        setRefining(true);
        try {
            const injector = new ContentInjector("claude");
            const refined = await injector.refineChunk(current, filePath ?? "untitled document");
            const html = sanitizeHtml(await marked.parse(refined.content));
            editor.commands.setContent(html);
            setRawMarkdown(refined.content);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error("Refine failed:", message);
            alert(`Could not refine this document: ${message}`);
        } finally {
            setRefining(false);
        }
    }, [editor, rawMarkdown, filePath, refining]);

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
                    snapshotRef.current = content;
                    setDirty(false);
                    const rawHtml = await marked.parse(content);
                    // Sanitize Markdown→HTML before TipTap to prevent XSS from untrusted .md files
                    const html = sanitizeHtml(
                        typeof rawHtml === "string" ? rawHtml : String(rawHtml)
                    );
                    if (cancelled) return;
                    editor.commands.setContent(html, { emitUpdate: false });
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
                snapshotRef.current = "";
                setDirty(false);
                editor.commands.setContent(welcomeHTML, { emitUpdate: false });
            }
        };

        loadFile();
        return () => {
            cancelled = true;
        };
    }, [filePath, editor]);

    // Sync markdown-mode edits into the editor doc when leaving markdown mode.
    // The reverse direction (wysiwyg/split -> markdown) is already covered by
    // onUpdate keeping rawMarkdown current at all times.
    useEffect(() => {
        if (!editor) return;
        if (shouldSyncMarkdownIntoEditor(prevViewModeRef.current, viewMode)) {
            (async () => {
                const rawHtml = await marked.parse(rawMarkdown);
                const html = sanitizeHtml(
                    typeof rawHtml === "string" ? rawHtml : String(rawHtml)
                );
                editor.commands.setContent(html, { emitUpdate: false });
            })();
        }
        prevViewModeRef.current = viewMode;
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
            if (e.key === "Escape" && findOpen) {
                e.preventDefault();
                setFindOpen(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown, true);
        return () => window.removeEventListener("keydown", handleKeyDown, true);
    }, [handleSave, findOpen]);

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
        ? INSERT_COMMANDS.filter((c) => c.label.toLowerCase().includes(slashMenu.query.toLowerCase()))
        : [];

    // position: fixed uses coordsAtPos's viewport-relative coords directly.
    // onMouseDown (not onClick) + preventDefault keeps editor focus/selection
    // intact so executeSlashCommand's stored range is still valid.
    const slashMenuPopup = slashMenu && (
        <div
            className="slash-menu"
            role="listbox"
            aria-label="Insert block"
            style={{ top: slashMenu.position.top + 4, left: slashMenu.position.left }}
        >
            {filteredSlashCommands.length === 0 ? (
                <div className="slash-menu-empty">No matches</div>
            ) : (
                filteredSlashCommands.map((cmd, i) => (
                    <div
                        key={cmd.nodeType}
                        role="option"
                        aria-selected={i === slashMenu.selectedIndex}
                        className={`slash-menu-item ${i === slashMenu.selectedIndex ? "selected" : ""}`}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            executeSlashCommand(cmd.nodeType);
                        }}
                    >
                        {cmd.label}
                    </div>
                ))
            )}
        </div>
    );

    if (viewMode === "markdown") {
        return (
            <div className="editor-container">
                <Toolbar editor={editor} onSave={handleSave} onFind={() => { setFindOpen(true); requestAnimationFrame(() => findInputRef.current?.focus()); }} onRefine={handleRefine} refining={refining} saveState={saveState} />
                {findBar}
                <textarea
                    ref={markdownRef}
                    aria-label="Markdown source"
                    style={{
                        flex: 1,
                        background: "var(--color-bg-secondary)",
                        border: "1px solid var(--color-border-primary)",
                        borderRadius: "var(--radius-lg)",
                        padding: "var(--space-6)",
                        color: "var(--color-text-primary)",
                        fontFamily: "var(--font-mono)",
                        fontSize: "var(--text-sm)",
                        lineHeight: 1.7,
                        resize: "none",
                        outline: "none",
                    }}
                    value={rawMarkdown}
                    onChange={(e) => setRawMarkdown(e.target.value)}
                    placeholder="Write your markdown here..."
                />
            </div>
        );
    }

    if (viewMode === "split") {
        return (
            <div className="editor-container" style={{ maxWidth: "1400px" }}>
                <Toolbar editor={editor} onSave={handleSave} onFind={() => { setFindOpen(true); requestAnimationFrame(() => findInputRef.current?.focus()); }} onRefine={handleRefine} refining={refining} saveState={saveState} />
                {findBar}
                {slashMenuPopup}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)", flex: 1 }}>
                    <EditorContent editor={editor} />
                    <div
                        style={{
                            background: "var(--color-bg-secondary)",
                            border: "1px solid var(--color-border-primary)",
                            borderRadius: "var(--radius-lg)",
                            padding: "var(--space-6)",
                            fontFamily: "var(--font-mono)",
                            fontSize: "var(--text-sm)",
                            lineHeight: 1.7,
                            color: "var(--color-text-secondary)",
                            overflow: "auto",
                            whiteSpace: "pre-wrap",
                        }}
                    >
                        {rawMarkdown}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="editor-container">
            <Toolbar editor={editor} onSave={handleSave} onFind={() => { setFindOpen(true); requestAnimationFrame(() => findInputRef.current?.focus()); }} onRefine={handleRefine} refining={refining} saveState={saveState} />
            {findBar}
            {slashMenuPopup}
            <EditorContent editor={editor} />
        </div>
    );
}

export default Editor;
