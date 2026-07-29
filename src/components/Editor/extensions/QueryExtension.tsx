import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useEffect, useState } from "react";
import { executeQuery } from "../../../lib/data/duckdb";
import { parseBlockAttrs, serializeBlockAttrs, languageParseRule } from "./blockAttrs";

function QueryNodeView({ node, updateAttributes }: NodeViewProps) {
    const { sql } = node.attrs;
    const [results, setResults] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editSql, setEditSql] = useState(sql);

    const runQuery = async () => {
        if (!sql) return;
        setLoading(true);
        setError(null);
        try {
            const data = await executeQuery(sql);
            setResults(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Query failed");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        runQuery();
    }, [sql]);

    const handleSave = () => {
        updateAttributes({ sql: editSql });
        setIsEditing(false);
    };

    return (
        <NodeViewWrapper className="query-block">
            <div className="dataset-header" style={{ background: "var(--color-bg-tertiary)" }}>
                <span className="dataset-title" style={{ color: "var(--color-accent-purple)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="4 7 4 4 20 4 20 7" />
                        <line x1="9" y1="20" x2="15" y2="20" />
                        <line x1="12" y1="4" x2="12" y2="20" />
                    </svg>
                    SQL Query
                </span>
                <div style={{ display: "flex", gap: "var(--space-2)" }}>
                    {isEditing ? (
                        <>
                            <button className="btn btn-ghost btn-xs" onClick={() => setIsEditing(false)}>Cancel</button>
                            <button className="btn btn-primary btn-xs" onClick={handleSave}>Save</button>
                        </>
                    ) : (
                        <>
                            <button className="btn btn-ghost btn-xs" onClick={() => setIsEditing(true)}>Edit</button>
                            <button className="btn btn-ghost btn-xs" onClick={runQuery}>
                                {loading ? "Running..." : "Run"}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {isEditing ? (
                <div style={{ padding: "var(--space-4)" }}>
                    <textarea
                        value={editSql}
                        onChange={(e) => setEditSql(e.target.value)}
                        style={{
                            width: "100%",
                            minHeight: "100px",
                            background: "var(--color-bg-primary)",
                            border: "1px solid var(--color-border-primary)",
                            borderRadius: "var(--radius-md)",
                            padding: "var(--space-3)",
                            color: "var(--color-accent-purple)",
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
                    <pre style={{ margin: 0, padding: "var(--space-4)", fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                        <code>{sql}</code>
                    </pre>

                    {error ? (
                        <div className="dataset-error">
                            <strong>Error:</strong> {error}
                        </div>
                    ) : (
                        <div className="dataset-table-container">
                            {results.length > 0 ? (
                                <table className="dataset-table">
                                    <thead>
                                        <tr>
                                            {Object.keys(results[0]).map((key) => (
                                                <th key={key}>{key}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {results.map((row, i) => (
                                            <tr key={i}>
                                                {Object.values(row).map((val: any, j) => (
                                                    <td key={j}>{String(val)}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : !loading && (
                                <div className="dataset-empty">No results</div>
                            )}
                        </div>
                    )}
                </>
            )}
        </NodeViewWrapper>
    );
}

export const QueryExtension = Node.create({
    name: "query",
    group: "block",
    atom: true,
    draggable: true,

    addAttributes() {
        return {
            sql: {
                default: "SELECT * FROM dataset LIMIT 10",
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'pre[data-type="query"]',
                getAttrs: (node) => {
                    if (typeof node === "string") return false;
                    const content = node.textContent || "";
                    const attrs = parseBlockAttrs(content);
                    // A body with no `sql:` key at all is treated as raw SQL, so
                    // hand-written blocks keep working.
                    return { sql: attrs["sql"] ?? content.trim() };
                }
            },
            languageParseRule("query"),
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            "pre",
            mergeAttributes(HTMLAttributes, { "data-type": "query" }),
            ["code", { class: "language-query" }, serializeBlockAttrs({ sql: HTMLAttributes.sql })],
        ];
    },

    addNodeView() {
        return ReactNodeViewRenderer(QueryNodeView);
    },
});
