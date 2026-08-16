import { useEffect, useMemo, useRef, useState } from "react";
import Editor from "./components/Editor";
import { storage, rememberWorkspaceRoot, relativeToWorkspace } from "./lib/storage";
import { synthesizeWorkspace } from "./lib/workspaceSynthesis";

type ViewMode = "wysiwyg" | "markdown" | "split";

function App() {
    const [viewMode, setViewMode] = useState<ViewMode>("wysiwyg");
    const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
    const [workspacePath, setWorkspacePath] = useState<string | null>(null);
    const [files, setFiles] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [contents, setContents] = useState<Record<string, string>>({});
    const [synthesis, setSynthesis] = useState<string | null>(null);
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

    // Get basename for display
    const getBasename = (path: string) => {
        return path.split(/[/\\]/).pop() || path;
    };

    const filteredFiles = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return files;
        return files.filter((file) => {
            if (getBasename(file).toLowerCase().includes(q)) return true;
            return (contents[file] ?? "").toLowerCase().includes(q);
        });
    }, [files, searchQuery, contents]);

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
            }
        } catch (error) {
            console.error("Failed to open folder:", error);
            const message = error instanceof Error ? error.message : String(error);
            alert(`Error opening folder: ${message}`);
        }
    };

    /**
     * Workspace-level synthesis: summarize every note, cluster by topic, and
     * write TOC.md and SKILL.md back into the workspace.
     *
     * The three modules behind this were written months ago and had no way for
     * a user to reach them.
     */
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
                    : "")
            );
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error("Workspace synthesis failed:", message);
            setSynthesis(`Synthesis failed: ${message}`);
        }
    };

    const handleFileSelect = (path: string) => {
        setCurrentFilePath(path);
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
            const path = `${workspacePath.replace(/[/\\]$/, "")}${sep}${name}`;
            const content = "# New Note\n\n";
            await storage.writeFile(path, content);
            setFiles((prev) => [...prev, path].sort((a, b) => a.localeCompare(b)));
            setContents((prev) => ({ ...prev, [path]: content }));
            setCurrentFilePath(path);
            setSearchQuery("");
        } catch (error) {
            console.error("Failed to create note:", error);
            const message = error instanceof Error ? error.message : String(error);
            alert(`Error creating note: ${message}`);
        }
    };

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

                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
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
                    <h3 style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "var(--space-3)" }}>
                        {workspacePath ? getBasename(workspacePath) : "Documents"}
                    </h3>

                    {files.length === 0 && (
                        <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
                            No folder opened or no markdown files found.
                        </div>
                    )}

                    {files.length > 0 && filteredFiles.length === 0 && (
                        <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
                            No notes match “{searchQuery}”.
                        </div>
                    )}

                    {/* Real buttons, not clickable divs: the file list has to be
                        keyboard-reachable and addressable by accessible name --
                        for users first, and so E2E specs can select a note by
                        its name instead of a brittle CSS path. */}
                    <div role="listbox" aria-label="Notes">
                        {filteredFiles.map(file => (
                            <button
                                key={file}
                                type="button"
                                role="option"
                                aria-selected={currentFilePath === file}
                                className={`file-tree-item ${currentFilePath === file ? "active" : ""}`}
                                onClick={() => handleFileSelect(file)}
                            >
                                <svg className="file-tree-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                </svg>
                                <span className="file-tree-copy">
                                    <span className="file-tree-name">{getBasename(file)}</span>
                                    {snippetFor(file) && (
                                        <span className="file-tree-snippet" aria-hidden="true">
                                            {snippetFor(file)}
                                        </span>
                                    )}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <main className="app-main">
                <Editor viewMode={viewMode} filePath={currentFilePath} />
            </main>
        </div>
    );
}

export default App;
