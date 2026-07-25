import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { sanitizeSvg } from "../../../lib/sanitize";

function DiagramGenNodeView({ node, updateAttributes }: NodeViewProps) {
    const { prompt, content } = node.attrs;
    const [editPrompt, setEditPrompt] = useState(prompt || "");
    const [editContent, setEditContent] = useState(content || "");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(!content);
    const svgRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let cancelled = false;

        const renderDiagram = async (mermaidCode: string) => {
            if (!mermaidCode || !svgRef.current) return;
            try {
                const id = `diagram-gen-${Math.random().toString(36).substr(2, 9)}`;
                const { svg } = await mermaid.render(id, mermaidCode);
                if (cancelled || !svgRef.current) return;
                svgRef.current.innerHTML = sanitizeSvg(svg);
            } catch (err) {
                console.error("Mermaid render error:", err);
                if (!cancelled && svgRef.current) {
                    // Text-only error — no untrusted HTML
                    svgRef.current.textContent = "Invalid Mermaid syntax generated.";
                    svgRef.current.classList.add("dataset-error");
                }
            }
        };

        if (content && !loading) {
            void renderDiagram(content);
        }

        return () => {
            cancelled = true;
            if (svgRef.current) {
                svgRef.current.innerHTML = "";
            }
        };
    }, [content, loading]);

    const handleGenerate = async () => {
        if (!editPrompt) return;
        setLoading(true);
        setError(null);

        try {
            // In a real implementation, this would call our backend which uses one of the CLIs (gemini, claude, etc.)
            // For now, we simulate with a mock response
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Mock generated mermaid code based on prompt keywords
            let mockContent = "graph TD\n    A[Start] --> B[Process]\n    B --> C[End]";
            if (editPrompt.toLowerCase().includes("flowchart")) {
                mockContent = "graph LR\n    Step1[Input] --> Step2[Analysis]\n    Step2 --> Step3[Output]";
            } else if (editPrompt.toLowerCase().includes("sequence")) {
                mockContent = "sequenceDiagram\n    Alice->>Bob: Hello Bob, how are you?\n    Bob-->>Alice: Jolly good!";
            }

            updateAttributes({
                prompt: editPrompt,
                content: mockContent
            });
            setEditContent(mockContent);
            setIsEditing(false);
        } catch (err) {
            setError("Failed to generate diagram");
        } finally {
            setLoading(false);
        }
    };

    return (
        <NodeViewWrapper className="diagram-gen-block">
            <div className="dataset-header" style={{ background: "var(--color-bg-tertiary)" }}>
                <span className="dataset-title" style={{ color: "var(--color-accent-purple)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                    </svg>
                    AI Diagram Generation
                </span>
                <div className="dataset-actions">
                    <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => setIsEditing(!isEditing)}
                    >
                        {isEditing ? "View" : "Edit Prompt"}
                    </button>
                    <button
                        className="btn btn-primary btn-xs"
                        onClick={handleGenerate}
                        disabled={loading || !editPrompt}
                    >
                        {loading ? "Generating..." : (content ? "Regenerate" : "Generate")}
                    </button>
                </div>
            </div>

            <div className="diagram-gen-content" style={{ padding: "var(--space-4)" }}>
                {isEditing && (
                    <div style={{ marginBottom: "var(--space-3)" }}>
                        <textarea
                            value={editPrompt}
                            onChange={(e) => setEditPrompt(e.target.value)}
                            placeholder="Describe the diagram you want (e.g., 'A flowchart for user authentication')..."
                            style={{
                                width: "100%",
                                minHeight: "80px",
                                background: "var(--color-bg-primary)",
                                border: "1px solid var(--color-border-primary)",
                                borderRadius: "var(--radius-md)",
                                padding: "var(--space-2) var(--space-3)",
                                color: "var(--color-text-primary)",
                                fontSize: "var(--text-sm)",
                                outline: "none",
                                resize: "vertical",
                                fontFamily: "inherit"
                            }}
                        />
                    </div>
                )}

                {error && (
                    <div className="dataset-error" style={{ marginBottom: "var(--space-3)" }}>
                        {error}
                    </div>
                )}

                <div
                    ref={svgRef}
                    className="mermaid-preview"
                    style={{
                        background: "var(--color-bg-secondary)",
                        borderRadius: "var(--radius-md)",
                        padding: "var(--space-4)",
                        display: loading ? "none" : "block",
                        minHeight: content ? "auto" : "100px",
                        textAlign: "center"
                    }}
                >
                    {!content && !loading && (
                        <div style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>
                            Describe your diagram above to get started
                        </div>
                    )}
                </div>

                {loading && (
                    <div style={{
                        height: "150px",
                        background: "var(--color-bg-secondary)",
                        borderRadius: "var(--radius-md)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--color-text-muted)"
                    }}>
                        <span className="loading">AI is sketching your diagram...</span>
                    </div>
                )}

                {!isEditing && content && (
                    <div style={{ marginTop: "var(--space-3)", display: "flex", justifyContent: "flex-end" }}>
                        <button
                            className="btn btn-ghost btn-xs"
                            onClick={() => {
                                setIsEditing(true);
                            }}
                        >
                            Refine Prompt
                        </button>
                    </div>
                )}
            </div>
        </NodeViewWrapper>
    );
}

export const DiagramGenExtension = Node.create({
    name: "diagramGen",
    group: "block",
    atom: true,
    draggable: true,

    addAttributes() {
        return {
            prompt: {
                default: "",
            },
            content: {
                default: "",
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'pre[data-type="diagram-gen"]',
                getAttrs: (node) => {
                    if (typeof node === "string") return false;
                    const text = node.textContent || "";
                    const attrs: Record<string, string> = {};
                    text.split("\n").forEach(line => {
                        const [key, ...val] = line.split(":");
                        if (key && val.length > 0) {
                            attrs[key.trim()] = val.join(":").trim();
                        }
                    });
                    // Content might be multi-line, this basic parser might fail for complex content
                    // In a real app we'd use a better serializer
                    return attrs;
                }
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        const { prompt, content, ...rest } = HTMLAttributes;
        const serialized = `prompt: ${prompt}\ncontent: ${content}`;

        return [
            "pre",
            mergeAttributes(rest, { "data-type": "diagram-gen" }),
            ["code", {}, serialized],
        ];
    },

    addNodeView() {
        return ReactNodeViewRenderer(DiagramGenNodeView);
    },
});
