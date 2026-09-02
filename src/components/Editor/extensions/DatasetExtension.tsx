import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useEffect, useState } from "react";
import { registerFile, executeQuery, clampLimit, validateIdentifier } from "../../../lib/data/duckdb";
import { explainDatasetError, explainMissingDataset, workspaceHasDataFile } from "../../../lib/data/datasetErrors";
import { storage, relativeToWorkspace } from "../../../lib/storage";
import { parseBlockAttrs, serializeBlockAttrs, languageParseRule } from "./blockAttrs";


function DatasetNodeView({ node, updateAttributes }: NodeViewProps) {
    const { source, name, limit = 5 } = node.attrs;
    const safeLimit = clampLimit(limit);
    const [data, setData] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [availableFiles, setAvailableFiles] = useState<string[]>([]);
    const [filesReady, setFilesReady] = useState(false);

    useEffect(() => {
        // Store the workspace-relative form, not the absolute path the backend
        // returns: an absolute path baked into a document does not exist on
        // anyone else's machine, and differed between web and desktop modes.
        let cancelled = false;
        storage
            .listDataFiles()
            .then((files) => {
                if (cancelled) return;
                setAvailableFiles(files.map(relativeToWorkspace));
                setFilesReady(true);
            })
            .catch(() => {
                if (cancelled) return;
                setAvailableFiles([]);
                setFilesReady(true);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const loadData = async () => {
        if (!source) return;
        if (!filesReady) return;
        setLoading(true);
        setError(null);
        try {
            if (!workspaceHasDataFile(availableFiles, source)) {
                setError(explainMissingDataset(source));
                setData([]);
                return;
            }
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
            setError(explainDatasetError(source, err));
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadData();
        // availableFiles is set in the same render as filesReady; depending on
        // the array identity retriggers registerFile when listing lands twice.
    }, [source, name, safeLimit, filesReady]);

    // Include the current source even if it's not in the listed files (e.g.
    // set via hand-authored markdown) so picking never silently drops it.
    const sourceOptions = source && !availableFiles.includes(source)
        ? [source, ...availableFiles]
        : availableFiles;

    return (
        <NodeViewWrapper className="dataset-block">
            <div className="dataset-header">
                <span className="dataset-title">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2v20M2 12h20" />
                        <rect x="2" y="2" width="20" height="20" rx="2" />
                    </svg>
                    Dataset:
                    <select
                        className="dataset-source-select"
                        value={source ?? ""}
                        onChange={(e) => updateAttributes({ source: e.target.value || null })}
                    >
                        <option value="">Select a file...</option>
                        {sourceOptions.map((file) => (
                            <option key={file} value={file}>
                                {file}
                            </option>
                        ))}
                    </select>
                </span>
                <button className="btn btn-ghost btn-xs" onClick={loadData}>
                    {loading ? "Loading..." : "Refresh"}
                </button>
            </div>

            {error ? (
                <div className="dataset-error" role="status">
                    {error}
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
                        const parsed = parseBlockAttrs(node.textContent || "");
                        const attrs: Record<string, unknown> = { ...parsed };
                        if (parsed["limit"] !== undefined && parsed["limit"] !== "") {
                            attrs["limit"] = clampLimit(parsed["limit"]);
                        } else {
                            attrs["limit"] = 5;
                        }
                        return attrs;
                    } catch {
                        return false;
                    }
                }
            },
            languageParseRule("dataset", (attrs) => ({
                ...attrs,
                limit: attrs["limit"] ? clampLimit(attrs["limit"]) : 5,
            })),
        ];
    },

    renderHTML({ HTMLAttributes }) {
        const limit = clampLimit(HTMLAttributes.limit);
        const { class: _cls, "data-limit": _dl, ...fields } = HTMLAttributes;
        const content = serializeBlockAttrs({ ...fields, limit });

        return [
            "pre",
            mergeAttributes(HTMLAttributes, { "data-type": "dataset", "data-limit": String(limit) }),
            ["code", { class: "language-dataset" }, content],
        ];
    },

    addNodeView() {
        return ReactNodeViewRenderer(DatasetNodeView);
    },
});
