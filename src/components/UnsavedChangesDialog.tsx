import { useEffect, useId, useRef } from "react";

export interface UnsavedChangesDialogProps {
    /** Name of the note holding unsaved edits. */
    currentName: string;
    /** Name of the note the user is trying to open. */
    incomingName: string;
    onSave: () => void;
    onDiscard: () => void;
    onCancel: () => void;
}

/**
 * Guards a sidebar file switch when the open note has unsaved edits.
 *
 * A real component rather than window.confirm() for two reasons. confirm()
 * offers two outcomes, so the user would have to cancel, press Cmd+S, and
 * re-click the note they wanted -- and its chrome lives outside the DOM, so a
 * Playwright spec written against roles and accessible names (which is the only
 * kind this repo accepts) cannot address it at all.
 *
 * Reuses the SaveNameDialog styling so both sheets look like one app.
 */
export function UnsavedChangesDialog({
    currentName,
    incomingName,
    onSave,
    onDiscard,
    onCancel,
}: UnsavedChangesDialogProps) {
    const id = useId();
    const saveRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        saveRef.current?.focus();
    }, []);

    // Escape means Cancel: the least destructive outcome, and the one a user
    // reaching for Escape expects. Captured on the window so it works wherever
    // focus happens to sit when the dialog opens.
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                onCancel();
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [onCancel]);

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
                aria-labelledby={`${id}-title`}
            >
                <h2 id={`${id}-title`} className="save-name-dialog-title">
                    Unsaved Changes
                </h2>
                <p className="save-name-dialog-hint">
                    “{currentName}” has unsaved changes. Save before opening “
                    {incomingName}”?
                </p>
                <div className="save-name-dialog-actions">
                    <button type="button" className="btn btn-secondary" onClick={onDiscard}>
                        Discard
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={onCancel}>
                        Cancel
                    </button>
                    <button
                        ref={saveRef}
                        type="button"
                        className="btn btn-primary"
                        onClick={onSave}
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}
