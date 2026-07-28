import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useState } from "react";
import { generateImageFromUI } from "../../../lib/imageClient";
import { parseBlockAttrs } from "./blockAttrs";

function ImageGenNodeView({ node, updateAttributes }: NodeViewProps) {
    const { prompt, src } = node.attrs;
    const [editPrompt, setEditPrompt] = useState(prompt || "");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [refinement, setRefinement] = useState("");

    const handleGenerate = async (isRefinement = false) => {
        const promptToUse = isRefinement ? `${prompt} (Refinement: ${refinement})` : editPrompt;
        if (!promptToUse) return;

        setLoading(true);
        setError(null);

        try {
            const dataUri = await generateImageFromUI(promptToUse);

            updateAttributes({
                prompt: promptToUse,
                src: dataUri
            });
            if (isRefinement) setRefinement("");
        } catch (err) {
            setError(
                err instanceof Error ? `Failed to generate image: ${err.message}` : "Failed to generate image"
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <NodeViewWrapper className="image-gen-block">
            <div className="dataset-header" style={{ background: "var(--color-bg-tertiary)" }}>
                <span className="dataset-title" style={{ color: "var(--color-accent-orange)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                    </svg>
                    AI Image Generation
                </span>
                <button
                    className="btn btn-primary btn-xs"
                    onClick={() => handleGenerate(false)}
                    disabled={loading || !editPrompt}
                >
                    {loading ? "Generating..." : (src ? "Regenerate" : "Generate")}
                </button>
            </div>

            <div className="image-gen-content" style={{ padding: "var(--space-4)" }}>
                <div style={{ marginBottom: "var(--space-3)" }}>
                    <label style={{ display: "block", fontSize: "10px", color: "var(--color-text-muted)", marginBottom: "var(--space-1)", textTransform: "uppercase" }}>Base Prompt</label>
                    <input
                        type="text"
                        value={editPrompt}
                        onChange={(e) => setEditPrompt(e.target.value)}
                        placeholder="Describe the image you want to generate..."
                        style={{
                            width: "100%",
                            background: "var(--color-bg-primary)",
                            border: "1px solid var(--color-border-primary)",
                            borderRadius: "var(--radius-md)",
                            padding: "var(--space-2) var(--space-3)",
                            color: "var(--color-text-primary)",
                            fontSize: "var(--text-sm)",
                            outline: "none",
                        }}
                    />
                </div>

                {src && !loading && (
                    <div style={{ marginBottom: "var(--space-3)" }}>
                        <label style={{ display: "block", fontSize: "10px", color: "var(--color-text-muted)", marginBottom: "var(--space-1)", textTransform: "uppercase" }}>Refine Results</label>
                        <div style={{ display: "flex", gap: "var(--space-2)" }}>
                            <input
                                type="text"
                                value={refinement}
                                onChange={(e) => setRefinement(e.target.value)}
                                placeholder="Add styles, changes, or details (e.g. 'Make it more vibrant')..."
                                style={{
                                    flex: 1,
                                    background: "var(--color-bg-primary)",
                                    border: "1px solid var(--color-border-primary)",
                                    borderRadius: "var(--radius-md)",
                                    padding: "var(--space-2) var(--space-3)",
                                    color: "var(--color-accent-orange)",
                                    fontSize: "var(--text-sm)",
                                    outline: "none",
                                }}
                                onKeyDown={(e) => e.key === "Enter" && handleGenerate(true)}
                            />
                            <button
                                className="btn btn-ghost btn-xs"
                                onClick={() => handleGenerate(true)}
                                disabled={loading || !refinement}
                            >
                                Refine
                            </button>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="dataset-error" style={{ marginBottom: "var(--space-3)" }}>
                        {error}
                    </div>
                )}

                {src ? (
                    <div className="image-gen-preview" style={{ position: "relative" }}>
                        <img
                            src={src}
                            alt={prompt}
                            style={{
                                width: "100%",
                                borderRadius: "var(--radius-md)",
                                border: "1px solid var(--color-border-primary)",
                                display: "block"
                            }}
                            onError={() => setError("Generated image failed to load.")}
                        />
                        {loading && (
                            <div style={{
                                position: "absolute",
                                inset: 0,
                                background: "rgba(13, 17, 23, 0.7)",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: "var(--radius-md)",
                                gap: "var(--space-3)"
                            }}>
                                <span className="loading" style={{ color: "var(--color-accent-orange)" }}>Imagining changes...</span>
                                <div style={{ fontSize: "10px", color: "var(--color-text-muted)", textAlign: "center", padding: "0 var(--space-4)" }}>
                                    {refinement ? `Applying: ${refinement}` : "Processing prompt..."}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{
                        height: "200px",
                        background: "var(--color-bg-primary)",
                        border: "1px dashed var(--color-border-primary)",
                        borderRadius: "var(--radius-md)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--color-text-muted)",
                        fontSize: "var(--text-sm)"
                    }}>
                        {loading ? "Initializing AI model..." : "Enter a prompt and click Generate"}
                    </div>
                )}
            </div>
        </NodeViewWrapper>
    );
}

export const ImageGenExtension = Node.create({
    name: "imageGen",
    group: "block",
    atom: true,
    draggable: true,

    addAttributes() {
        return {
            prompt: {
                default: "",
            },
            src: {
                default: null,
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'pre[data-type="image-gen"]',
                getAttrs: (node) => {
                    if (typeof node === "string") return false;
                    return parseBlockAttrs(node.textContent || "");
                }
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        const content = Object.entries(HTMLAttributes)
            .filter(([key]) => key !== "class")
            .map(([key, val]) => `${key}: ${val}`)
            .join("\n");

        return [
            "pre",
            mergeAttributes(HTMLAttributes, { "data-type": "image-gen" }),
            ["code", {}, content],
        ];
    },

    addNodeView() {
        return ReactNodeViewRenderer(ImageGenNodeView);
    },
});
