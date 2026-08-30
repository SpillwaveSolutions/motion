import type { Editor } from "@tiptap/react";
import { INSERT_COMMANDS, insertBlock } from "./insertBlock";

interface ToolbarProps {
    editor: Editor;
    onSave?: () => void;
    onFind?: () => void;
    onRefine?: () => void;
    refining?: boolean;
    refineDisabled?: boolean;
    saveState?: "idle" | "saving" | "saved" | "error";
    inTable?: boolean;
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
            type="button"
            className={`toolbar-btn ${isActive ? "active" : ""}`}
            onClick={onClick}
            title={title}
            // Every toolbar button is icon-only, so the accessible name has to
            // come from here -- `title` alone is inconsistently exposed.
            aria-label={title}
            aria-pressed={isActive}
            disabled={disabled}
        >
            {children}
        </button>
    );
}

function Toolbar({
    editor,
    onSave,
    onFind,
    onRefine,
    refining = false,
    refineDisabled = false,
    saveState = "idle",
    inTable = false,
}: ToolbarProps) {
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
            {INSERT_COMMANDS.map((cmd) => (
                <ToolbarButton
                    key={cmd.nodeType}
                    onClick={() => insertBlock(editor, cmd.nodeType)}
                    title={`Insert ${cmd.label}`}
                >
                    {cmd.label}
                </ToolbarButton>
            ))}

            {inTable && (
                <>
                    <div className="toolbar-divider" />
                    <ToolbarButton
                        onClick={() => editor.chain().focus().addRowAfter().run()}
                        title="Add row"
                    >
                        +Row
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().deleteRow().run()}
                        title="Delete row"
                    >
                        −Row
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().addColumnAfter().run()}
                        title="Add column"
                    >
                        +Col
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().deleteColumn().run()}
                        title="Delete column"
                    >
                        −Col
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().deleteTable().run()}
                        title="Delete table"
                    >
                        ×Table
                    </ToolbarButton>
                </>
            )}

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

            <span role="status" aria-live="polite" className="save-status">
                {saveState === "saving" ? "Saving…"
                 : saveState === "saved" ? "Saved"
                 : saveState === "error" ? "Save failed"
                 : ""}
            </span>

            <ToolbarButton
                onClick={() => onRefine?.()}
                title={refining ? "Refining…" : "AI Refine document"}
                disabled={!onRefine || refining || refineDisabled}
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3l1.9 5.8L20 10.7l-5.1 3 1.2 6-4.1-3.2L7.9 19.7l1.2-6L4 10.7l6.1-1.9z" />
                </svg>
            </ToolbarButton>

            <ToolbarButton
                onClick={() => onFind?.()}
                title="Find in note (⌘F)"
                disabled={!onFind}
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
            </ToolbarButton>
        </div>
    );
}

export default Toolbar;
