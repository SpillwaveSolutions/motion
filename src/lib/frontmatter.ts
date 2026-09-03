/**
 * YAML front matter helpers for Motion notes.
 *
 * Convention: optional block at the start of the file:
 *
 *   ---
 *   key: value
 *   ---
 *
 *   # Body starts here
 *
 * WYSIWYG edits the body only; Markdown view and disk keep the full document.
 */

export interface SplitFrontmatter {
    /** Inner YAML only (no fence lines), or null if none. */
    frontmatter: string | null;
    /** Markdown after the closing fence (may be empty). */
    body: string;
}

/**
 * Split a full document into front matter + body.
 * Only recognizes front matter when the file starts with `---` on line 1.
 * A lone horizontal rule without a closing fence is not treated as front matter.
 */
export function splitFrontmatter(markdown: string): SplitFrontmatter {
    const text = markdown.replace(/^\uFEFF/, "");
    // Opening fence must be the first line (optional trailing spaces).
    const match = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(text);
    if (!match) {
        return { frontmatter: null, body: markdown };
    }
    // Drop blank lines that usually sit between the closing fence and the body.
    const body = text.slice(match[0].length).replace(/^(?:\r?\n)*/, "");
    return {
        frontmatter: match[1] ?? "",
        body,
    };
}

/**
 * Reassemble a full document. `frontmatter === null` → body only.
 * Empty string frontmatter still emits the fence block (rare but intentional).
 */
export function joinFrontmatter(frontmatter: string | null, body: string): string {
    if (frontmatter === null) return body;
    const bodyPart = body.replace(/^\r?\n*/, "");
    // Normalize to LF inside the block; preserve user's YAML content as-is.
    const fm = frontmatter.replace(/\r\n/g, "\n").replace(/\n$/, "");
    if (bodyPart.length === 0) {
        return `---\n${fm}\n---\n`;
    }
    return `---\n${fm}\n---\n\n${bodyPart}`;
}

/** Body only — what marked/TipTap should render. */
export function bodyMarkdown(markdown: string): string {
    return splitFrontmatter(markdown).body;
}
