import { useCallback, useEffect, useMemo, useState } from "react";
import {
    type SortMode,
    type TreeNode,
    ancestorDirRels,
    basenameOf,
    buildFileTree,
    dirsToRevealPaths,
    sortPaths,
    toRel,
} from "../lib/fileTree";
import { filterPathsByGlob } from "../lib/pathGlob";
import { type SearchHit, searchInNotes } from "../lib/searchNotes";
import { storage } from "../lib/storage";

export type SidebarListMode = "tree" | "flat";

export interface FileSidebarProps {
    workspacePath: string | null;
    files: string[];
    currentFilePath: string | null;
    /**
     * Path glob / name filter (applied first).
     * Plain text → basename match; patterns like `knowledge/**` → path glob.
     */
    nameFilter: string;
    onNameFilterChange: (q: string) => void;
    onSelectFile: (path: string) => void;
    /** path → last opened ms (session) for Recent sort */
    recentOpens: ReadonlyMap<string, number>;
}

function FileIcon() {
    return (
        <svg className="file-tree-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
        </svg>
    );
}

function FolderIcon({ open }: { open: boolean }) {
    return (
        <svg className="file-tree-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            {open ? (
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            ) : (
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            )}
        </svg>
    );
}

function TreeRows({
    nodes,
    depth,
    expanded,
    toggle,
    currentFilePath,
    onSelectFile,
}: {
    nodes: TreeNode[];
    depth: number;
    expanded: Set<string>;
    toggle: (rel: string) => void;
    currentFilePath: string | null;
    onSelectFile: (path: string) => void;
}) {
    return (
        <>
            {nodes.map((node) => {
                if (node.kind === "dir") {
                    const isOpen = expanded.has(node.rel);
                    return (
                        <div key={`d:${node.rel}`}>
                            <button
                                type="button"
                                className="file-tree-item file-tree-dir"
                                style={{ paddingLeft: `calc(var(--space-3) + ${depth * 12}px)` }}
                                aria-expanded={isOpen}
                                onClick={() => toggle(node.rel)}
                            >
                                <span className="file-tree-chevron" aria-hidden="true">
                                    {isOpen ? "▾" : "▸"}
                                </span>
                                <FolderIcon open={isOpen} />
                                {node.name}
                            </button>
                            {isOpen && (
                                <TreeRows
                                    nodes={node.children}
                                    depth={depth + 1}
                                    expanded={expanded}
                                    toggle={toggle}
                                    currentFilePath={currentFilePath}
                                    onSelectFile={onSelectFile}
                                />
                            )}
                        </div>
                    );
                }
                return (
                    <button
                        key={node.path}
                        type="button"
                        role="option"
                        aria-selected={currentFilePath === node.path}
                        className={`file-tree-item ${currentFilePath === node.path ? "active" : ""}`}
                        style={{ paddingLeft: `calc(var(--space-3) + ${depth * 12}px)` }}
                        onClick={() => onSelectFile(node.path)}
                    >
                        <FileIcon />
                        {node.name}
                    </button>
                );
            })}
        </>
    );
}

