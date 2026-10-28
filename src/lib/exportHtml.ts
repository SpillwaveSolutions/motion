/**
 * Themed HTML used by the export preview. PDF and Word use the same blocks,
 * so the preview is the page those files are built from.
 */
import { markdownToBlocks, type ExportBlock, type InlineRun } from "./exportBlocks";
import type { ExportTheme } from "./themes";

const FONT_STACK: Record<ExportTheme["font"], string> = {
    serif: "Georgia, 'Iowan Old Style', 'Palatino Linotype', Palatino, serif",
    sans: "system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif",
    mono: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
};

export function renderThemedHtml(markdown: string, theme: ExportTheme, title: string): string {
    const blocks = markdownToBlocks(markdown);
    const body = blocks.map((block) => renderBlock(block)).join("\n");
    const safeTitle = escapeHtml(title);
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${safeTitle}</title>
<style>
  html, body { margin: 0; padding: 0; background: ${theme.page}; color: ${theme.text}; }
  body { font-family: ${FONT_STACK[theme.font]}; font-size: 16px; line-height: 1.55; padding: 48px 56px; }
  h1, h2, h3, h4, h5, h6 { font-family: ${FONT_STACK[theme.headingFont]}; color: ${theme.heading}; font-weight: 560; line-height: 1.2; margin: 1.3em 0 0.4em; }
  h1 { font-size: 2rem; font-weight: 500; border-bottom: 2px solid ${theme.accent}; padding-bottom: 0.25em; }
  h2 { font-size: 1.4rem; }
  h3 { font-size: 1.15rem; }
  p { margin: 0.6em 0; }
  a { color: ${theme.accent}; }
  code { font-family: ${FONT_STACK.mono}; background: ${theme.codeBg}; color: ${theme.codeText}; padding: 0.1em 0.35em; border-radius: 4px; font-size: 0.9em; }
  pre { background: ${theme.codeBg}; color: ${theme.codeText}; padding: 12px 14px; border-radius: 8px; overflow: auto; }
  pre code { background: transparent; padding: 0; }
  blockquote { margin: 0.8em 0; padding: 0.2em 0 0.2em 1em; border-left: 3px solid ${theme.accent}; color: ${theme.muted}; }
  hr { border: 0; border-top: 1px solid ${theme.accent}; margin: 1.4em 0; }
  ul, ol { margin: 0.4em 0 0.4em 1.2em; padding: 0; }
  table { border-collapse: collapse; width: 100%; margin: 0.8em 0; }
  th, td { border: 1px solid ${theme.tableBorder}; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: ${theme.tableHeaderBg}; color: ${theme.tableHeaderText}; }
  td { background: ${theme.tableRowBg}; }
  tbody tr:nth-child(even) td { background: ${theme.tableRowAltBg}; }
  .muted { color: ${theme.muted}; }
</style>
</head>
<body>
${body || `<p class="muted">Nothing to export.</p>`}
</body>
</html>`;
}

function renderBlock(block: ExportBlock): string {
    if (block.type === "heading") {
        const tag = `h${block.level}`;
        return `<${tag}>${escapeHtml(block.text)}</${tag}>`;
    }
    if (block.type === "paragraph") return `<p>${renderRuns(block.runs)}</p>`;
    if (block.type === "list") {
        const tag = block.ordered ? "ol" : "ul";
        const items = block.items.map((item) => `<li>${renderRuns(item)}</li>`).join("");
        return `<${tag}>${items}</${tag}>`;
    }
    if (block.type === "quote") return `<blockquote>${escapeHtml(block.text)}</blockquote>`;
    if (block.type === "code") return `<pre><code>${escapeHtml(block.text)}</code></pre>`;
    if (block.type === "hr") return `<hr />`;
    const head = block.header.map((cell) => `<th>${escapeHtml(cell)}</th>`).join("");
    const rows = block.rows
        .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
        .join("");
    return `<table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;
}

function renderRuns(runs: InlineRun[]): string {
    return runs
        .map((run) => {
            let html = escapeHtml(run.text).replace(/\n/g, "<br />");
            if (run.code) html = `<code>${html}</code>`;
            if (run.bold) html = `<strong>${html}</strong>`;
            if (run.italic) html = `<em>${html}</em>`;
            if (run.href) html = `<a href="${escapeHtml(run.href)}">${html}</a>`;
            return html;
        })
        .join("");
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&" + "amp;")
        .replace(/</g, "&" + "lt;")
        .replace(/>/g, "&" + "gt;")
        .replace(/"/g, "&" + "quot;");
}
