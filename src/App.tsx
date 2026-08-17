import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Editor, { type SaveState } from "./components/Editor";
import { storage, rememberWorkspaceRoot, relativeToWorkspace } from "./lib/storage";
import { synthesizeWorkspace } from "./lib/workspaceSynthesis";

type ViewMode = "wysiwyg" | "markdown" | "split";

type TreeNode = {
    name: string;
    /** Absolute path for files; folder key path for directories */
    path: string;
    kind: "file" | "folder";
    children?: TreeNode[];
};

function getBasename(path: string) {
    return path.split(/[/\\]/).pop() || path;
}

function pathSep(root: string) {
    return root.includes("\\") ? "\\" : "/";
}

/** Build a sorted directory tree from absolute file paths under workspaceRoot. */
function buildTree(absolutePaths: string[], workspaceRoot: string | null): TreeNode[] {
    if (!workspaceRoot) {
        return absolutePaths
            .map((p) => ({ name: getBasename(p), path: p, kind: "file" as const }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }
    const sep = pathSep(workspaceRoot);
    const rootNorm = workspaceRoot.replace(/[/\\]$/, "");

    type Mutable = { name: string; path: string; kind: "file" | "folder"; children: Map<string, Mutable> };
    const root: Mutable = { name: "", path: rootNorm, kind: "folder", children: new Map() };

    for (const abs of absolutePaths) {
        let rel = abs;
        if (abs.startsWith(rootNorm + sep)) rel = abs.slice(rootNorm.length + 1);
        else if (abs.startsWith(rootNorm + "/") || abs.startsWith(rootNorm + "\\")) {
            rel = abs.slice(rootNorm.length + 1);
        }
        const parts = rel.split(/[/\\]/).filter(Boolean);
        if (parts.length === 0) continue;

        let node = root;
        let acc = rootNorm;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            acc = `${acc}${sep}${part}`;
            const isFile = i === parts.length - 1;
            if (!node.children.has(part)) {
                node.children.set(part, {
                    name: part,
                    path: isFile ? abs : acc,
                    kind: isFile ? "file" : "folder",
                    children: new Map(),
                });
            }
            node = node.children.get(part)!;
            if (isFile) node.path = abs;
        }
    }

    function toNodes(m: Mutable): TreeNode[] {
        const list = Array.from(m.children.values()).sort((a, b) => {
            if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
            return a.name.localeCompare(b.name);
        });
        return list.map((c) => ({
            name: c.name,
            path: c.path,
            kind: c.kind,
            children: c.kind === "folder" ? toNodes(c) : undefined,
        }));
    }

    return toNodes(root);
}

/** Collect folder paths that are ancestors of the given file paths. */
function ancestorFolders(filePaths: string[], workspaceRoot: string | null): Set<string> {
    const out = new Set<string>();
    if (!workspaceRoot) return out;
    const sep = pathSep(workspaceRoot);
    const rootNorm = workspaceRoot.replace(/[/\\]$/, "");
    for (const abs of filePaths) {
        let rel = abs;
        if (abs.startsWith(rootNorm + sep)) rel = abs.slice(rootNorm.length + 1);
        const parts = rel.split(/[/\\]/).filter(Boolean);
        let acc = rootNorm;
        for (let i = 0; i < parts.length - 1; i++) {
            acc = `${acc}${sep}${parts[i]}`;
            out.add(acc);
        }
    }
    return out;
}

function parentDirOf(filePath: string | null, workspaceRoot: string): string {
    const root = workspaceRoot.replace(/[/\\]$/, "");
    if (!filePath) return root;
    const last = Math.max(filePath.lastIndexOf("/"), filePath.lastIndexOf("\\"));
    if (last <= 0) return root;
    const candidate = filePath.slice(0, last);
    return candidate.startsWith(root) ? candidate : root;
}

function sanitizeFolderName(raw: string): string {
    return raw
        .trim()
        .replace(/[/\\]+/g, "-")
        .replace(/^\.+/, "")
        .replace(/\s+/g, "-")
        .slice(0, 80);
}

function App() {
    const [viewMode, setViewMode] = useState<ViewMode>("wysiwyg");
    const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
    const [workspacePath, setWorkspacePath] = useState<string | null>(null);
    const [files, setFiles] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [contents, setContents] = useState<Record<string, string>>({});
    const [synthesis, setSynthesis] = useState<string | null>(null);
    const [saveSignal, setSaveSignal] = useState(0);
    const [saveState, setSaveState] = useState<SaveState>("idle");
    const [dirty, setDirty] = useState(false);
    /** Folder absolute paths that are expanded. Empty set means “all expanded” until user toggles. */
    const [expanded, setExpanded] = useState<Set<string> | null>(null);
    const [notesOpen, setNotesOpen] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                searchRef.current?.focus();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    const filteredFiles = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return files;
        return files.filter((file) => {
            if (getBasename(file).toLowerCase().includes(q)) return true;
            return (contents[file] ?? "").toLowerCase().includes(q);
        });
    }, [files, searchQuery, contents]);

    const tree = useMemo(
        () => buildTree(filteredFiles, workspacePath),
        [filteredFiles, workspacePath],
    );

    const searchAncestors = useMemo(
        () => (searchQuery.trim() ? ancestorFolders(filteredFiles, workspacePath) : null),
        [searchQuery, filteredFiles, workspacePath],
    );

    function isExpanded(folderPath: string): boolean {
        if (searchAncestors) return searchAncestors.has(folderPath);
        if (expanded === null) return true; // default: all open
        return expanded.has(folderPath);
    }

    function toggleFolder(folderPath: string) {
        setExpanded((prev) => {
            const base =
                prev === null
                    ? new Set(
                          // seed with every current folder path so closing one doesn't collapse all
                          collectFolderPaths(buildTree(files, workspacePath)),
                      )
                    : new Set(prev);
            if (base.has(folderPath)) base.delete(folderPath);
            else base.add(folderPath);
            return base;
        });
    }

    function snippetFor(file: string): string | null {
        const q = searchQuery.trim();
        if (!q) return null;
        if (getBasename(file).toLowerCase().includes(q.toLowerCase())) return null;
        const text = contents[file] ?? "";
        const i = text.toLowerCase().indexOf(q.toLowerCase());
        if (i < 0) return null;
        const start = Math.max(0, i - 24);
        const raw = text.slice(start, start + 72).replace(/\s+/g, " ").trim();
        return `${start > 0 ? "…" : ""}${raw}…`;
    }

    async function cacheContents(paths: string[]) {
        const next: Record<string, string> = {};
        await Promise.all(
            paths.map(async (p) => {
                try {
                    next[p] = await storage.readFile(p);
                } catch {
                    next[p] = "";
                }
            }),
        );
        setContents(next);
    }

    useEffect(() => {
        if (!notesOpen) return;
        const onEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") setNotesOpen(false);
        };
        window.addEventListener("keydown", onEsc);
        return () => window.removeEventListener("keydown", onEsc);
    }, [notesOpen]);

    const handleOpenFolder = async () => {
        try {
            const path = await storage.openFolder();
            if (path) {
                setWorkspacePath(path);
                rememberWorkspaceRoot(path);
                const markdownFiles = await storage.listFiles(path);
                setFiles(markdownFiles);
                await cacheContents(markdownFiles);
                setCurrentFilePath(null);
                setSearchQuery("");
                setExpanded(null); // default all expanded
            }
        } catch (error) {
            console.error("Failed to open folder:", error);
            const message = error instanceof Error ? error.message : String(error);
            alert(`Error opening folder: ${message}`);
        }
    };

    const handleSynthesize = async () => {
        if (!workspacePath || synthesis) return;

        const sep = workspacePath.includes("\\") ? "\\" : "/";
        try {
            const result = await synthesizeWorkspace({
                listFiles: () => storage.listFiles(workspacePath),
                readFile: (p) => storage.readFile(p),
                writeFile: (p, c) => storage.writeFile(p, c),
                toRelative: relativeToWorkspace,
                joinWorkspace: (name) =>
                    `${workspacePath.replace(/[/\\]$/, "")}${sep}${name}`,
                onProgress: setSynthesis,
            });

            setFiles(await storage.listFiles(workspacePath));
            await cacheContents(await storage.listFiles(workspacePath));
            setSynthesis(
                `Synthesized ${result.noteCount} notes into TOC.md and SKILL.md` +
                    (result.topic.suggestedLabels.length
                        ? ` — topics: ${result.topic.suggestedLabels.join(", ")}`
                        : ""),
            );
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error("Workspace synthesis failed:", message);
            setSynthesis(`Synthesis failed: ${message}`);
        }
    };

    const handleFileSelect = (path: string) => {
        setCurrentFilePath(path);
        setNotesOpen(false);
    };

    const handleNewNote = async () => {
        if (!workspacePath) {
            alert("Open a folder first to create a new note.");
            return;
        }

        try {
            const stamp = new Date().toISOString().replace(/[:.]/g, "-");
            const name = `untitled-${stamp}.md`;
            const sep = workspacePath.includes("\\") ? "\\" : "/";
            const root = workspacePath.replace(/[/\\]$/, "");
            const parentDir = parentDirOf(currentFilePath, workspacePath);
            const path = `${parentDir}${sep}${name}`;
            const content = "# New Note\n\n";
            await storage.writeFile(path, content);
            setFiles((prev) => [...prev, path].sort((a, b) => a.localeCompare(b)));
            setContents((prev) => ({ ...prev, [path]: content }));
            setCurrentFilePath(path);
            setSearchQuery("");
            setExpanded((prev) => {
                if (prev === null) return null;
                if (parentDir === root) return prev;
                const next = new Set(prev);
                next.add(parentDir);
                return next;
            });
        } catch (error) {
            console.error("Failed to create note:", error);
            const message = error instanceof Error ? error.message : String(error);
            alert(`Error creating note: ${message}`);
        }
    };

    const handleNewFolder = async () => {
        if (!workspacePath) {
            alert("Open a folder first to create a new folder.");
            return;
        }
        const raw = window.prompt("Folder name", "new-folder");
        if (raw == null) return;
        const name = sanitizeFolderName(raw);
        if (!name) {
            alert("Folder name cannot be empty.");
            return;
        }

        try {
            const sep = workspacePath.includes("\\") ? "\\" : "/";
            const parentDir = parentDirOf(currentFilePath, workspacePath);
            const folderPath = `${parentDir}${sep}${name}`;
            const readme = `${folderPath}${sep}README.md`;
            const content = `# ${name}\n\n`;
            await storage.writeFile(readme, content);
            setFiles((prev) => (prev.includes(readme) ? prev : [...prev, readme].sort((a, b) => a.localeCompare(b))));
            setContents((prev) => ({ ...prev, [readme]: content }));
            setCurrentFilePath(readme);
            setSearchQuery("");
            setExpanded((prev) => {
                if (prev === null) return null;
                const next = new Set(prev);
                next.add(folderPath);
                if (parentDir !== workspacePath.replace(/[/\\]$/, "")) next.add(parentDir);
                return next;
            });
        } catch (error) {
            console.error("Failed to create folder:", error);
            const message = error instanceof Error ? error.message : String(error);
            alert(`Error creating folder: ${message}`);
        }
    };

    const handleSaved = useCallback((path: string, content: string) => {
        setContents((prev) => ({ ...prev, [path]: content }));
    }, []);

    function renderNode(node: TreeNode, depth: number): React.ReactNode {
        if (node.kind === "folder") {
            const open = isExpanded(node.path);
            return (
                <div key={node.path} role="group" aria-label={node.name}>
                    <button
                        type="button"
                        className="file-tree-item file-tree-folder"
                        style={{ paddingLeft: `calc(var(--space-2) + ${depth * 12}px)` }}
                        aria-expanded={open}
                        onClick={() => toggleFolder(node.path)}
                    >
                        <svg
                            className="file-tree-icon"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            aria-hidden="true"
                            style={{
                                transform: open ? "rotate(90deg)" : "none",
                                transition: "transform 0.12s ease",
                            }}
                        >
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                        <span className="file-tree-name">{node.name}</span>
                    </button>
                    {open && node.children?.map((child) => renderNode(child, depth + 1))}
                </div>
            );
        }

        return (
            <button
                key={node.path}
                type="button"
                role="treeitem"
                aria-selected={currentFilePath === node.path}
                className={`file-tree-item ${currentFilePath === node.path ? "active" : ""}`}
                style={{ paddingLeft: `calc(var(--space-2) + ${depth * 12}px)` }}
                onClick={() => handleFileSelect(node.path)}
            >
                <svg className="file-tree-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                </svg>
                <span className="file-tree-copy">
                    <span className="file-tree-name">
                        {node.name}
                        {dirty && currentFilePath === node.path ? (
                            <span className="file-tree-dirty" aria-hidden="true">
                                {" "}
                                •
                            </span>
                        ) : null}
                    </span>
                    {snippetFor(node.path) && (
                        <span className="file-tree-snippet" aria-hidden="true">
                            {snippetFor(node.path)}
                        </span>
                    )}
                </span>
            </button>
        );
    }

    return (
        <div className="app">
            {/* Header */}
            <header className="app-header">
                <div className="logo">
                    <div className="logo-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2L2 7l10 5 10-5-10-5z" />
                            <path d="M2 17l10 5 10-5" />
                            <path d="M2 12l10 5 10-5" />
                        </svg>
                    </div>
                    Motion
                </div>

                <button
                    type="button"
                    className="btn btn-secondary notes-toggle"
                    data-testid="open-notes"
                    aria-expanded={notesOpen}
                    aria-controls="notes-drawer"
                    onClick={() => setNotesOpen((v) => !v)}
                >
                    Notes
                </button>

                <div className="search-bar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        ref={searchRef}
                        type="text"
                        placeholder="Search notes and contents..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        aria-label="Search notes"
                    />
                </div>

                <div className="view-toggle" role="group" aria-label="Editor view mode">
                    <button type="button" className={`view-toggle-btn ${viewMode === "wysiwyg" ? "active" : ""}`} aria-pressed={viewMode === "wysiwyg"} onClick={() => setViewMode("wysiwyg")}>WYSIWYG</button>
                    <button type="button" className={`view-toggle-btn ${viewMode === "markdown" ? "active" : ""}`} aria-pressed={viewMode === "markdown"} onClick={() => setViewMode("markdown")}>Markdown</button>
                    <button type="button" className={`view-toggle-btn ${viewMode === "split" ? "active" : ""}`} aria-pressed={viewMode === "split"} onClick={() => setViewMode("split")}>Split</button>
                </div>

                <div style={{ display: "flex", gap: "var(--space-2)" }}>
                    <button className="btn btn-secondary" onClick={handleOpenFolder}>
                        Open Folder
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleNewNote}
                        disabled={!workspacePath}
                        title={workspacePath ? "Create a new markdown note" : "Open a folder first"}
                    >
                        New Note
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={handleNewFolder}
                        disabled={!workspacePath}
                        data-testid="new-folder"
                        title={workspacePath ? "Create a folder with a README" : "Open a folder first"}
                    >
                        New Folder
                    </button>
                    <button
                        className={dirty ? "btn btn-primary" : "btn btn-secondary"}
                        onClick={() => setSaveSignal((n) => n + 1)}
                        disabled={!currentFilePath || saveState === "saving"}
                        aria-label="Save note"
                        title={
                            !currentFilePath
                                ? "Select a note to save"
                                : dirty
                                  ? "Save note (⌘S)"
                                  : "All changes saved"
                        }
                    >
                        {saveState === "saving"
                            ? "Saving…"
                            : saveState === "saved"
                              ? "Saved"
                              : saveState === "error"
                                ? "Save failed"
                                : "Save"}
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={handleSynthesize}
                        disabled={!workspacePath || synthesis !== null}
                        title={
                            workspacePath
                                ? "Summarize every note, cluster by topic, and write TOC.md and SKILL.md"
                                : "Open a folder first"
                        }
                    >
                        Synthesize
                    </button>
                </div>
            </header>

            {synthesis && (
                <div role="status" aria-live="polite" aria-label="Workspace synthesis" className="synthesis-status">
                    {synthesis}
                    <button
                        className="synthesis-dismiss"
                        onClick={() => setSynthesis(null)}
                        aria-label="Dismiss synthesis status"
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Sidebar */}
            <aside className="app-sidebar">
                <div className="file-tree">
                    <h3
                        style={{
                            fontSize: "var(--text-xs)",
                            fontWeight: 600,
                            color: "var(--color-text-muted)",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            marginBottom: "var(--space-3)",
                        }}
                    >
                        {workspacePath ? getBasename(workspacePath) : "Documents"}
                    </h3>

                    {files.length === 0 && (
                        <div
                            style={{
                                padding: "var(--space-4)",
                                textAlign: "center",
                                color: "var(--color-text-secondary)",
                                fontSize: "var(--text-sm)",
                            }}
                        >
                            No folder opened or no markdown files found.
                        </div>
                    )}

                    {files.length > 0 && filteredFiles.length === 0 && (
                        <div
                            style={{
                                padding: "var(--space-4)",
                                textAlign: "center",
                                color: "var(--color-text-secondary)",
                                fontSize: "var(--text-sm)",
                            }}
                        >
                            No notes match “{searchQuery}”.
                        </div>
                    )}

                    <div role="tree" aria-label="Notes">
                        {tree.map((node) => renderNode(node, 0))}
                    </div>
                </div>
            </aside>

            {notesOpen && (
                <>
                    <button
                        type="button"
                        className="notes-backdrop"
                        aria-label="Close notes"
                        onClick={() => setNotesOpen(false)}
                    />
                    <div
                        id="notes-drawer"
                        className="notes-drawer"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Notes"
                        data-testid="notes-drawer"
                    >
                        <div className="file-tree">
                            <h3
                                style={{
                                    fontSize: "var(--text-xs)",
                                    fontWeight: 600,
                                    color: "var(--color-text-muted)",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                    marginBottom: "var(--space-3)",
                                }}
                            >
                                {workspacePath ? getBasename(workspacePath) : "Documents"}
                            </h3>
                            {files.length === 0 && (
                                <div
                                    style={{
                                        padding: "var(--space-4)",
                                        textAlign: "center",
                                        color: "var(--color-text-secondary)",
                                        fontSize: "var(--text-sm)",
                                    }}
                                >
                                    No folder opened or no markdown files found.
                                </div>
                            )}
                            {files.length > 0 && filteredFiles.length === 0 && (
                                <div
                                    style={{
                                        padding: "var(--space-4)",
                                        textAlign: "center",
                                        color: "var(--color-text-secondary)",
                                        fontSize: "var(--text-sm)",
                                    }}
                                >
                                    No notes match “{searchQuery}”.
                                </div>
                            )}
                            <div role="tree" aria-label="Notes">
                                {tree.map((node) => renderNode(node, 0))}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Main content */}
            <main className="app-main">
                <Editor
                    viewMode={viewMode}
                    filePath={currentFilePath}
                    saveSignal={saveSignal}
                    onSaveStateChange={setSaveState}
                    onDirtyChange={setDirty}
                    onSaved={handleSaved}
                />
            </main>
        </div>
    );
}

function collectFolderPaths(nodes: TreeNode[]): string[] {
    const out: string[] = [];
    for (const n of nodes) {
        if (n.kind === "folder") {
            out.push(n.path);
            if (n.children) out.push(...collectFolderPaths(n.children));
        }
    }
    return out;
}

export default App;
