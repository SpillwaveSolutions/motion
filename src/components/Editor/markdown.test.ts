import { describe, expect, test } from "bun:test";
import { htmlToMarkdown, markdownToHtml, noteMarkdown } from "./markdown";

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

describe("image round trip", () => {
    test("an image link survives markdown -> HTML -> markdown unchanged", async () => {
        const md = "Intro.\n\n![C4 context](images/01_C4_L1_System_context.png)\n\n![Spaced](my%20pics/a%20b.png \"Title\")";
        const html = await markdownToHtml(md);
        expect(html).toContain('<img src="images/01_C4_L1_System_context.png" alt="C4 context">');
        expect(htmlToMarkdown(html)).toBe(md);
    });

    test("the editor's image HTML, with the link in data-src, serializes to a markdown image", () => {
        expect(htmlToMarkdown('<p><img data-src="images/pic.png" alt="A pic"></p>')).toBe("![A pic](images/pic.png)");
        expect(htmlToMarkdown('<p><img data-src="a.png" alt="" title="T"></p>')).toBe('![](a.png "T")');
        expect(htmlToMarkdown('<p><img alt="no link"></p>')).toBe("");
    });
});

describe("lists and headings keep their markdown form", () => {
    // TipTap wraps every list item's text in <p>. marked does not, for a tight list.
    const tiptap = (md: string) =>
        markdownToHtml(md).then((h) => h.replace(/<li>([^<\n]+)/g, "<li><p>$1</p>").replace(/\n/g, ""));

    const SAME = {
        "a bullet list": "- one\n- two\n- three",
        "a nested bullet list": "- one\n- two\n  - nested\n  - nested two\n- three",
        "a numbered list": "1. first\n2. second",
        "a numbered list that starts at 3": "3. c\n4. d",
        "a bullet list inside a numbered list": "1. step\n   - detail\n2. next",
        "a numbered heading": "## 1. Where the bug is",
        "a heading that starts with a dash": "### - not a list",
        "an item with two paragraphs": "- p1\n\n  p2\n- next",
    };

    for (const [name, md] of Object.entries(SAME)) {
        test(`${name} round trips unchanged from marked HTML`, async () => {
            expect(htmlToMarkdown(await markdownToHtml(md))).toBe(md);
        });
        test(`${name} round trips unchanged from the editor's HTML`, async () => {
            expect(htmlToMarkdown(await tiptap(md))).toBe(md);
        });
    }

    test("a paragraph that starts with a number keeps its escape, so it does not become a list", async () => {
        const md = "1\\. not a list";
        const html = await markdownToHtml(md);
        expect(html).toBe("<p>1. not a list</p>\n");
        expect(htmlToMarkdown(html)).toBe(md);
    });

    test("an item with two paragraphs keeps both paragraphs in the item", async () => {
        const md = htmlToMarkdown("<ul><li><p>p1</p><p>p2</p></li><li><p>next</p></li></ul>");
        const html = await markdownToHtml(md);
        expect(html).toMatch(/<li>\s*<p>p1<\/p>\s*<p>p2<\/p>\s*<\/li>/);
        expect(html.match(/<li>/g)?.length).toBe(2);
    });

    test("an underscore inside a word is not escaped, and emphasis still round trips", async () => {
        const md = "awaiting_approval, rolled_back, and _real emphasis_ in \\_literal\\_ marks";
        expect(htmlToMarkdown(await markdownToHtml(md))).toBe(md);
        expect(htmlToMarkdown("<p>snake_case_name</p>")).toBe("snake_case_name");
    });

    test("a fenced code block gets no blank line before the closing fence", async () => {
        for (const md of ["```js\nx = 1\n```", "text\n\n```\na\n\nb\n```\n\nafter", "- item\n\n  ```\n  code\n  ```"]) {
            expect(htmlToMarkdown(await markdownToHtml(md))).toBe(md);
        }
    });

    test("a paragraph that starts with 1) keeps its escape, and a heading does not need one", async () => {
        for (const md of ["1\\) not a list", "## 1) Paren heading"]) {
            const html = await markdownToHtml(md);
            expect(html).not.toContain("<ol");
            expect(htmlToMarkdown(html)).toBe(md);
        }
    });

    test("a missing or bad start attribute numbers the list from 1", () => {
        expect(htmlToMarkdown('<ol start=""><li><p>a</p></li></ol>')).toBe("1. a");
        expect(htmlToMarkdown('<ol start="x"><li><p>a</p></li></ol>')).toBe("1. a");
        expect(htmlToMarkdown('<ol start="0"><li><p>a</p></li></ol>')).toBe("0. a");
    });

    test("no line ends with spaces", () => {
        const md = htmlToMarkdown("<ul><li><p>a</p><ul><li><p>b</p><p>c</p></li></ul></li></ul><ol><li><p>x</p></li></ol>");
        expect(md).not.toMatch(/ +$/m);
    });
});

describe("noteMarkdown", () => {
    test("the saved note ends with one newline", () => {
        expect(noteMarkdown(null, "<h1>T</h1><p>Body.</p>")).toBe("# T\n\nBody.\n");
        expect(noteMarkdown("title: x", "<p>Body.</p>")).toBe("---\ntitle: x\n---\n\nBody.\n");
    });

    test("an empty note stays empty", () => {
        expect(noteMarkdown(null, "<p></p>")).toBe("");
    });
});
