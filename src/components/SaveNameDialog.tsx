import { useEffect, useId, useRef, useState } from "react";
import { normalizeFilename } from "../lib/noteNaming";

export interface SaveNameDialogProps {
    /** Dialog title shown to the user. */
    title: string;
    /** Initial filename suggestion (with or without .md). */
    initialName: string;
    confirmLabel?: string;
    onCancel: () => void;
    onConfirm: (filename: string) => void;
}

/**
 * macOS-style Save / Rename panel: edit the name, confirm or cancel.
 */
export function SaveNameDialog({
    title,
    initialName,
    confirmLabel = "Save",
    onCancel,
    onConfirm,
}: SaveNameDialogProps) {
    const inputId = useId();
    const [name, setName] = useState(initialName);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setName(initialName);
        // Select basename without extension for quick overwrite typing
        const el = inputRef.current;
        if (!el) return;
        el.focus();
        const base = initialName.replace(/\.md$/i, "");
        el.setSelectionRange(0, base.length);
    }, [initialName]);

    const submit = () => {
        const normalized = normalizeFilename(name);
        if (!normalized || normalized === ".md") return;
        onConfirm(normalized);
    };

    return (
        <div
            className="save-name-dialog-backdrop"
            role="presentation"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onCancel();
            }}
        >
            <div
                className="save-name-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby={`${inputId}-title`}
            >
                <h2 id={`${inputId}-title`} className="save-name-dialog-title">
                    {title}
                </h2>
                <p className="save-name-dialog-hint">
                    Name this note. The default comes from the document title.
                </p>
                <label className="save-name-dialog-label" htmlFor={inputId}>
                    File name
                </label>
                <input
                    ref={inputRef}
                    id={inputId}
                    className="save-name-dialog-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            submit();
                        }
                        if (e.key === "Escape") {
                            e.preventDefault();
                            onCancel();
                        }
                    }}
                    autoComplete="off"
                    spellCheck={false}
                />
                <div className="save-name-dialog-actions">
                    <button type="button" className="btn btn-secondary" onClick={onCancel}>
                        Cancel
                    </button>
                    <button type="button" className="btn btn-primary" onClick={submit}>
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
