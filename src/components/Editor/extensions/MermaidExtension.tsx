import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { sanitizeSvg } from "../../../lib/sanitize";

// Initialize Mermaid with dark theme; securityLevel strict reduces XSS surface.
mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: "dark",
    themeVariables: {
        primaryColor: "#58a6ff",
        primaryTextColor: "#e6edf3",
        primaryBorderColor: "#30363d",
        lineColor: "#8b949e",
        secondaryColor: "#21262d",
        tertiaryColor: "#161b22",
        background: "#0d1117",
        mainBkg: "#161b22",
        nodeBorder: "#30363d",
        clusterBkg: "#21262d",
        titleColor: "#e6edf3",
        edgeLabelBackground: "#161b22",
    },
    flowchart: {
        curve: "basis",
        padding: 20,
    },
});

// React component to render the Mermaid diagram
function MermaidNodeView({ node, updateAttributes }: NodeViewProps) {
    const content = (node.attrs.content as string) || "graph TD\n    A[Start] --> B[End]";
    const containerRef = useRef<HTMLDivElement>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editContent, setEditContent] = useState(content);

    useEffect(() => {
        setEditContent(content);
    }, [content]);

    useEffect(() => {
        let cancelled = false;

        const renderDiagram = async () => {
            if (isEditing || !containerRef.current) return;

            try {
                setError(null);
                const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
                const { svg } = await mermaid.render(id, content);
                if (cancelled || !containerRef.current) return;
                // Sanitize untrusted Mermaid SVG before innerHTML
                containerRef.current.innerHTML = sanitizeSvg(svg);
            } catch (err) {
                if (cancelled) return;
                setError(err instanceof Error ? err.message : "Failed to render diagram");
                if (containerRef.current) {
                    containerRef.current.innerHTML = "";
                }
            }
        };

        void renderDiagram();

        return () => {
            cancelled = true;
            if (containerRef.current) {
                containerRef.current.innerHTML = "";
            }
        };
    }, [content, isEditing]);

    const handleSave = () => {
        updateAttributes({ content: editContent });
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditContent(content);
        setIsEditing(false);
    };

    return (
        <NodeViewWrapper className="mermaid-block">
            {isEditing ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: "var(--space-2)",
                        }}
                    >
                        <span
                            style={{
                                fontSize: "var(--text-xs)",
                                color: "var(--color-text-muted)",
                                textTransform: "uppercase",
                                fontWeight: 500,
                            }}
                        >
                            Edit Mermaid Diagram
                        </span>
                        <div style={{ display: "flex", gap: "var(--space-2)" }}>
                            <button className="btn btn-ghost" onClick={handleCancel}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={handleSave}>
                                Save
                            </button>
                        </div>
                    </div>
                    <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        style={{
                            width: "100%",
                            minHeight: "150px",
                            background: "var(--color-bg-secondary)",
                            border: "1px solid var(--color-border-primary)",
                            borderRadius: "var(--radius-md)",
                            padding: "var(--space-3)",
                            color: "var(--color-text-primary)",
                            fontFamily: "var(--font-mono)",
                            fontSize: "var(--text-sm)",
                            resize: "vertical",
                            outline: "none",
                        }}
                        autoFocus
                    />
                </div>
            ) : (
                <>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: "var(--space-3)",
                            paddingBottom: "var(--space-2)",
                            borderBottom: "1px solid var(--color-border-secondary)",
                        }}
                    >
                        <span
                            style={{
                                fontSize: "var(--text-xs)",
                                color: "var(--color-accent-purple)",
                                textTransform: "uppercase",
                                fontWeight: 500,
                                display: "flex",
                                alignItems: "center",
                                gap: "var(--space-2)",
                            }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
                                <line x1="12" y1="22" x2="12" y2="15.5" />
                                <polyline points="22 8.5 12 15.5 2 8.5" />
                            </svg>
                            Mermaid Diagram
                        </span>
                        <button
                            className="btn btn-ghost"
                            onClick={() => setIsEditing(true)}
                            style={{ fontSize: "var(--text-xs)" }}
                        >
                            Edit
                        </button>
                    </div>
                    {error ? (
                        <div
                            style={{
                                padding: "var(--space-4)",
                                background: "rgba(248, 81, 73, 0.1)",
                                border: "1px solid var(--color-accent-red)",
                                borderRadius: "var(--radius-md)",
                                color: "var(--color-accent-red)",
                                fontSize: "var(--text-sm)",
                            }}
                        >
                            <strong>Error:</strong> {error}
                        </div>
                    ) : (
                        <div
                            ref={containerRef}
                            style={{
                                display: "flex",
                                justifyContent: "center",
                                padding: "var(--space-4)",
                            }}
                        />
                    )}
                </>
            )}
        </NodeViewWrapper>
    );
}

// TipTap extension for Mermaid diagrams
const MermaidExtension = Node.create({
    name: "mermaid",
    group: "block",
    atom: true,
    draggable: true,
    priority: 1000,

    addAttributes() {
        return {
            content: {
                default: "graph TD\n    A[Start] --> B[End]",
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'pre[data-type="mermaid"]',
                getAttrs: (node) => {
                    if (typeof node === "string") return false;
                    const code = (node as HTMLElement).querySelector("code");
                    const content = code?.textContent ?? node.textContent ?? "";
                    return { content };
                },
            },
            {
                tag: "pre",
                getAttrs: (node) => {
                    if (typeof node === "string") return false;
                    const code = node.querySelector("code");
                    if (code?.classList.contains("language-mermaid")) {
                        return { content: code.textContent || "" };
                    }
                    return false;
                },
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            "pre",
            mergeAttributes(HTMLAttributes, { "data-type": "mermaid" }),
            ["code", { class: "language-mermaid" }, HTMLAttributes.content],
        ];
    },

    addNodeView() {
        return ReactNodeViewRenderer(MermaidNodeView);
    },
});

export default MermaidExtension;
