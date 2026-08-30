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

    td.addRule("fencedCodeBlock", {
        filter: ["pre"],
        replacement: function (content, node) {
            const code = (node as HTMLElement).querySelector("code");
            const className = code ? code.getAttribute("class") || "" : "";
            const language = className.replace("language-", "");
            return "\n\n```" + language + "\n" + content + "\n```\n\n";
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

export async function markdownToHtml(md: string): Promise<string> {
    const html = await marked.parse(md);
    return typeof html === "string" ? html : String(html);
}
