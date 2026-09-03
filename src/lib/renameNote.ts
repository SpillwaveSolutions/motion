/**
 * Turn what the user typed in the tree into a destination path in the same
 * folder. Browser-safe: no I/O.
 */

const MARKDOWN_EXT = /\.(md|markdown|mdown|mkd|mdx)$/i;

export function noteStem(basename: string): string {
    return basename.replace(MARKDOWN_EXT, "");
}

export function getBasename(path: string): string {
    return path.split(/[/\\]/).pop() || path;
}

/**
 * Same-folder destination for an inline rename.
 *
 * Returns null when the typed name is empty after stripping path separators
 * (commit should stay in rename rather than write a junk file).
 */
export function renameDestPath(currentPath: string, typedName: string): string | null {
    let name = typedName.trim().replace(/[/\\]+/g, "-").replace(/^\.+/, "");
    if (!name || /^-+$/.test(name)) return null;
    if (!MARKDOWN_EXT.test(name)) name = `${name}.md`;
    const last = Math.max(currentPath.lastIndexOf("/"), currentPath.lastIndexOf("\\"));
    if (last < 0) return name;
    return `${currentPath.slice(0, last + 1)}${name}`;
}

export function sameNotePath(a: string, b: string): boolean {
    const norm = (p: string) => p.replace(/\\/g, "/");
    return norm(a) === norm(b);
}
