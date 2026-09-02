/**
 * Dirty tracking around Tiptap's serializer.
 *
 * Opening a note is clean (`setContent` uses emitUpdate:false), but switching
 * WYSIWYG ↔ Markdown and node-view hydration re-serialize the document. Where
 * that output differs from the bytes on disk only in formatting (table pipe
 * padding, trailing newline), treating it as an edit makes autosave rewrite
 * the user's file just for looking at it in another view.
 *
 * While hydrating, every serialized update is adopted as the clean baseline.
 * After hydration, dirty is a straight string compare against that baseline.
 */

export type DirtyBaseline = {
    snapshot: string;
    hydrating: boolean;
};

export function beginHydration(snapshot = ""): DirtyBaseline {
    return { snapshot, hydrating: true };
}

export function applySerializedMarkdown(
    baseline: DirtyBaseline,
    serialized: string
): { snapshot: string; hydrating: boolean; dirty: boolean } {
    if (baseline.hydrating) {
        return { snapshot: serialized, hydrating: true, dirty: false };
    }
    return {
        snapshot: baseline.snapshot,
        hydrating: false,
        dirty: serialized !== baseline.snapshot,
    };
}

export function endHydration(snapshot: string): DirtyBaseline {
    return { snapshot, hydrating: false };
}

export function isDirtyMarkdown(current: string, snapshot: string): boolean {
    return current !== snapshot;
}
