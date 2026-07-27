import type { Editor } from "@tiptap/react";

interface ToolbarProps {
    editor: Editor;
    onSave?: () => void;
}

function ToolbarButton({
    onClick,
    isActive = false,
    title,
    children,
    disabled = false,
}: {
    onClick: () => void;
    isActive?: boolean;
    title: string;
    children: React.ReactNode;
    disabled?: boolean;
}) {
    return (
        <button
            className={`toolbar-btn ${isActive ? "active" : ""}`}
            onClick={onClick}
            title={title}
            disabled={disabled}
        >
            {children}
        </button>
    );
}

// Atom nodes inserted at the end of the document (or anywhere with no
// following block) leave a NodeSelection on themselves rather than a text
// cursor -- the next insertContent call then replaces the selected node
// instead of adding a new one. Always pairing the insert with a trailing
// paragraph guarantees a text cursor lands after it, every time.
function insertBlock(editor: Editor, nodeType: string) {
    editor.chain().focus().insertContent([{ type: nodeType }, { type: "paragraph" }]).run();
}

function Toolbar({ editor, onSave }: ToolbarProps) {
    return (
        <div className="editor-toolbar">
            {/* Text formatting */}
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleBold().run()}
                isActive={editor.isActive("bold")}
                title="Bold (⌘B)"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
                    <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
                </svg>
            </ToolbarButton>

            <ToolbarButton
                onClick={() => editor.chain().focus().toggleItalic().run()}
                isActive={editor.isActive("italic")}
                title="Italic (⌘I)"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="19" y1="4" x2="10" y2="4" />
                    <line x1="14" y1="20" x2="5" y2="20" />
                    <line x1="15" y1="4" x2="9" y2="20" />
                </svg>
            </ToolbarButton>

            <ToolbarButton
                onClick={() => editor.chain().focus().toggleStrike().run()}
                isActive={editor.isActive("strike")}
                title="Strikethrough"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <path d="M16 6C16 6 14.5 4 12 4C9.5 4 7 5.5 7 8C7 10 8.5 11 12 12" />
                    <path d="M8 18C8 18 9.5 20 12 20C14.5 20 17 18.5 17 16C17 14.5 16 13.5 14 13" />
                </svg>
            </ToolbarButton>

            <ToolbarButton
                onClick={() => editor.chain().focus().toggleCode().run()}
                isActive={editor.isActive("code")}
                title="Inline Code"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                </svg>
            </ToolbarButton>

            <div className="toolbar-divider" />

            {/* Headings */}
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                isActive={editor.isActive("heading", { level: 1 })}
                title="Heading 1"
            >
                H1
            </ToolbarButton>

            <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                isActive={editor.isActive("heading", { level: 2 })}
                title="Heading 2"
            >
                H2
            </ToolbarButton>

            <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                isActive={editor.isActive("heading", { level: 3 })}
                title="Heading 3"
            >
                H3
            </ToolbarButton>

            <div className="toolbar-divider" />

            {/* Lists */}
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                isActive={editor.isActive("bulletList")}
                title="Bullet List"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <circle cx="4" cy="6" r="1" fill="currentColor" />
                    <circle cx="4" cy="12" r="1" fill="currentColor" />
                    <circle cx="4" cy="18" r="1" fill="currentColor" />
                </svg>
            </ToolbarButton>

            <ToolbarButton
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                isActive={editor.isActive("orderedList")}
                title="Numbered List"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="10" y1="6" x2="21" y2="6" />
                    <line x1="10" y1="12" x2="21" y2="12" />
                    <line x1="10" y1="18" x2="21" y2="18" />
                    <text x="3" y="7" fontSize="6" fill="currentColor">1</text>
                    <text x="3" y="13" fontSize="6" fill="currentColor">2</text>
                    <text x="3" y="19" fontSize="6" fill="currentColor">3</text>
                </svg>
            </ToolbarButton>

            <ToolbarButton
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                isActive={editor.isActive("blockquote")}
                title="Blockquote"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 17h3l2-4V7H5v6h3z" />
                    <path d="M15 17h3l2-4V7h-6v6h3z" />
                </svg>
            </ToolbarButton>

            <div className="toolbar-divider" />

            {/* Code block */}
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                isActive={editor.isActive("codeBlock")}
                title="Code Block"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <polyline points="9 9 6 12 9 15" />
                    <polyline points="15 9 18 12 15 15" />
                </svg>
            </ToolbarButton>

            {/* Horizontal rule */}
            <ToolbarButton
                onClick={() => editor.chain().focus().setHorizontalRule().run()}
                title="Horizontal Rule"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="3" y1="12" x2="21" y2="12" />
                </svg>
            </ToolbarButton>

            <div className="toolbar-divider" />

            {/* Insert blocks */}
            <ToolbarButton
                onClick={() => insertBlock(editor, "mermaid")}
                title="Insert Mermaid Diagram"
            >
                Mermaid
            </ToolbarButton>

            <ToolbarButton
                onClick={() => insertBlock(editor, "dataset")}
                title="Insert Dataset"
            >
                Dataset
            </ToolbarButton>

            <ToolbarButton
                onClick={() => insertBlock(editor, "query")}
                title="Insert SQL Query"
            >
                Query
            </ToolbarButton>

            <ToolbarButton
                onClick={() => insertBlock(editor, "diagramGen")}
                title="Insert AI Diagram Generation"
            >
                AI Diagram
            </ToolbarButton>

            <ToolbarButton
                onClick={() => insertBlock(editor, "imageGen")}
                title="Insert AI Image Generation"
            >
                AI Image
            </ToolbarButton>

            <div className="toolbar-divider" />

            {/* Undo/Redo */}
            <ToolbarButton
                onClick={() => editor.chain().focus().undo().run()}
                title="Undo (⌘Z)"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
            </ToolbarButton>

            <ToolbarButton
                onClick={() => editor.chain().focus().redo().run()}
                title="Redo (⌘⇧Z)"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
            </ToolbarButton>

            <div className="toolbar-divider" />

            <ToolbarButton
                onClick={() => onSave?.()}
                title="Save (⌘S)"
                disabled={!onSave}
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-primary)" strokeWidth="2.5">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                </svg>
            </ToolbarButton>
        </div>
    );
}

export default Toolbar;
