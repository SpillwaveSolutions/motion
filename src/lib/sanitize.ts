import DOMPurify from "dompurify";

/**
 * Sanitize HTML produced from untrusted Markdown before feeding TipTap.
 */
export function sanitizeHtml(html: string): string {
    return DOMPurify.sanitize(html, {
        // TipTap / StarterKit use common block+inline tags; keep data-type for custom nodes.
        ADD_ATTR: ["data-type", "class", "style"],
        ALLOW_DATA_ATTR: true,
    });
}

/**
 * Sanitize Mermaid-rendered SVG before assigning to innerHTML.
 * Mermaid renders node labels as HTML (<div><span><p>label</p></span></div>
 * inside <foreignObject>), not plain SVG <text>. Getting that back through
 * DOMPurify needs three separate overrides, not just enabling profiles:
 *  - `html: true` profile: allowlists div/span/p and their attrs.
 *  - `ADD_TAGS: ["foreignobject"]`: the svg profile hard-excludes it (a
 *    known SVG-based XSS vector), so it's dropped even with svg: true.
 *  - `HTML_INTEGRATION_POINTS: { foreignobject: true }`: DOMPurify enforces
 *    HTML-in-SVG namespace rules independently of ALLOWED_TAGS -- without
 *    this, the div/span/p children are stripped as an invalid namespace
 *    switch even though foreignObject itself now survives.
 */
export function sanitizeSvg(svg: string): string {
    return DOMPurify.sanitize(svg, {
        USE_PROFILES: { svg: true, svgFilters: true, html: true },
        ADD_TAGS: ["foreignobject"],
        HTML_INTEGRATION_POINTS: { foreignobject: true },
    });
}

/**
 * Escape text for safe inclusion in an HTML text context.
 */
export function escapeHtmlText(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
