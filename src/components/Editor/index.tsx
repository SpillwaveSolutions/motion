import { useEffect, useRef, useState, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { marked } from "marked";
import TurndownService from "turndown";
import Toolbar from "./Toolbar";
import MermaidExtension from "./extensions/MermaidExtension";
import { DatasetExtension } from "./extensions/DatasetExtension";
import { QueryExtension } from "./extensions/QueryExtension";
import { ImageGenExtension } from "./extensions/ImageGenExtension";
import { DiagramGenExtension } from "./extensions/DiagramGenExtension";
import { storage } from "../../lib/storage";
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
<pre data-type="image-gen"><code class="language-image-gen">prompt: A futuristic cyberpunk city at night with neon signs and flying cars
src: null</code></pre>

<p>Or generate technical diagrams with Mermaid:</p>
<pre data-type="diagram-gen"><code class="language-diagram-gen">prompt: A sequence diagram for a login flow
content: null</code></pre>
`;

function Editor({ viewMode, filePath }: EditorProps) {
    const [rawMarkdown, setRawMarkdown] = useState("");
    // Tracks the previously active view mode so we can sync content only on
    // an actual mode transition, not on every render.
    const prevViewModeRef = useRef<ViewMode | null>(null);

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
        },
        // Keep rawMarkdown in sync with WYSIWYG/split edits as they happen, so
        // switching to markdown mode (or the split pane) never shows stale
        // content and no edits are lost.
        onUpdate: ({ editor: updatedEditor }) => {
            setRawMarkdown(turndown.turndown(updatedEditor.getHTML()));
        },
    });

    // Handle saving
    const handleSave = useCallback(async () => {
        if (!editor || !filePath) return;

        try {
            await storage.writeFile(filePath, rawMarkdown);
            console.log("File saved successfully:", filePath);
        } catch (error) {
            console.error("Failed to save file:", error);
            alert(`Error saving file: ${error}`);
        }
    }, [editor, filePath, rawMarkdown]);

    // Load file content
    useEffect(() => {
        if (!editor) return;

        const loadFile = async () => {
            if (filePath) {
                try {
                    const content = await storage.readFile(filePath);
                    setRawMarkdown(content);
                    const rawHtml = await marked.parse(content);
                    // Sanitize Markdown→HTML before TipTap to prevent XSS from untrusted .md files
                    const html = sanitizeHtml(
                        typeof rawHtml === "string" ? rawHtml : String(rawHtml)
                    );
                    editor.commands.setContent(html, { emitUpdate: false });
                } catch (error) {
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
                editor.commands.setContent(welcomeHTML, { emitUpdate: false });
            }
        };

        loadFile();
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
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleSave]);

    if (!editor) {
        return (
            <div className="editor-container">
                <div className="tiptap-editor loading">Loading editor...</div>
            </div>
        );
    }

    if (viewMode === "markdown") {
        return (
            <div className="editor-container">
                <Toolbar editor={editor} onSave={handleSave} />
                <textarea
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
                <Toolbar editor={editor} onSave={handleSave} />
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
            <Toolbar editor={editor} onSave={handleSave} />
            <EditorContent editor={editor} />
        </div>
    );
}

export default Editor;
