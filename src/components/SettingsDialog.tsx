import { useEffect, useId, useState } from "react";
import type { LaunchMode, MotionSettings } from "../lib/settings";
import { fetchSettings, updateSettings } from "../lib/settingsClient";

export interface SettingsDialogProps {
    onClose: () => void;
}

export function SettingsDialog({ onClose }: SettingsDialogProps) {
    const titleId = useId();
    const [settings, setSettings] = useState<MotionSettings | null>(null);
    const [path, setPath] = useState<string>("");
    const [cliHint, setCliHint] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetchSettings();
                if (cancelled) return;
                setSettings(res.settings);
                setPath(res.path);
                setCliHint(
                    res.cliInstallHint ??
                        "From the Motion repo: bun link   # or symlink bin/motion onto your PATH"
                );
            } catch (e) {
                if (!cancelled) {
                    setError(e instanceof Error ? e.message : String(e));
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const save = async (partial: Partial<MotionSettings>) => {
        if (!settings) return;
        setSaving(true);
        setError(null);
        try {
            const next = await updateSettings(partial);
            setSettings(next);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setSaving(false);
        }
    };

    const setLaunchMode = (launchMode: LaunchMode) => {
        void save({ launchMode });
    };

    const copyInstall = async () => {
        const text =
            cliHint ||
            "bun link  # run from the Motion repository root so the `motion` command is on PATH";
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
        } catch {
            setError("Could not copy to clipboard");
        }
    };

    return (
        <div
            className="save-name-dialog-backdrop"
            role="presentation"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className="settings-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
            >
                <h2 id={titleId} className="save-name-dialog-title">
                    Settings
                </h2>

                {error && (
                    <p className="settings-error" role="alert">
                        {error}
                    </p>
                )}

                {!settings ? (
                    <p className="save-name-dialog-hint">Loading settings…</p>
                ) : (
                    <>
                        <section className="settings-section" aria-labelledby={`${titleId}-cli`}>
                            <h3 id={`${titleId}-cli`} className="settings-section-title">
                                CLI launcher
                            </h3>
                            <p className="save-name-dialog-hint">
                                From a terminal:{" "}
                                <code className="settings-code">motion .</code> opens the current
                                directory, or{" "}
                                <code className="settings-code">motion ./docs</code> opens a
                                folder. Settings below control how that command launches Motion.
                            </p>

                            <fieldset className="settings-fieldset">
                                <legend className="settings-legend">Launch with</legend>
                                <label className="settings-radio">
                                    <input
                                        type="radio"
                                        name="launchMode"
                                        checked={settings.launchMode === "web"}
                                        onChange={() => setLaunchMode("web")}
                                        disabled={saving}
                                    />
                                    <span>
                                        <strong>Web</strong> — <code>bun run dev</code> + browser
                                        (default)
                                    </span>
                                </label>
                                <label className="settings-radio">
                                    <input
                                        type="radio"
                                        name="launchMode"
                                        checked={settings.launchMode === "desktop"}
                                        onChange={() => setLaunchMode("desktop")}
                                        disabled={saving}
                                    />
                                    <span>
                                        <strong>Desktop</strong> — Tauri window (
                                        <code>bun tauri dev</code>)
                                    </span>
                                </label>
                            </fieldset>

                            <label className="settings-field">
                                <span className="save-name-dialog-label">Web port</span>
                                <input
                                    className="save-name-dialog-input"
                                    type="number"
                                    min={1}
                                    max={65535}
                                    value={settings.port}
                                    disabled={saving}
                                    aria-label="Web port"
                                    onChange={(e) => {
                                        const port = Number(e.target.value);
                                        setSettings({ ...settings, port });
                                    }}
                                    onBlur={() => void save({ port: settings.port })}
                                />
                            </label>

                            <label className="settings-checkbox">
                                <input
                                    type="checkbox"
                                    checked={settings.openBrowser}
                                    disabled={saving || settings.launchMode !== "web"}
                                    onChange={(e) => void save({ openBrowser: e.target.checked })}
                                />
                                <span>Open browser after <code>motion</code> starts (web mode)</span>
                            </label>

                            <div className="settings-install">
                                <p className="save-name-dialog-label">Install the CLI</p>
                                <pre className="settings-code-block" tabIndex={0}>
                                    {cliHint}
                                </pre>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => void copyInstall()}
                                >
                                    {copied ? "Copied" : "Copy install hint"}
                                </button>
                                {path ? (
                                    <p className="settings-path-note">
                                        Settings file: <code className="settings-code">{path}</code>
                                    </p>
                                ) : null}
                            </div>
                        </section>
                    </>
                )}

                <div className="save-name-dialog-actions">
                    <button type="button" className="btn btn-primary" onClick={onClose}>
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
