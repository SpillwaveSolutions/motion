import { useCallback, useEffect, useRef, useState } from "react";
import Editor, { type SaveOutcome } from "./components/Editor";
import { FileSidebar } from "./components/FileSidebar";
import { SettingsDialog } from "./components/SettingsDialog";
import { UnsavedChangesDialog } from "./components/UnsavedChangesDialog";
import { basenameOf } from "./lib/noteNaming";
import {
    storage,
    rememberWorkspaceRoot,
    relativeToWorkspace,
    fetchBootstrap,
} from "./lib/storage";
import { useCaptureMode } from "./lib/useCaptureMode";
import { useZoom } from "./lib/useZoom";
import { synthesizeWorkspace } from "./lib/workspaceSynthesis";

type ViewMode = "wysiwyg" | "markdown" | "split";

function App() {
    useCaptureMode();
    useZoom();
    const [viewMode, setViewMode] = useState<ViewMode>("wysiwyg");
    const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
    /** New Note that has not been saved under a real name yet (macOS Untitled). */
    const [isNewDocument, setIsNewDocument] = useState(false);
    const [workspacePath, setWorkspacePath] = useState<string | null>(null);
    const [files, setFiles] = useState<string[]>([]);
    const [nameFilter, setNameFilter] = useState("");
    const [synthesis, setSynthesis] = useState<string | null>(null);
    const [recentOpens, setRecentOpens] = useState<Map<string, number>>(() => new Map());
    const [settingsOpen, setSettingsOpen] = useState(false);
    /** Editor buffer differs from disk — reported up by the Editor. */
    const [dirty, setDirty] = useState(false);
    /** A file switch held back by the unsaved-changes guard. */
    const [pendingFile, setPendingFile] = useState<string | null>(null);
    // The Editor's own Save, so the dialog cannot grow a second save path.
    const saveRef = useRef<(() => Promise<SaveOutcome>) | null>(null);
    // Stable identity: the Editor re-registers whenever its save closure
    // changes, and an unstable callback here would make that effect loop.
    const registerSave = useCallback((save: () => Promise<SaveOutcome>) => {
        saveRef.current = save;
    }, []);

    const markRecent = useCallback((path: string) => {
        setRecentOpens((prev) => {
            const next = new Map(prev);
            next.set(path, Date.now());
            return next;
        });
    }, []);

    const applyWorkspace = useCallback(async (path: string) => {
        setWorkspacePath(path);
        rememberWorkspaceRoot(path);
        const markdownFiles = await storage.listFiles(path);
        setFiles(markdownFiles);
        setCurrentFilePath(null);
        setIsNewDocument(false);
        setNameFilter("");
    }, []);

    const handleOpenFolder = async () => {
        try {
            const path = await storage.openFolder();
            if (path) {
                await applyWorkspace(path);
            }
        } catch (error) {
            console.error("Failed to open folder:", error);
            const message = error instanceof Error ? error.message : String(error);
            alert(`Error opening folder: ${message}`);
        }
    };

    /** Opens a note unconditionally. Guarded callers go through requestFileSelect. */
    const handleFileSelect = useCallback(
        (path: string) => {
            setIsNewDocument(false);
            setCurrentFilePath(path);
            markRecent(path);
        },
        [markRecent]
    );

    /**
     * Sidebar selection, guarded. When the open note has unsaved edits the
     * switch is held in `pendingFile` until the dialog resolves it. The
     * bootstrap path deliberately calls handleFileSelect directly: nothing can
     * be dirty before the first document loads.
     */
    const requestFileSelect = useCallback(
        (path: string) => {
            if (dirty && path !== currentFilePath) {
                setPendingFile(path);
                return;
            }
            handleFileSelect(path);
        },
        [dirty, currentFilePath, handleFileSelect]
    );

    // `motion <dir>` sets MOTION_AUTO_OPEN so we open the CLI folder on boot,
    // and `motion <file.md>` adds MOTION_OPEN_FILE to land in the note itself.
    // The shared E2E server sets neither, so the empty-shell cold start every
    // other spec relies on is preserved (e2e/cli-open-file.spec.ts drives its
    // own server on 3001 instead).
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const boot = await fetchBootstrap();
                if (cancelled || !boot.autoOpen || !boot.root) return;
                // applyWorkspace clears the selection, so the note is opened after it.
                await applyWorkspace(boot.root);
                if (!cancelled && boot.openFile) handleFileSelect(boot.openFile);
            } catch (error) {
                console.error("CLI auto-open failed:", error);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [applyWorkspace, handleFileSelect]);

    /**
     * Workspace-level synthesis: summarize every note, cluster by topic, and
     * write TOC.md and SKILL.md back into the workspace.
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

    /**
     * macOS-style new document: in memory until the first Save, which prompts
     * for a name defaulting from the H1 title (New Note → new-note.md).
     */
    const handleNewNote = () => {
        if (!workspacePath) {
            alert("Open a folder first to create a new note.");
            return;
        }
        setIsNewDocument(true);
        setCurrentFilePath(null);
        setNameFilter("");
    };

    /**
     * Unsaved-changes guard, Save. Runs the editor's own Save and only then
     * opens the note the user asked for.
     *
     * If Save routed to the name sheet (the dirty document is Untitled) the
     * pending switch is abandoned rather than queued: the user is mid-naming,
     * and yanking them off the document at that moment is worse than making
     * them click the target again.
     */
    const handleGuardSave = async () => {
        const target = pendingFile;
        setPendingFile(null);
        const outcome = (await saveRef.current?.()) ?? "failed";
        if (outcome === "saved" && target) handleFileSelect(target);
    };

    const handleGuardDiscard = () => {
        const target = pendingFile;
        setPendingFile(null);
        if (target) handleFileSelect(target);
    };

    const handleDocumentSaved = async (path: string) => {
        setIsNewDocument(false);
        setCurrentFilePath(path);
        markRecent(path);
        if (workspacePath) {
            try {
                setFiles(await storage.listFiles(workspacePath));
            } catch (error) {
                console.error("Failed to refresh file list after save:", error);
            }
        }
    };

    return (
        <div className="app">
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

                {/* Name filter also in header for quick access / existing a11y tests */}
                <div className="search-bar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        type="search"
                        placeholder="Glob or name filter…"
                        value={nameFilter}
                        onChange={(e) => setNameFilter(e.target.value)}
                        aria-label="Search notes"
                        disabled={!workspacePath}
                    />
                </div>

                <div className="view-toggle">
                    <button className={`view-toggle-btn ${viewMode === "wysiwyg" ? "active" : ""}`} onClick={() => setViewMode("wysiwyg")}>WYSIWYG</button>
                    <button className={`view-toggle-btn ${viewMode === "markdown" ? "active" : ""}`} onClick={() => setViewMode("markdown")}>Markdown</button>
                    <button className={`view-toggle-btn ${viewMode === "split" ? "active" : ""}`} onClick={() => setViewMode("split")}>Split</button>
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
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setSettingsOpen(true)}
                        aria-label="Settings"
                        title="Settings"
                    >
                        Settings
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

            <aside className="app-sidebar">
                <FileSidebar
                    workspacePath={workspacePath}
                    files={files}
                    currentFilePath={currentFilePath}
                    nameFilter={nameFilter}
                    onNameFilterChange={setNameFilter}
                    onSelectFile={requestFileSelect}
                    recentOpens={recentOpens}
                />
            </aside>

            <main className="app-main">
                <Editor
                    viewMode={viewMode}
                    filePath={currentFilePath}
                    isNewDocument={isNewDocument}
                    workspacePath={workspacePath}
                    existingFiles={files}
                    onDocumentSaved={handleDocumentSaved}
                    onDirtyChange={setDirty}
                    onRegisterSave={registerSave}
                />
            </main>

            {pendingFile && (
                <UnsavedChangesDialog
                    currentName={currentFilePath ? basenameOf(currentFilePath) : "Untitled"}
                    incomingName={basenameOf(pendingFile)}
                    onSave={handleGuardSave}
                    onDiscard={handleGuardDiscard}
                    onCancel={() => setPendingFile(null)}
                />
            )}

            {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} />}
        </div>
    );
}

export default App;
