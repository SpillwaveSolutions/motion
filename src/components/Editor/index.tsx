import { useEffect, useState, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { marked } from "marked";
import TurndownService from "turndown";
import Toolbar from "./Toolbar";
import MermaidExtension from "./extensions/MermaidExtension";
import { storage } from "../../lib/storage";

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
`;

function Editor({ viewMode, filePath }: EditorProps) {
    const [rawMarkdown, setRawMarkdown] = useState("");

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                codeBlock: false,
            }),
            MermaidExtension,
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
    });

    // Handle saving
    const handleSave = useCallback(async () => {
        if (!editor || !filePath) return;

        let contentToSave = "";
        if (viewMode === "markdown") {
            contentToSave = rawMarkdown;
        } else {
            const html = editor.getHTML();
            contentToSave = turndown.turndown(html);
        }

        try {
            await storage.writeFile(filePath, contentToSave);
            console.log("File saved successfully:", filePath);
            // If we just saved from WYSIWYG, update rawMarkdown for consistency
            if (viewMode !== "markdown") {
                setRawMarkdown(contentToSave);
            }
        } catch (error) {
            console.error("Failed to save file:", error);
            alert(`Error saving file: ${error}`);
        }
    }, [editor, filePath, viewMode, rawMarkdown]);

    // Load file content
    useEffect(() => {
        if (!editor) return;

        const loadFile = async () => {
            if (filePath) {
                try {
                    const content = await storage.readFile(filePath);
                    setRawMarkdown(content);
                    const html = await marked.parse(content);
                    editor.commands.setContent(html);
                } catch (error) {
                    console.error("Failed to read file:", error);
                    editor.commands.setContent(`<p style="color: red">Error loading file: ${error}</p>`);
                }
            } else {
                setRawMarkdown("");
                editor.commands.setContent(welcomeHTML);
            }
        };

        loadFile();
    }, [filePath, editor]);

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
