import { useEffect, useRef, useState, useCallback } from "react";
import { useEditor, EditorContent, type Editor as TiptapEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { marked } from "marked";
import TurndownService from "turndown";
import Toolbar from "./Toolbar";
import { INSERT_COMMANDS, insertBlock } from "./insertBlock";
import MermaidExtension from "./extensions/MermaidExtension";
import { DatasetExtension } from "./extensions/DatasetExtension";
import { QueryExtension } from "./extensions/QueryExtension";
import { ImageGenExtension } from "./extensions/ImageGenExtension";
import { DiagramGenExtension } from "./extensions/DiagramGenExtension";
import { storage } from "../../lib/storage";
import { ContentInjector } from "../../lib/ContentInjector";
import { escapeHtmlText, sanitizeHtml } from "../../lib/sanitize";
import {
    basenameOf,
    isUntitledPath,
    joinWorkspace,
    suggestedFilename,
    wouldOverwrite,
} from "../../lib/noteNaming";
import { SaveNameDialog } from "../SaveNameDialog";
import { asErrorMessage } from "../../lib/data/demoFixtures";
import { isDirty } from "../../lib/dirtyState";
import {
    bodyMarkdown,
    joinFrontmatter,
    splitFrontmatter,
} from "../../lib/frontmatter";

const lowlight = createLowlight(common);

/** Markdown body → sanitized HTML for TipTap (front matter never enters the doc). */
async function bodyToEditorHtml(markdown: string): Promise<string> {
    const body = bodyMarkdown(markdown);
    const rawHtml = await marked.parse(body);
    return sanitizeHtml(typeof rawHtml === "string" ? rawHtml : String(rawHtml));
}

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

// Leaving markdown mode is the only transition that needs an explicit push:
// wysiwyg/split edits keep rawMarkdown current via onUpdate, but typing in
// the markdown textarea never touches the editor doc directly.
export function shouldSyncMarkdownIntoEditor(
    prevMode: ViewMode | null,
    nextMode: ViewMode
): boolean {
    return prevMode === "markdown" && nextMode !== "markdown";
}

const NEW_NOTE_MARKDOWN = "# New Note\n\n";

interface EditorProps {
    viewMode: ViewMode;
    filePath: string | null;
    /** True when the user chose New Note and has not saved to a real name yet. */
    isNewDocument?: boolean;
    workspacePath?: string | null;
    /** Absolute paths of notes in the open workspace (for overwrite checks). */
    existingFiles?: string[];
    /** After a successful save to a (possibly new) path. */
    onDocumentSaved?: (path: string) => void;
    /** Buffer differs from the last write. Lifted so App can guard file switches. */
    onDirtyChange?: (dirty: boolean) => void;
    /** Lets App run the editor's own Save from the unsaved-changes dialog. */
    onRegisterSave?: (save: () => Promise<SaveOutcome>) => void;
}

/**
 * What a Save attempt actually did. "needs-name" is not a failure: an Untitled
 * document opens the name sheet instead of writing, and a caller waiting to do
 * something afterwards (the unsaved-changes guard) must not treat that as done.
 */
export type SaveOutcome = "saved" | "needs-name" | "failed";

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
    isNewDocument = false,
    workspacePath = null,
    existingFiles = [],
    onDocumentSaved,
    onDirtyChange,
    onRegisterSave,
}: EditorProps) {
    const [rawMarkdown, setRawMarkdown] = useState("");
    /**
     * What is on disk (or, for a new note, the template it started from). null
     * means no document of the user's is open, so there is nothing to lose.
     * Set in exactly two places -- the load effect and a successful write --
     * which is what keeps `isDirty` derived rather than a flag to maintain.
     */
    const [savedMarkdown, setSavedMarkdown] = useState<string | null>(null);
    const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
    const [nameDialog, setNameDialog] = useState<null | {
        mode: "save" | "rename";
        suggested: string;
    }>(null);
    // Tracks the previously active view mode so we can sync content only on
    // an actual mode transition, not on every render.
    const prevViewModeRef = useRef<ViewMode | null>(null);
    // YAML front matter lives outside the TipTap doc so WYSIWYG never shows it.
    // onUpdate re-attaches it when rebuilding full rawMarkdown for save / Markdown view.
    const frontmatterRef = useRef<string | null>(null);

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
        // content and no edits are lost. Front matter is reattached from the
        // ref so body edits never drop YAML. Also re-checks the slash-command
        // trigger, since typing after "/" changes the query.
        onUpdate: ({ editor: updatedEditor }) => {
            const bodyMd = turndown.turndown(updatedEditor.getHTML());
            setRawMarkdown(joinFrontmatter(frontmatterRef.current, bodyMd));
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

    const writeToPath = useCallback(
        async (path: string): Promise<SaveOutcome> => {
            setSaveState("saving");
            try {
                await storage.writeFile(path, rawMarkdown);
                // Snapshot what actually reached disk, so dirty goes false for
                // exactly this content and nothing else.
                setSavedMarkdown(rawMarkdown);
                setSaveState("saved");
                onDocumentSaved?.(path);
                return "saved";
            } catch (error) {
                setSaveState("error");
                console.error("Failed to save file:", error);
                alert(`Error saving file: ${asErrorMessage(error, "Save failed")}`);
                return "failed";
            }
        },
        [rawMarkdown, onDocumentSaved]
    );

    /**
     * macOS-style Save:
     * - Named document on disk → write in place.
     * - New / Untitled → name sheet, default from document title (New Note → new-note.md).
     * - Overwrite of a different existing file → confirm before replace.
     */
    const handleSave = useCallback(async (): Promise<SaveOutcome> => {
        if (!editor) return "failed";

        if (!workspacePath) {
            alert("Open a folder first to save notes.");
            return "failed";
        }

        const needsName =
            isNewDocument || !filePath || isUntitledPath(filePath);

        if (needsName) {
            setNameDialog({
                mode: "save",
                suggested: suggestedFilename(rawMarkdown, "new-note.md"),
            });
            return "needs-name";
        }

        return await writeToPath(filePath);
    }, [editor, workspacePath, isNewDocument, filePath, rawMarkdown, writeToPath]);

    const handleRename = useCallback(() => {
        if (!workspacePath) {
            alert("Open a folder first to rename notes.");
            return;
        }
        const suggested = filePath
            ? basenameOf(filePath)
            : suggestedFilename(rawMarkdown, "new-note.md");
        setNameDialog({ mode: "rename", suggested });
    }, [workspacePath, filePath, rawMarkdown]);

    const handleNameDialogConfirm = useCallback(
        async (filename: string) => {
            if (!workspacePath) return;
            const target = joinWorkspace(workspacePath, filename);

            if (wouldOverwrite(existingFiles, target, filePath)) {
                const ok = window.confirm(
                    `A file named “${basenameOf(target)}” already exists.\n\n` +
                        `Do you want to replace it?`
                );
                if (!ok) return;
            }

            setNameDialog(null);
            await writeToPath(target);
        },
        [workspacePath, existingFiles, filePath, writeToPath]
    );

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
            // Refine the body only; keep YAML front matter unchanged.
            const { frontmatter, body } = splitFrontmatter(current);
            const refined = await injector.refineChunk(
                body || current,
                filePath ?? "untitled document"
            );
            const full = joinFrontmatter(frontmatter, refined.content);
            frontmatterRef.current = frontmatter;
            const html = await bodyToEditorHtml(full);
            editor.commands.setContent(html);
            setRawMarkdown(full);
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
                    const { frontmatter } = splitFrontmatter(content);
                    frontmatterRef.current = frontmatter;
                    setRawMarkdown(content);
                    setSavedMarkdown(content);
                    // Body only → TipTap; front matter stays in rawMarkdown / Markdown view.
                    const html = await bodyToEditorHtml(content);
                    if (cancelled) return;
                    editor.commands.setContent(html, { emitUpdate: false });
                } catch (error) {
                    if (cancelled) return;
                    console.error("Failed to read file:", error);
                    const message =
                        error instanceof Error ? error.message : String(error);
                    frontmatterRef.current = null;
                    // An error placeholder is not the user's work: never guard it.
                    setSavedMarkdown(null);
                    // Escape as text — never inject the raw error object into HTML
                    editor.commands.setContent(
                        `<p style="color: red">Error loading file: ${escapeHtmlText(message)}</p>`,
                        { emitUpdate: false }
                    );
                }
            } else if (isNewDocument) {
                // macOS-style: new notes live in memory until the first Save.
                // The template is the baseline, so typing into an unsaved new
                // note is dirty too -- otherwise the one document with nothing
                // on disk to fall back on would be the one we failed to guard.
                frontmatterRef.current = null;
                setRawMarkdown(NEW_NOTE_MARKDOWN);
                setSavedMarkdown(NEW_NOTE_MARKDOWN);
                const html = await bodyToEditorHtml(NEW_NOTE_MARKDOWN);
                if (cancelled) return;
                editor.commands.setContent(html, { emitUpdate: false });
            } else {
                frontmatterRef.current = null;
                setRawMarkdown("");
                setSavedMarkdown(null);
                editor.commands.setContent(welcomeHTML, { emitUpdate: false });
            }
        };

        loadFile();
        return () => {
            cancelled = true;
        };
    }, [filePath, isNewDocument, editor]);

    // Sync markdown-mode edits into the editor doc when leaving markdown mode.
    // The reverse direction (wysiwyg/split -> markdown) is already covered by
    // onUpdate keeping rawMarkdown current at all times (with front matter reattached).
    useEffect(() => {
        if (!editor) return;
        if (shouldSyncMarkdownIntoEditor(prevViewModeRef.current, viewMode)) {
            (async () => {
                const { frontmatter } = splitFrontmatter(rawMarkdown);
                frontmatterRef.current = frontmatter;
                const html = await bodyToEditorHtml(rawMarkdown);
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
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleSave]);

    // Publish dirty state so App can intercept a file switch that would lose it.
    useEffect(() => {
        onDirtyChange?.(isDirty(rawMarkdown, savedMarkdown));
    }, [rawMarkdown, savedMarkdown, onDirtyChange]);

    // Hand App the same Save the toolbar and Cmd+S run -- the dialog must not
    // grow a second save path that could drift from this one.
    useEffect(() => {
        onRegisterSave?.(handleSave);
    }, [handleSave, onRegisterSave]);

    if (!editor) {
        return (
            <div className="editor-container">
                <div className="tiptap-editor loading">Loading editor...</div>
            </div>
        );
    }

    const filteredSlashCommands = slashMenu
        ? INSERT_COMMANDS.filter((c) => c.label.toLowerCase().includes(slashMenu.query.toLowerCase()))
        : [];

    // Save/Rename require a workspace. Welcome (no path, not new) cannot save.
    const canSave = Boolean(workspacePath) && (Boolean(filePath) || isNewDocument);
    const documentLabel = isNewDocument || !filePath
        ? "Untitled"
        : basenameOf(filePath);

    const nameDialogUi = nameDialog ? (
        <SaveNameDialog
            title={nameDialog.mode === "rename" ? "Rename" : "Save As"}
            initialName={nameDialog.suggested}
            confirmLabel={nameDialog.mode === "rename" ? "Rename" : "Save"}
            onCancel={() => setNameDialog(null)}
            onConfirm={handleNameDialogConfirm}
        />
    ) : null;

    const toolbar = (
        <Toolbar
            editor={editor}
            onSave={canSave ? handleSave : undefined}
            onRename={canSave ? handleRename : undefined}
            documentLabel={canSave ? documentLabel : undefined}
            onRefine={handleRefine}
            refining={refining}
            saveState={saveState}
        />
    );

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
                {toolbar}
                <textarea
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
                    onChange={(e) => {
                        const next = e.target.value;
                        // Keep ref aligned so a later WYSIWYG edit still preserves YAML.
                        frontmatterRef.current = splitFrontmatter(next).frontmatter;
                        setRawMarkdown(next);
                    }}
                    placeholder="Write your markdown here..."
                />
                {nameDialogUi}
            </div>
        );
    }

    if (viewMode === "split") {
        return (
            <div className="editor-container" style={{ maxWidth: "1400px" }}>
                {toolbar}
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
                {nameDialogUi}
            </div>
        );
    }

    return (
        <div className="editor-container">
            {toolbar}
            {slashMenuPopup}
            <EditorContent editor={editor} />
            {nameDialogUi}
        </div>
    );
}

export default Editor;
