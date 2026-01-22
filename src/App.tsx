import { useState, useEffect } from "react";
import Editor from "./components/Editor";
import { storage } from "./lib/storage";

type ViewMode = "wysiwyg" | "markdown" | "split";

function App() {
    const [viewMode, setViewMode] = useState<ViewMode>("wysiwyg");
    const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
    const [workspacePath, setWorkspacePath] = useState<string | null>(null);
    const [files, setFiles] = useState<string[]>([]);

    const handleOpenFolder = async () => {
        const path = await storage.openFolder();
        if (path) {
            setWorkspacePath(path);
            const markdownFiles = await storage.listFiles(path);
            setFiles(markdownFiles);
        }
    };

    const handleFileSelect = (path: string) => {
        setCurrentFilePath(path);
    };

    // Get basename for display
    const getBasename = (path: string) => {
        return path.split(/[/\\]/).pop() || path;
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
                    <input type="text" placeholder="Search notes... (⌘K)" />
                </div>

                <div className="view-toggle">
                    <button className={`view-toggle-btn ${viewMode === "wysiwyg" ? "active" : ""}`} onClick={() => setViewMode("wysiwyg")}>WYSIWYG</button>
                    <button className={`view-toggle-btn ${viewMode === "markdown" ? "active" : ""}`} onClick={() => setViewMode("markdown")}>Markdown</button>
                    <button className={`view-toggle-btn ${viewMode === "split" ? "active" : ""}`} onClick={() => setViewMode("split")}>Split</button>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <button className="btn btn-secondary" onClick={handleOpenFolder}>
                        Open Folder
                    </button>
                    <button className="btn btn-primary">
                        New Note
                    </button>
                </div>
            </header>

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

                    {files.map(file => (
                        <div
                            key={file}
                            className={`file-tree-item ${currentFilePath === file ? "active" : ""}`}
                            onClick={() => handleFileSelect(file)}
                        >
                            <svg className="file-tree-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                            </svg>
                            {getBasename(file)}
                        </div>
                    ))}
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
