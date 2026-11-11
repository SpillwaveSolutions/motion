/**
 * HTML ↔ markdown for the editor document.
 *
 * The round trip is:
 *
 *   editor HTML -> turndown (this module) -> markdown
 *   markdown -> marked (this module) -> sanitize -> parseHTML
 *
 * Custom blocks survive because the fenced-code rule reads the `language-*`
 * class off <code>. GFM tables survive because we serialize <table> to pipes
 * (marked already parses pipes back to <table>).
 */
import { marked } from "marked";
import TurndownService from "turndown";
import { joinFrontmatter } from "../../lib/frontmatter";

function cellText(cell: Element, td: TurndownService): string {
    const html = "innerHTML" in cell ? String((cell as HTMLElement).innerHTML) : "";
    const md = td
        .turndown(html)
        .replace(/\u00a0/g, " ")
        .replace(/\s*\n\s*/g, " ")
        .trim();
    return md.replace(/\|/g, "\\|");
}

function padRow(cells: string[], width: number): string[] {
    const row = cells.slice();
    while (row.length < width) row.push("");
    return row;
}

/** Serialize a DOM <table> to a GFM pipe table. Exported for unit tests. */
export function tableToMarkdown(table: Element, td: TurndownService): string {
    const rows = Array.from(table.querySelectorAll("tr"));
    const grid = rows.map((row) =>
        Array.from(row.querySelectorAll("th, td")).map((cell) => cellText(cell, td))
    );
    const colCount = grid.reduce((max, r) => Math.max(max, r.length), 0);
    if (colCount === 0) return "";

    const padded = grid.map((r) => padRow(r, colCount));
    const line = (cells: string[]) => `| ${cells.join(" | ")} |`;
    const header = padded[0] ?? padRow([], colCount);
    const sep = header.map(() => "---");
    const body = padded.slice(1);
    return [line(header), line(sep), ...body.map(line)].join("\n");
}

export function createTurndown(): TurndownService {
    const td = new TurndownService({
        headingStyle: "atx",
        codeBlockStyle: "fenced",
    });

    // CommonMark never reads an underscore between two letters or digits as
    // emphasis, so `awaiting_approval` needs no escape. Turndown escapes `1. `
    // at the start of a line but not `1) `, which CommonMark also reads as a list.
    const escape = td.escape.bind(td);
    td.escape = (text: string) =>
        escape(text)
            .replace(/(?<=[\p{L}\p{N}])\\_(?=[\p{L}\p{N}])/gu, "_")
            .replace(/^(\d+)\) /gm, "$1\\) ");

    td.addRule("fencedCodeBlock", {
        filter: ["pre"],
        replacement: function (content, node) {
            const code = (node as HTMLElement).querySelector("code");
            const className = code ? code.getAttribute("class") || "" : "";
            const language = className.replace("language-", "");
            // marked keeps the code's final newline. Drop it, or each save adds a blank line.
            return "\n\n```" + language + "\n" + content.replace(/\n$/, "") + "\n```\n\n";
        },
    });

    // The editor's image node writes its link to data-src (NoteImageExtension).
    td.addRule("image", {
        filter: "img",
        replacement: function (_content, node) {
            const el = node as HTMLElement;
            const src = el.getAttribute("src") || el.getAttribute("data-src") || "";
            if (!src) return "";
            const clean = (v: string | null) => (v ?? "").replace(/(\n+\s*)+/g, "\n");
            const title = clean(el.getAttribute("title"));
            return `![${clean(el.getAttribute("alt"))}](${src}${title ? ` "${title}"` : ""})`;
        },
    });

    // Keep the markdown that people write: `- item` and `1. item`, with no blank
    // line between items. Turndown's default writes `*   item`, and TipTap wraps
    // each item in <p>, which adds a whitespace-only line after every item.
    td.addRule("listParagraph", {
        filter: (node) => {
            const li = node.parentNode as HTMLElement | null;
            return (
                node.nodeName === "P" &&
                li?.nodeName === "LI" &&
                Array.from(li.children).filter((c) => c.nodeName === "P").length === 1
            );
        },
        replacement: (content) => `\n${content}\n`,
    });

    td.addRule("listItem", {
        filter: "li",
        replacement: function (content, node) {
            const parent = node.parentNode as HTMLElement;
            const start = Number.parseInt(parent.getAttribute("start") ?? "", 10);
            const prefix =
                parent.nodeName === "OL"
                    ? `${(Number.isNaN(start) ? 1 : start) + Array.prototype.indexOf.call(parent.children, node)}. `
                    : "- ";
            const indent = " ".repeat(prefix.length);
            const body = content
                .replace(/^\n+/, "")
                .replace(/\s+$/, "")
                .split("\n")
                .map((line, i) => (i === 0 || !line ? line : indent + line))
                .join("\n");
            return prefix + body + (node.nextSibling ? "\n" : "");
        },
    });

    // Turndown escapes `1. ` and `- ` at the start of any text, so the line does
    // not turn into a list. An ATX heading cannot become a list, so drop that escape.
    td.addRule("heading", {
        filter: ["h1", "h2", "h3", "h4", "h5", "h6"],
        replacement: function (content, node) {
            const text = content.replace(/^(\d+)\\([.)]) /, "$1$2 ").replace(/^\\([-+]) /, "$1 ");
            return `\n\n${"#".repeat(Number(node.nodeName.charAt(1)))} ${text}\n\n`;
        },
    });

    td.addRule("table", {
        filter: "table",
        replacement: function (_content, node) {
            const md = tableToMarkdown(node as HTMLElement, td);
            return md ? `\n\n${md}\n\n` : "";
        },
    });

    return td;
}

const turndown = createTurndown();

export function htmlToMarkdown(html: string): string {
    return turndown.turndown(html);
}

/** The note as saved: front matter, then the body, then one final newline. */
export function noteMarkdown(frontmatter: string | null, html: string): string {
    const body = htmlToMarkdown(html);
    return joinFrontmatter(frontmatter, body ? `${body}\n` : "");
}

export async function markdownToHtml(md: string): Promise<string> {
    const html = await marked.parse(md);
    return typeof html === "string" ? html : String(html);
}