export function FileSidebar({
    workspacePath,
    files,
    currentFilePath,
    nameFilter,
    onNameFilterChange,
    onSelectFile,
    recentOpens,
}: FileSidebarProps) {
    const [listMode, setListMode] = useState<SidebarListMode>("tree");
    const [sortMode, setSortMode] = useState<SortMode>("name-asc");
    const [contentQuery, setContentQuery] = useState("");
    const [contentHits, setContentHits] = useState<SearchHit[] | null>(null);
    const [contentSearching, setContentSearching] = useState(false);
    const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

    // Glob (or plain name) first — candidate set for both the tree and grep.
    const globFiltered = useMemo(
        () => filterPathsByGlob(files, workspacePath, nameFilter),
        [files, workspacePath, nameFilter]
    );

    const sortedFiltered = useMemo(
        () => sortPaths(globFiltered, sortMode, recentOpens),
        [globFiltered, sortMode, recentOpens]
    );

    const tree = useMemo(() => {
        if (!workspacePath) return [];
        return buildFileTree(sortedFiltered, workspacePath);
    }, [sortedFiltered, workspacePath]);

    // New workspace → start fully collapsed (root folders + root notes only).
    // Must run before the reveal effect so a same-tick open file can re-expand.
    useEffect(() => {
        setExpanded(new Set());
    }, [workspacePath]);

    // Collapsed-by-default folder navigator. Only auto-expand when:
    // - glob/name filter is active (reveal matching files), or
    // - a file is open (keep its folder path visible).
    // Never expand-all — that made Tree look like a recursive flat dump.
    useEffect(() => {
        if (listMode !== "tree" || !workspacePath) return;

        const filterOn = nameFilter.trim().length > 0;
        if (filterOn) {
            setExpanded(new Set(dirsToRevealPaths(sortedFiltered, workspacePath)));
            return;
        }

        if (currentFilePath) {
            const rel = toRel(workspacePath, currentFilePath);
            setExpanded((prev) => {
                const next = new Set(prev);
                for (const d of ancestorDirRels(rel)) next.add(d);
                return next;
            });
        }
    }, [listMode, workspacePath, nameFilter, sortedFiltered, currentFilePath]);

    const toggle = useCallback((rel: string) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(rel)) next.delete(rel);
            else next.add(rel);
            return next;
        });
    }, []);

    // Grep only inside the glob-filtered set (glob AND grep, not either-or).
    const runContentSearch = useCallback(async () => {
        const q = contentQuery.trim();
        if (!q) {
            setContentHits([]);
            return;
        }
        if (globFiltered.length === 0) {
            setContentHits([]);
            return;
        }
        setContentSearching(true);
        try {
            const hits = await searchInNotes(globFiltered, q, (p) => storage.readFile(p));
            setContentHits(hits);
        } catch (e) {
            console.error("Content search failed:", e);
            setContentHits([]);
        } finally {
            setContentSearching(false);
        }
    }, [contentQuery, globFiltered]);

    // Debounced content search when grep text or glob candidates change
    useEffect(() => {
        if (!contentQuery.trim()) {
            setContentHits(null);
            return;
        }
        const t = window.setTimeout(() => {
            void runContentSearch();
        }, 300);
        return () => window.clearTimeout(t);
    }, [contentQuery, runContentSearch]);

    const title = workspacePath ? basenameOf(workspacePath) : "Documents";
    const showContentResults = contentHits !== null && contentQuery.trim().length > 0;

    return (
        <div className="file-tree">
            <div className="file-sidebar-header">
                <h3 className="file-sidebar-title">{title}</h3>
                <div className="file-sidebar-controls" role="toolbar" aria-label="Notes view">
                    <div className="file-sidebar-seg" role="group" aria-label="List layout">
                        <button
                            type="button"
                            className={`file-sidebar-seg-btn ${listMode === "tree" ? "active" : ""}`}
                            aria-pressed={listMode === "tree"}
                            onClick={() => setListMode("tree")}
                            title="Tree view"
                        >
                            Tree
                        </button>
                        <button
                            type="button"
                            className={`file-sidebar-seg-btn ${listMode === "flat" ? "active" : ""}`}
                            aria-pressed={listMode === "flat"}
                            onClick={() => setListMode("flat")}
                            title="Flat list"
                        >
                            Flat
                        </button>
                    </div>
                    <label className="file-sidebar-sort">
                        <span className="visually-hidden">Sort</span>
                        <select
                            aria-label="Sort notes"
                            value={sortMode}
                            onChange={(e) => setSortMode(e.target.value as SortMode)}
                        >
                            <option value="name-asc">Name A–Z</option>
                            <option value="name-desc">Name Z–A</option>
                            <option value="recent">Recent</option>
                        </select>
                    </label>
                </div>
            </div>

            <div className="file-sidebar-search-block">
                <label className="visually-hidden" htmlFor="notes-path-glob">
                    Path glob
                </label>
                <input
                    id="notes-path-glob"
                    className="file-sidebar-input"
                    type="search"
                    placeholder="Glob: nested/** or name…"
                    value={nameFilter}
                    onChange={(e) => onNameFilterChange(e.target.value)}
                    disabled={!workspacePath}
                    aria-label="Path glob"
                />
                <label className="visually-hidden" htmlFor="notes-content-search">
                    Grep file contents
                </label>
                <input
                    id="notes-content-search"
                    className="file-sidebar-input"
                    type="search"
                    placeholder="Grep: search in notes…"
                    value={contentQuery}
                    onChange={(e) => setContentQuery(e.target.value)}
                    disabled={!workspacePath || files.length === 0}
                    aria-label="Search in file contents"
                    aria-describedby="notes-content-search-hint"
                />
                <p id="notes-content-search-hint" className="file-sidebar-hint">
                    {contentSearching
                        ? "Searching…"
                        : showContentResults
                          ? `${contentHits!.length} match${contentHits!.length === 1 ? "" : "es"}` +
                            (nameFilter.trim()
                                ? ` in ${globFiltered.length} globbed file${globFiltered.length === 1 ? "" : "s"}`
                                : "")
                          : nameFilter.trim()
                            ? `${globFiltered.length} file${globFiltered.length === 1 ? "" : "s"} after glob`
                            : "Glob then grep (both apply)"}
                </p>
            </div>

            {files.length === 0 && (
                <div className="file-sidebar-empty">
                    No folder opened or no markdown files found.
                </div>
            )}

            {files.length > 0 && !showContentResults && sortedFiltered.length === 0 && (
                <div className="file-sidebar-empty">
                    No notes match glob “{nameFilter}”.
                </div>
            )}

            {showContentResults && (
                <div
                    className="file-sidebar-results"
                    role="listbox"
                    aria-label="Search results"
                >
                    {contentHits!.length === 0 ? (
                        <div className="file-sidebar-empty">
                            {globFiltered.length === 0
                                ? `No files match glob “${nameFilter}”.`
                                : nameFilter.trim()
                                  ? "No content matches in globbed files."
                                  : "No content matches."}
                        </div>
                    ) : (
                        contentHits!.map((hit, i) => (
                            <button
                                key={`${hit.path}:${hit.line}:${i}`}
                                type="button"
                                role="option"
                                className={`file-tree-item file-search-hit ${
                                    currentFilePath === hit.path ? "active" : ""
                                }`}
                                onClick={() => onSelectFile(hit.path)}
                            >
                                <span className="file-search-hit-path">
                                    {basenameOf(hit.path)}
                                    <span className="file-search-hit-line">:{hit.line}</span>
                                </span>
                                <span className="file-search-hit-text">{hit.text}</span>
                            </button>
                        ))
                    )}
                </div>
            )}

            {!showContentResults && files.length > 0 && sortedFiltered.length > 0 && (
                <div role="listbox" aria-label="Notes" className="file-sidebar-list">
                    {listMode === "flat" ? (
                        sortedFiltered.map((file) => (
                            <button
                                key={file}
                                type="button"
                                role="option"
                                aria-selected={currentFilePath === file}
                                className={`file-tree-item ${currentFilePath === file ? "active" : ""}`}
                                onClick={() => onSelectFile(file)}
                            >
                                <FileIcon />
                                {basenameOf(file)}
                            </button>
                        ))
                    ) : (
                        <TreeRows
                            nodes={tree}
                            depth={0}
                            expanded={expanded}
                            toggle={toggle}
                            currentFilePath={currentFilePath}
                            onSelectFile={onSelectFile}
                        />
                    )}
                </div>
            )}
        </div>
    );
}
