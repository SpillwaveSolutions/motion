/**
 * Does the editor buffer differ from what was last written?
 *
 * Derived, never assigned. There is no `setDirty` for a future mutation site to
 * forget, which is the usual way this class of feature rots: someone adds a new
 * way to change the document and the flag quietly stops being true.
 *
 * `saved === null` means no document of the user's is loaded (the welcome
 * placeholder), so there is nothing to lose and nothing to warn about. A new
 * unsaved note is NOT that case: it snapshots its template as `saved`, so
 * typing into it counts as dirty like any other buffer.
 */
export function isDirty(current: string, saved: string | null): boolean {
    return saved !== null && current !== saved;
}
