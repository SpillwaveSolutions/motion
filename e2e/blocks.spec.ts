/**
 * B4/B7 end to end: the five block types must survive a real save/reload.
 *
 * The unit test (src/components/Editor/roundtrip.test.ts) pins the
 * serialization contract. This drives the actual editor: real turndown, real
 * marked, real DOMPurify, real parseHTML, real filesystem. Before Phase 1 this
 * spec could not have existed, because saving did not write anything.
 */
import { test, expect, gotoApp } from "./fixtures";

const BLOCK_SELECTORS: Record<string, string> = {
    mermaid: '[data-type="mermaid"], .mermaid-preview',
    dataset: '[data-type="dataset"], .dataset-block',
    query: '[data-type="query"], .query-block',
};

async function openWorkspace(page: import("@playwright/test").Page) {
    await page.getByRole("button", { name: "Open Folder" }).click();
    await expect(page.getByRole("option", { name: "welcome.md" })).toBeVisible();
}

test("the welcome document renders its blocks as blocks, not code", async ({ page }) => {
    await gotoApp(page);
    // The welcome doc is shown before any file is opened.
    const editor = page.locator(".ProseMirror");
    await expect(editor).toBeVisible();

    // Each custom block should have produced a node view, not a bare <pre>.
    for (const [name, selector] of Object.entries(BLOCK_SELECTORS)) {
        await expect(
            editor.locator(selector).first(),
            `${name} block should render as a node view`
        ).toBeVisible({ timeout: 15_000 });
    }
});

test("a document with blocks survives save and reload with content intact", async ({ page }) => {
    await gotoApp(page);
    await openWorkspace(page);

    // Write a document containing every block type through the markdown pane,
    // which is the same path a file on disk takes.
    await page.getByRole("option", { name: "welcome.md" }).click();
    await expect(page.locator(".ProseMirror")).toBeVisible();

    await page.getByRole("button", { name: "Markdown" }).click();
    const source = page.getByRole("textbox", { name: "Markdown source" });
    await expect(source).toBeVisible();

    const doc = [
        "# Round trip",
        "",
        "```mermaid",
        "graph TD",
        "  A[Start] --> B[Done]",
        "```",
        "",
        "```dataset",
        "source: sample-data.csv",
        "name: sales",
        "limit: 5",
        "```",
        "",
        "```query",
        "sql: |",
        "  SELECT name, score",
        "  FROM sales",
        "  ORDER BY score DESC",
        "```",
        "",
        "```diagram-gen",
        "prompt: a login flow",
        "content: |",
        "  sequenceDiagram",
        "    A->>B: hello",
        "    B-->>A: hi",
        "```",
        "",
    ].join("\n");

    await source.fill(doc);

    // Back to WYSIWYG: markdown -> HTML -> parseHTML. If the language-* rules
    // are missing, the blocks arrive as plain code here.
    await page.getByRole("button", { name: "WYSIWYG" }).click();
    const editor = page.locator(".ProseMirror");
    await expect(editor.locator('[data-type="mermaid"], .mermaid-preview').first()).toBeVisible();
    await expect(editor.locator('[data-type="dataset"], .dataset-block').first()).toBeVisible();
    await expect(editor.locator('[data-type="query"], .query-block').first()).toBeVisible();

    const write = page.waitForResponse((r) => r.url().includes("/api/fs/write"));
    await page.getByRole("button", { name: /^Save/ }).click();
    expect((await write).status()).toBe(200);

    // Reload from disk -- the full cycle.
    await gotoApp(page);
    await openWorkspace(page);
    await page.getByRole("option", { name: "welcome.md" }).click();

    const reloaded = page.locator(".ProseMirror");
    await expect(reloaded.locator('[data-type="mermaid"], .mermaid-preview').first()).toBeVisible({
        timeout: 15_000,
    });
    await expect(reloaded.locator('[data-type="dataset"], .dataset-block').first()).toBeVisible();
    await expect(reloaded.locator('[data-type="query"], .query-block').first()).toBeVisible();

    // B7: the multi-line SQL must not have been truncated at line one.
    await page.getByRole("button", { name: "Markdown" }).click();
    const reloadedSource = page.getByRole("textbox", { name: "Markdown source" });
    await expect(reloadedSource).toContainText("ORDER BY score DESC");
    await expect(reloadedSource).toContainText("B-->>A: hi");
});
