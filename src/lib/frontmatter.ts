/**
 * YAML front matter: an optional block at the very start of a note.
 *
 *   ---
 *   key: value
 *   ---
 *
 *   # Body starts here
 *
 * The WYSIWYG editor and the exporters see the body only. Save and the
 * Markdown view keep the whole document.
 */

export interface SplitFrontmatter {
    /** The YAML between the fences, or null when the note has none. */
    frontmatter: string | null;
    /** The markdown after the closing fence. */
    body: string;
}

// `---` on the first line, closed by `---` or `...`. A rule with no closing
// fence is not front matter.
const FRONT_MATTER = /^﻿?---[ \t]*\r?\n(?:([\s\S]*?)\r?\n)?(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/;

export function splitFrontmatter(markdown: string): SplitFrontmatter {
    const match = FRONT_MATTER.exec(markdown);
    if (!match) return { frontmatter: null, body: markdown };
    return {
        frontmatter: match[1] ?? "",
        body: markdown.slice(match[0].length).replace(/^(?:[ \t]*\r?\n)+/, ""),
    };
}

/** Put the front matter back on top of the body. `null` returns the body as is. */
export function joinFrontmatter(frontmatter: string | null, body: string): string {
    if (frontmatter === null) return body;
    const yaml = frontmatter.replace(/\r\n/g, "\n").replace(/\n+$/, "");
    const block = yaml ? `---\n${yaml}\n---\n` : "---\n---\n";
    const rest = body.replace(/^\n+/, "");
    return rest ? `${block}\n${rest}` : block;
}
