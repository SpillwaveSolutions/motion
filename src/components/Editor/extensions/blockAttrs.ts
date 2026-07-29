/**
 * Shared serializer/parser for the block extensions' `<pre><code>` bodies.
 *
 * This existed as three near-identical inline copies (Dataset, ImageGen,
 * DiagramGen). That duplication is how `content: null` in the welcome document
 * reached `mermaid.render()` as the 4-character string "null" -- truthy, so the
 * render guard let it through, and every cold load logged an
 * UnknownDiagramError. Fixing that in one copy would have left the other two.
 *
 * ## Why a block scalar (B7)
 *
 * The body is `key: value` lines, so any value containing a newline used to be
 * silently truncated at the first line -- a multi-line Mermaid diagram or a
 * formatted SQL query lost everything after line one, with an in-code comment
 * admitting it ("this basic parser might fail for complex content"). A value
 * with newlines is now written YAML-style:
 *
 *     prompt: a login flow
 *     content: |
 *       sequenceDiagram
 *         A->>B: hello
 *
 * Single-line values keep the plain `key: value` form, so existing documents
 * still parse unchanged.
 */

/** Serialized placeholders that mean "not set yet", not a literal value. */
const EMPTY_SENTINELS = new Set(["null", "undefined"]);

const INDENT = "  ";

export function parseBlockAttrs(text: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    const lines = text.split("\n");

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i] as string;
        const colon = line.indexOf(":");
        if (colon <= 0) continue;

        const key = line.slice(0, colon).trim();
        if (!key) continue;
        const value = line.slice(colon + 1).trim();

        // Block scalar: everything indented beneath this key belongs to it.
        if (value === "|") {
            const block: string[] = [];
            let j = i + 1;
            for (; j < lines.length; j++) {
                const next = lines[j] as string;
                if (next.trim() === "") {
                    block.push("");
                    continue;
                }
                if (!next.startsWith(INDENT)) break;
                block.push(next.slice(INDENT.length));
            }
            // Drop trailing blank lines picked up before the next key.
            while (block.length > 0 && block[block.length - 1] === "") block.pop();
            attrs[key] = block.join("\n");
            i = j - 1;
            continue;
        }

        attrs[key] = EMPTY_SENTINELS.has(value) ? "" : value;
    }

    return attrs;
}

/**
 * Inverse of parseBlockAttrs. Keys with no value are omitted rather than
 * written as `key: null` -- writing the sentinel is what produced the mermaid
 * bug in the first place.
 */
export function serializeBlockAttrs(fields: Record<string, unknown>): string {
    const out: string[] = [];
    for (const [key, raw] of Object.entries(fields)) {
        if (raw === undefined || raw === null || raw === "") continue;
        const value = String(raw);
        if (value.includes("\n")) {
            out.push(`${key}: |`);
            for (const line of value.split("\n")) out.push(INDENT + line);
        } else {
            out.push(`${key}: ${value}`);
        }
    }
    return out.join("\n");
}

/**
 * The parse rule that makes a block survive a save/reload cycle.
 *
 * Round trip: HTML -> turndown -> markdown -> marked -> sanitize -> setContent.
 * Turndown writes the fence language from the `<code>` element's `language-*`
 * class, and `marked` gives that class back on the way in -- but `data-type`
 * does not survive the markdown hop at all, because markdown has nowhere to put
 * it. A rule matching only `pre[data-type="x"]` therefore never fires on a
 * reloaded document, and the block silently degrades to a plain code block.
 *
 * Mermaid was the only extension that carried a `language-*` rule, which is
 * exactly why it was the only one that round-tripped.
 */
export function languageParseRule(
    language: string,
    transform?: (attrs: Record<string, string>) => Record<string, unknown> | false
) {
    return {
        tag: "pre",
        getAttrs: (node: HTMLElement | string) => {
            if (typeof node === "string") return false;
            const code = node.querySelector("code");
            if (!code?.classList.contains(`language-${language}`)) return false;
            const attrs = parseBlockAttrs(code.textContent || "");
            return transform ? transform(attrs) : attrs;
        },
    };
}
