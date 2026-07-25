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
 */
export function sanitizeSvg(svg: string): string {
    return DOMPurify.sanitize(svg, {
        USE_PROFILES: { svg: true, svgFilters: true },
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
