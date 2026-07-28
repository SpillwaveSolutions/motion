/**
 * Shared `key: value` parser for the block extensions' serialized <pre> bodies.
 *
 * This existed as three near-identical inline copies (Dataset, ImageGen,
 * DiagramGen). That duplication is how `content: null` in the welcome document
 * reached `mermaid.render()` as the 4-character string "null" -- truthy, so the
 * render guard let it through, and every cold load logged an
 * UnknownDiagramError. Fixing that in one copy would have left the other two.
 */

/** Serialized placeholders that mean "not set yet", not a literal value. */
const EMPTY_SENTINELS = new Set(["null", "undefined"]);

export function parseBlockAttrs(text: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    for (const line of text.split("\n")) {
        const [rawKey, ...rest] = line.split(":");
        if (rawKey === undefined || rest.length === 0) continue;
        const key = rawKey.trim();
        if (!key) continue;
        const value = rest.join(":").trim();
        attrs[key] = EMPTY_SENTINELS.has(value) ? "" : value;
    }
    return attrs;
}
