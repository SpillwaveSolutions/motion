import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useEffect, useState } from "react";
import { registerFile, executeQuery, clampLimit, validateIdentifier } from "../../../lib/data/duckdb";

function DatasetNodeView({ node }: NodeViewProps) {
    const { source, name, limit = 5 } = node.attrs;
    const safeLimit = clampLimit(limit);
    const [data, setData] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const loadData = async () => {
        if (!source) return;
        setLoading(true);
        setError(null);
        try {
            const rawName =
                name || source.split("/").pop()?.replace(/\.[^/.]+$/, "") || "table";
            // Normalize to a valid identifier (replace non-alphanumeric with underscore)
            const normalized = String(rawName).replace(/[^A-Za-z0-9_]/g, "_").replace(/^(\d)/, "_$1");
            const tableName = validateIdentifier(normalized || "table");
            await registerFile(source, tableName);
            const results = await executeQuery(
                `SELECT * FROM "${tableName}" LIMIT ${safeLimit}`
            );
            setData(results);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load dataset");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [source, name, safeLimit]);

    return (
        <NodeViewWrapper className="dataset-block">
            <div className="dataset-header">
                <span className="dataset-title">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2v20M2 12h20" />
                        <rect x="2" y="2" width="20" height="20" rx="2" />
                    </svg>
                    Dataset: {source}
                </span>
                <button className="btn btn-ghost btn-xs" onClick={loadData}>
                    {loading ? "Loading..." : "Refresh"}
                </button>
            </div>

            {error ? (
                <div className="dataset-error">
                    <strong>Error:</strong> {error}
                </div>
            ) : (
                <div className="dataset-table-container">
                    {data.length > 0 ? (
                        <table className="dataset-table">
                            <thead>
                                <tr>
                                    {Object.keys(data[0]).map((key) => (
                                        <th key={key}>{key}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((row, i) => (
                                    <tr key={i}>
                                        {Object.values(row).map((val: any, j) => (
                                            <td key={j}>{String(val)}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="dataset-empty">No data to display</div>
                    )}
                </div>
            )}
        </NodeViewWrapper>
    );
}

export const DatasetExtension = Node.create({
    name: "dataset",
    group: "block",
    atom: true,
    draggable: true,

    addAttributes() {
        return {
            source: {
                default: null,
            },
            name: {
                default: null,
            },
            limit: {
                default: 5,
                parseHTML: (element) => clampLimit(element.getAttribute("data-limit") ?? 5),
                renderHTML: (attributes) => ({
                    "data-limit": clampLimit(attributes.limit),
                }),
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'pre[data-type="dataset"]',
                getAttrs: (node) => {
                    if (typeof node === "string") return false;
                    try {
                        const content = node.textContent || "";
                        // Simple key-value parser for the dataset block
                        const attrs: Record<string, unknown> = {};
                        content.split("\n").forEach((line) => {
                            const [key, ...val] = line.split(":");
                            if (key && val.length > 0) {
                                const k = key.trim();
                                const v = val.join(":").trim();
                                if (k === "limit") {
                                    attrs.limit = clampLimit(v);
                                } else {
                                    attrs[k] = v;
                                }
                            }
                        });
                        if (attrs.limit === undefined) {
                            attrs.limit = 5;
                        }
                        return attrs;
                    } catch {
                        return false;
                    }
                }
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        const limit = clampLimit(HTMLAttributes.limit);
        const content = Object.entries({ ...HTMLAttributes, limit })
            .filter(([key]) => key !== "class" && key !== "data-limit")
            .map(([key, val]) => `${key}: ${val}`)
            .join("\n");

        return [
            "pre",
            mergeAttributes(HTMLAttributes, { "data-type": "dataset", "data-limit": String(limit) }),
            ["code", {}, content],
        ];
    },

    addNodeView() {
        return ReactNodeViewRenderer(DatasetNodeView);
    },
});
