import { useEffect, useRef, useState } from "react";
import { publishToGist, publishToNotion, type PublishResult } from "../../lib/publish/client";
import { loadPublishSettings, savePublishSettings, type PublishSettings } from "../../lib/publish/settings";
import { IconShare } from "../icons";

type ShareMenuProps = {
    disabled: boolean;
    filename: string;
    getContent: () => string;
};

type ResultState =
    | { kind: "idle" }
    | { kind: "working"; label: string }
    | { kind: "success"; url: string }
    | { kind: "error"; message: string };

export default function ShareMenu({ disabled, filename, getContent }: ShareMenuProps) {
    const [open, setOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [draft, setDraft] = useState<PublishSettings>(() => loadPublishSettings());
    const [result, setResult] = useState<ResultState>({ kind: "idle" });
    const [copied, setCopied] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const filenameRef = useRef(filename);
    filenameRef.current = filename;

    useEffect(() => {
        if (!open) return;
        const onDoc = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        document.addEventListener("mousedown", onDoc);
        window.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDoc);
            window.removeEventListener("keydown", onKey);
        };
    }, [open]);

    function openSettings() {
        setDraft(loadPublishSettings());
        setSettingsOpen(true);
        setOpen(false);
    }

    function saveSettings() {
        savePublishSettings(draft);
        setSettingsOpen(false);
        setResult({ kind: "idle" });
    }

    async function runPublish(kind: "gist" | "notion") {
        setOpen(false);
        const current = loadPublishSettings();
        if (kind === "gist" && !current.githubToken) {
            openSettings();
            setResult({ kind: "error", message: "Add a GitHub token in Settings to publish a Gist." });
            return;
        }
        if (kind === "notion" && (!current.notionToken || !current.notionParentPageId)) {
            openSettings();
            setResult({ kind: "error", message: "Add a Notion token and parent page in Settings." });
            return;
        }

        const name = filenameRef.current;
        const body = getContent();
        setResult({ kind: "working", label: kind === "gist" ? "Publishing Gist…" : "Publishing to Notion…" });
        let outcome: PublishResult;
        try {
            outcome = kind === "gist"
                ? await publishToGist({ filename: name, content: body, token: current.githubToken })
                : await publishToNotion({
                    title: name.replace(/\.mdx?$/i, "") || "Untitled",
                    content: body,
                    token: current.notionToken,
                    parentPageId: current.notionParentPageId,
                });
        } catch (err) {
            outcome = { ok: false, error: err instanceof Error ? err.message : String(err) };
        }
        if (outcome.ok && outcome.url) {
            setCopied(false);
            setResult({ kind: "success", url: outcome.url });
        } else {
            setResult({ kind: "error", message: outcome.error || "Publish failed" });
        }
    }

    useEffect(() => {
        const onShare = (e: Event) => {
            const kind = (e as CustomEvent<string>).detail;
            if (kind === "gist") void runPublish("gist");
            else if (kind === "notion") void runPublish("notion");
            else if (kind === "settings") openSettings();
        };
        window.addEventListener("motion-share", onShare);
        return () => window.removeEventListener("motion-share", onShare);
    }, []);

    async function copyLink(url: string) {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
        } catch {
            setCopied(false);
        }
    }

    return (
        <div className="share-root" ref={rootRef}>
            <button
                type="button"
                className="btn btn-secondary btn-icon"
                data-testid="share"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label="Share"
                disabled={disabled || result.kind === "working"}
                title={
                    result.kind === "working"
                        ? result.label
                        : disabled
                          ? "Select a note to share"
                          : "Publish this note"
                }
                onClick={() => setOpen((v) => !v)}
            >
                <IconShare />
            </button>

            {open && (
                <div className="share-menu" role="menu" aria-label="Share">
                    <button type="button" role="menuitem" onClick={() => void runPublish("gist")}>
                        Publish to Gist
                    </button>
                    <button type="button" role="menuitem" onClick={() => void runPublish("notion")}>
                        Publish to Notion
                    </button>
                    <div className="share-menu-sep" role="separator" />
                    <button type="button" role="menuitem" onClick={openSettings}>
                        Settings…
                    </button>
                </div>
            )}

            {settingsOpen && (
                <div className="publish-modal" role="dialog" aria-modal="true" aria-label="Publish settings">
                    <div className="publish-dialog">
                        <h2>Publish settings</h2>
                        <label>
                            GitHub token
                            <input
                                type="password"
                                autoComplete="off"
                                value={draft.githubToken}
                                onChange={(e) => setDraft({ ...draft, githubToken: e.target.value })}
                                placeholder="ghp_… gist scope"
                            />
                        </label>
                        <label>
                            Notion token
                            <input
                                type="password"
                                autoComplete="off"
                                value={draft.notionToken}
                                onChange={(e) => setDraft({ ...draft, notionToken: e.target.value })}
                                placeholder="secret_… or ntn_…"
                            />
                        </label>
                        <label>
                            Notion parent page
                            <input
                                type="text"
                                value={draft.notionParentPageId}
                                onChange={(e) => setDraft({ ...draft, notionParentPageId: e.target.value })}
                                placeholder="Page URL or id"
                            />
                        </label>
                        <p className="publish-hint">
                            Tokens stay on this machine. Share the Notion parent page with your integration.
                        </p>
                        <div className="publish-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => setSettingsOpen(false)}>
                                Cancel
                            </button>
                            <button type="button" className="btn btn-primary" onClick={saveSettings}>
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {result.kind === "success" && (
                <div className="publish-modal" role="status" aria-label="Published">
                    <div className="publish-dialog">
                        <h2>Published</h2>
                        <a href={result.url} target="_blank" rel="noreferrer">
                            {result.url}
                        </a>
                        <div className="publish-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => copyLink(result.url)}>
                                {copied ? "Copied" : "Copy link"}
                            </button>
                            <button type="button" className="btn btn-primary" onClick={() => setResult({ kind: "idle" })}>
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {result.kind === "error" && !settingsOpen && (
                <div className="publish-modal" role="status" aria-label="Publish failed">
                    <div className="publish-dialog">
                        <h2>Publish failed</h2>
                        <p>{result.message}</p>
                        <div className="publish-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => setResult({ kind: "idle" })}>
                                Dismiss
                            </button>
                            <button type="button" className="btn btn-primary" onClick={openSettings}>
                                Settings…
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
