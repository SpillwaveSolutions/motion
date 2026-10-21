import { useEffect, useMemo, useState } from "react";
import { renderThemedHtml } from "../../lib/exportHtml";
import { exportDocx } from "../../lib/exportDocx";
import { exportPdf } from "../../lib/exportPdf";
import {
    CLAY,
    findTheme,
    listThemes,
    parseHex,
    slugThemeId,
    type ExportTheme,
    type ThemeFont,
} from "../../lib/themes";

const FONTS: ThemeFont[] = ["serif", "sans", "mono"];

function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

export function ExportDialog({
    kind,
    markdown,
    filename,
    themes,
    themeId,
    onClose,
}: {
    kind: "pdf" | "docx";
    markdown: string;
    filename: string;
    themes: readonly ExportTheme[];
    themeId: string;
    onClose: (chosenId: string | null) => void;
}) {
    const [id, setId] = useState(themeId);
    const theme = findTheme(id, themes.filter((item) => !item.builtin));
    const title = filename.replace(/\.(md|markdown|mdx)$/i, "") || "note";
    const preview = useMemo(() => renderThemedHtml(markdown, theme, title), [markdown, theme, title]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose(null);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    async function download() {
        setBusy(true);
        setError(null);
        try {
            if (kind === "pdf") {
                const bytes = exportPdf(markdown, theme, title);
                const copy = new Uint8Array(bytes.byteLength);
                copy.set(bytes);
                downloadBlob(new Blob([copy.buffer], { type: "application/pdf" }), `${title}.pdf`);
            } else {
                const blob = await exportDocx(markdown, theme, title);
                downloadBlob(blob, `${title}.docx`);
            }
            onClose(theme.id);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="publish-modal" role="presentation" onMouseDown={() => onClose(null)}>
            <div
                className="publish-dialog export-dialog"
                role="dialog"
                aria-modal="true"
                aria-label={kind === "pdf" ? "Export PDF" : "Export Word"}
                onMouseDown={(event) => event.stopPropagation()}
            >
                <h2>{kind === "pdf" ? "Export PDF" : "Export Word"}</h2>
                <label>
                    Theme
                    <select aria-label="Export theme" value={theme.id} onChange={(event) => setId(event.target.value)}>
                        {listThemes(themes.filter((item) => !item.builtin)).map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.name}
                            </option>
                        ))}
                    </select>
                </label>
                <iframe className="export-preview" title="Export preview" sandbox="allow-scripts" srcDoc={preview} />
                {error ? <p role="alert">{error}</p> : null}
                <div className="publish-actions">
                    <button type="button" className="btn btn-secondary" onClick={() => onClose(null)}>
                        Cancel
                    </button>
                    <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void download()}>
                        {busy ? "Exporting…" : kind === "pdf" ? "Download PDF" : "Download Word"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export function ThemeSettingsDialog({
    themes,
    themeId,
    onClose,
    onSave,
}: {
    themes: readonly ExportTheme[];
    themeId: string;
    onClose: () => void;
    onSave: (next: { themes: ExportTheme[]; exportThemeId: string }) => void;
}) {
    const [custom, setCustom] = useState<ExportTheme[]>(() => themes.filter((theme) => !theme.builtin));
    const [selected, setSelected] = useState(themeId);
    const [defaultId, setDefaultId] = useState(themeId);
    const all = listThemes(custom);
    const current = all.find((theme) => theme.id === selected) ?? all[0]!;

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    useEffect(() => {
        if (!all.some((theme) => theme.id === selected)) setSelected(all[0]!.id);
    }, [all, selected]);

    function update(patch: Partial<ExportTheme>) {
        if (current.builtin) return;
        setCustom((prev) => prev.map((theme) => (theme.id === current.id ? { ...theme, ...patch } : theme)));
    }

    function addTheme() {
        const source = current;
        const name = `Copy of ${source.name}`;
        const id = slugThemeId(name, [...all.map((theme) => theme.id)]);
        const next: ExportTheme = { ...source, id, name, builtin: false };
        setCustom((prev) => [...prev, next]);
        setSelected(id);
    }

    function removeTheme() {
        if (current.builtin) return;
        setCustom((prev) => prev.filter((theme) => theme.id !== current.id));
        if (defaultId === current.id) setDefaultId("ice-snowstorm");
        setSelected("ice-snowstorm");
    }

    return (
        <div className="publish-modal" role="presentation" onMouseDown={onClose}>
            <div
                className="publish-dialog theme-dialog"
                role="dialog"
                aria-modal="true"
                aria-label="Theme settings"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <h2>Themes</h2>
                <p className="theme-hint">
                    Ice Snowstorm is navy and ice. Clay is Anthropic's ivory page and terracotta accent. New themes are saved with your settings.
                </p>
                <div className="theme-layout">
                    <ul className="theme-list" aria-label="Themes">
                        {all.map((theme) => (
                            <li key={theme.id}>
                                <button
                                    type="button"
                                    aria-pressed={theme.id === current.id}
                                    onClick={() => setSelected(theme.id)}
                                >
                                    <span className="theme-swatch" style={{ background: theme.page, borderColor: theme.accent }} />
                                    <span className="theme-swatch" style={{ background: theme.heading }} />
                                    {theme.name}
                                </button>
                            </li>
                        ))}
                    </ul>
                    <div className="theme-form">
                        <label>
                            Name
                            <input
                                aria-label="Theme name"
                                value={current.name}
                                disabled={current.builtin}
                                onChange={(event) => update({ name: event.target.value.slice(0, 40) })}
                            />
                        </label>
                        <ColorField label="Page" value={current.page} disabled={current.builtin} onChange={(page) => update({ page })} />
                        <ColorField label="Text" value={current.text} disabled={current.builtin} onChange={(text) => update({ text })} />
                        <ColorField label="Headings" value={current.heading} disabled={current.builtin} onChange={(heading) => update({ heading })} />
                        <ColorField label="Accent" value={current.accent} disabled={current.builtin} onChange={(accent) => update({ accent })} />
                        <label>
                            Body font
                            <select
                                aria-label="Body font"
                                value={current.font}
                                disabled={current.builtin}
                                onChange={(event) => update({ font: event.target.value as ThemeFont })}
                            >
                                {FONTS.map((font) => (
                                    <option key={font} value={font}>{font}</option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Heading font
                            <select
                                aria-label="Heading font"
                                value={current.headingFont}
                                disabled={current.builtin}
                                onChange={(event) => update({ headingFont: event.target.value as ThemeFont })}
                            >
                                {FONTS.map((font) => (
                                    <option key={font} value={font}>{font}</option>
                                ))}
                            </select>
                        </label>
                        <label className="theme-default">
                            <input
                                type="radio"
                                name="export-theme"
                                checked={defaultId === current.id}
                                onChange={() => setDefaultId(current.id)}
                            />
                            Use for export
                        </label>
                    </div>
                </div>
                <div className="publish-actions">
                    <button type="button" className="btn btn-secondary" onClick={addTheme}>
                        New theme
                    </button>
                    <button type="button" className="btn btn-secondary" disabled={current.builtin} onClick={removeTheme}>
                        Delete
                    </button>
                    <span className="theme-spacer" />
                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => onSave({ themes: custom, exportThemeId: defaultId || CLAY.id })}
                    >
                        Save themes
                    </button>
                </div>
            </div>
        </div>
    );
}

function ColorField({
    label,
    value,
    disabled,
    onChange,
}: {
    label: string;
    value: string;
    disabled: boolean;
    onChange: (value: string) => void;
}) {
    const parsed = parseHex(value);
    return (
        <label>
            {label}
            <span className="theme-color">
                <input
                    type="color"
                    aria-label={`${label} color`}
                    value={(parsed ?? "#000000").toLowerCase()}
                    disabled={disabled}
                    onChange={(event) => onChange(event.target.value.toUpperCase())}
                />
                <input
                    aria-label={`${label} hex`}
                    value={value}
                    disabled={disabled}
                    onChange={(event) => onChange(event.target.value)}
                />
            </span>
        </label>
    );
}
