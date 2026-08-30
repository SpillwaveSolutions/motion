/**
 * The XSS boundary, tested where it actually runs.
 *
 * sanitize.ts had zero tests despite being the boundary that stops a malicious
 * .md file executing script in the app. It could not be unit-tested: DOMPurify
 * needs a real DOM, and under happy-dom it reports `isSupported: true` while
 * silently producing wrong output (strips <h1>, keeps <script>). Asserting
 * against that would have written nonsense into the security contract.
 *
 * So it is tested here, in a real browser, through the real render path a
 * malicious document would take: file on disk -> readFile -> marked ->
 * sanitizeHtml -> setContent.
 */
import { test, expect, gotoApp } from "./fixtures";

/** Evaluate the app's own sanitizeHtml inside the page. */
async function renderMarkdown(page: import("@playwright/test").Page, markdown: string) {
    await page.getByRole("button", { name: "Open Folder" }).click();
    await page.getByRole("treeitem", { name: "scratch-sanitize.md" }).click();
    await expect(page.locator(".ProseMirror")).toBeVisible();

    await page.getByRole("button", { name: "Markdown" }).click();
    const source = page.getByRole("textbox", { name: "Markdown source" });
    await source.fill(markdown);
    await page.getByRole("button", { name: "WYSIWYG" }).click();
    return page.locator(".ProseMirror");
}

test("script tags in a document never execute or survive", async ({ page }) => {
    // Must be installed before navigation, or it never runs.
    await page.addInitScript(() => {
        (window as unknown as { __xss?: boolean }).__xss = false;
    });
    await gotoApp(page);

    const editor = await renderMarkdown(
        page,
        "# Title\n\n<script>window.__xss = true;</script>\n\nafter\n"
    );

    await expect(editor).toContainText("after");
    expect(await page.evaluate(() => (window as unknown as { __xss?: boolean }).__xss)).toBe(false);
    expect(await editor.innerHTML()).not.toContain("<script");
});

test("inline event handlers are stripped", async ({ page }) => {
    await gotoApp(page);
    const editor = await renderMarkdown(page, '# T\n\n<img src="x" onerror="window.__xss = true">\n');

    const html = await editor.innerHTML();
    expect(html).not.toContain("onerror");
    expect(await page.evaluate(() => (window as unknown as { __xss?: boolean }).__xss)).toBeFalsy();
});

test("legitimate markdown structure survives sanitization", async ({ page }) => {
    // The other failure mode: a sanitizer strict enough to break the app. This
    // is the shape of the bug that stripped foreignObject and left every Mermaid
    // diagram an empty box.
    await gotoApp(page);
    const editor = await renderMarkdown(
        page,
        "# Heading\n\n- one\n- two\n\n**bold** and `code`\n\n```js\nconst x = 1;\n```\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n"
    );

    await expect(editor.locator("h1")).toHaveText("Heading");
    await expect(editor.locator("li").first()).toBeVisible();
    await expect(editor.locator("strong")).toHaveText("bold");
    await expect(editor.locator("pre code")).toContainText("const x = 1");
    await expect(editor.getByRole("table")).toBeVisible();
    await expect(editor.getByRole("columnheader", { name: "A" })).toBeVisible();
    await expect(editor.getByRole("cell", { name: "1" })).toBeVisible();
});

test("Mermaid node labels render, so foreignObject survived sanitizeSvg", async ({ page }) => {
    // sanitizeSvg's svg-only profile once hard-excluded foreignObject, which is
    // exactly how Mermaid renders flowchart node labels -- diagrams came out as
    // empty shapes with no text. This asserts the label text is actually there.
    await gotoApp(page);
    const editor = await renderMarkdown(
        page,
        "```mermaid\ngraph TD\n  A[StartLabel] --> B[EndLabel]\n```\n"
    );

    const diagram = editor.locator(".mermaid-block").first();
    await expect(diagram).toBeVisible({ timeout: 15_000 });

    // The label text lives inside <foreignObject>; if sanitizeSvg strips that,
    // the diagram still renders but every node comes out an empty shape.
    await expect(diagram).toContainText("StartLabel", { timeout: 15_000 });
    await expect(diagram).toContainText("EndLabel");
    expect(await diagram.locator("foreignObject").count()).toBeGreaterThan(0);
});

test("an invalid Mermaid diagram reports inside its block, not into document.body", async ({ page, guard }) => {
    // B9: mermaid leaves its temporary render container -- and its "bomb" error
    // graphic -- attached to document.body when parsing fails. It escapes React's
    // tree entirely, survives unmount, and stacks up one per failed keystroke.
    guard.allow(/Mermaid render error/);
    guard.allow(/Syntax error|Parse error|UnknownDiagramError/);

    await gotoApp(page);
    const editor = await renderMarkdown(page, "```mermaid\nthis is not valid mermaid at all\n```\n");

    const block = editor.locator(".mermaid-block").first();
    await expect(block).toBeVisible({ timeout: 15_000 });

    // The failure is reported inside the block...
    await expect(block).toContainText(/error|invalid|failed/i, { timeout: 15_000 });

    // ...and nothing mermaid created is left loose in the body.
    const orphans = await page.evaluate(() =>
        Array.from(document.body.children).filter(
            (el) => el.id.startsWith("mermaid-") || el.id.startsWith("dmermaid-")
        ).length
    );
    expect(orphans).toBe(0);
});
