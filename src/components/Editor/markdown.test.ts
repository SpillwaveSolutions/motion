import { describe, expect, test } from "bun:test";
import { htmlToMarkdown, markdownToHtml } from "./markdown";

const PIPE = [
    "| Name | Role |",
    "| --- | --- |",
    "| Ada | Engineer |",
    "| Grace | Architect |",
].join("\n");

const TABLE_HTML = [
    "<table>",
    "<thead><tr><th>Name</th><th>Role</th></tr></thead>",
    "<tbody>",
    "<tr><td>Ada</td><td>Engineer</td></tr>",
    "<tr><td>Grace</td><td>Architect</td></tr>",
    "</tbody>",
    "</table>",
].join("");

describe("GFM table round trip", () => {
    test("htmlToMarkdown serializes a table to pipes", () => {
        const md = htmlToMarkdown(TABLE_HTML);
        expect(md).toContain("| Name | Role |");
        expect(md).toMatch(/\| ---+ \| ---+ \|/);
        expect(md).toContain("| Ada | Engineer |");
        expect(md).toContain("| Grace | Architect |");
        expect(md).not.toContain("<table");
    });

    test("markdownToHtml parses pipes back into a table", async () => {
        const html = await markdownToHtml(PIPE);
        expect(html).toContain("<table");
        expect(html).toContain("<th>Name</th>");
        expect(html).toContain("<td>Ada</td>");
        expect(html).toContain("Architect");
    });

    test("HTML → markdown → HTML keeps a table", async () => {
        const md = htmlToMarkdown(TABLE_HTML);
        const html = await markdownToHtml(md);
        expect(html).toContain("<table");
        expect(html).toContain("Ada");
        expect(html).toContain("Architect");
    });

    test("pipes inside a cell are escaped so the column count holds", () => {
        const html = "<table><tr><th>A</th></tr><tr><td>x|y</td></tr></table>";
        const md = htmlToMarkdown(html);
        expect(md).toContain("x\\|y");
    });

    test("a Tiptap-shaped table (td wrapping a paragraph) still serializes", () => {
        const html =
            "<table><tbody>" +
            "<tr><th><p>Name</p></th><th><p>Role</p></th></tr>" +
            "<tr><td><p>Ada</p></td><td><p>Engineer</p></td></tr>" +
            "</tbody></table>";
        const md = htmlToMarkdown(html);
        expect(md).toContain("| Name | Role |");
        expect(md).toContain("| Ada | Engineer |");
    });

    test("custom block fences still take their language from the code class", () => {
        const html = '<pre><code class="language-mermaid">graph TD\n  A --> B</code></pre>';
        const md = htmlToMarkdown(html);
        expect(md).toContain("```mermaid");
        expect(md).toContain("graph TD");
    });
});
