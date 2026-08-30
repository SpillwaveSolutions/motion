/**
 * Resolve a Finder / `?open=` launch target onto a file in the workspace list.
 *
 * Pure: no storage, no window. The desktop half (file URL → parent workspace)
 * lives in fs_core.rs and is tested there; this is the frontend half so
 * Playwright can drive the same journey with `?open=welcome.md`.
 */

/** Read `?open=` from a query string (`?open=nested/deeper.md` or the raw value). */
export function parseOpenQuery(search: string): string | null {
    const raw = search.startsWith("?") ? search.slice(1) : search;
    const value = new URLSearchParams(raw).get("open");
    if (!value || !value.trim()) return null;
    try {
        return decodeURIComponent(value.trim());
    } catch {
        return value.trim();
    }
}

function norm(p: string): string {
    return p.replace(/\\/g, "/");
}

/**
 * Pick the workspace-absolute path that `open` refers to.
 *
 * Accepts a basename (`welcome.md`), a workspace-relative path
 * (`nested/deeper.md`), or an absolute path already in `files`.
 */
export function resolveOpenQuery(
    open: string,
    files: string[],
    workspaceRoot: string,
): string | null {
    const want = norm(open).replace(/^\/+/, "");
    const root = norm(workspaceRoot).replace(/[/]+$/, "");
    const wantAbs = norm(open).startsWith("/") || /^[A-Za-z]:/.test(open)
        ? norm(open)
        : `${root}/${want}`;

    const exact = files.find((f) => {
        const n = norm(f);
        return n === wantAbs || n === norm(open);
    });
    if (exact) return exact;

    const bySuffix = files.find((f) => {
        const n = norm(f);
        return n.endsWith(`/${want}`) || n === want;
    });
    if (bySuffix) return bySuffix;

    const base = want.split("/").pop();
    if (!base) return null;
    return files.find((f) => norm(f).split("/").pop() === base) ?? null;
}
