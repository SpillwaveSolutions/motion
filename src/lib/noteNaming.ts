/**
 * Filename helpers for Save / Rename — macOS-style document naming.
 *
 * Default name comes from the first ATX heading (# Title). "New Note" → new-note.md.
 */

import { bodyMarkdown } from "./frontmatter";

const UNTITLED_RE = /^untitled(-\d.*)?\.md$/i;

/** First level-1 (or first any-level) ATX heading body, or null. Skips YAML front matter. */
export function extractTitleFromMarkdown(markdown: string): string | null {
    for (const line of bodyMarkdown(markdown).split(/\r?\n/)) {
        const m = /^(#{1,6})\s+(.+?)\s*$/.exec(line.trim());
        if (m) return m[2]!.trim();
    }
    return null;
}

/**
 * Turn a human title into a filesystem-safe basename (no extension).
 * "New Note" → "new-note", "Q3 Plan!!" → "q3-plan".
 */
export function slugifyTitle(title: string): string {
    const slug = title
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/['’]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80);
    return slug || "untitled";
}

/** Ensure a user-typed name ends with .md and has no path separators. */
export function normalizeFilename(input: string): string {
    let name = input.trim().replace(/[/\\]/g, "-");
    if (!name) name = "untitled";
    if (!name.toLowerCase().endsWith(".md")) name = `${name}.md`;
    // Collapse accidental double extension
    name = name.replace(/\.md\.md$/i, ".md");
    return name;
}

/** Suggested filename for a document body (includes .md). */
export function suggestedFilename(markdown: string, fallback = "untitled.md"): string {
    const title = extractTitleFromMarkdown(markdown);
    if (!title) return normalizeFilename(fallback);
    return normalizeFilename(slugifyTitle(title));
}

/** Paths we treat as auto-generated placeholders that should prompt on Save. */
export function isUntitledPath(path: string | null | undefined): boolean {
    if (!path) return true;
    const base = path.split(/[/\\]/).pop() ?? path;
    return UNTITLED_RE.test(base);
}

export function basenameOf(path: string): string {
    return path.split(/[/\\]/).pop() || path;
}

export function joinWorkspace(workspacePath: string, filename: string): string {
    const sep = workspacePath.includes("\\") ? "\\" : "/";
    const root = workspacePath.replace(/[/\\]$/, "");
    return `${root}${sep}${normalizeFilename(filename)}`;
}

/**
 * True when writing `targetPath` would clobber a different existing note.
 * Saving in place (same path) is not an overwrite conflict.
 */
export function wouldOverwrite(
    existingPaths: string[],
    targetPath: string,
    currentPath: string | null
): boolean {
    const targetBase = basenameOf(targetPath).toLowerCase();
    const currentBase = currentPath ? basenameOf(currentPath).toLowerCase() : null;
    if (currentBase && targetBase === currentBase) {
        // Same basename — treat as save-in-place even if path separators differ
        return false;
    }
    return existingPaths.some((p) => basenameOf(p).toLowerCase() === targetBase);
}
