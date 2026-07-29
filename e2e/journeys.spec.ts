/**
 * Phase 2: the journeys that have actually broken before.
 *
 * Each spec locks a specific past regression rather than testing a feature in
 * the abstract — the commit that broke it is named in the comment.
 */
import { test, expect, gotoApp } from "./fixtures";

async function openScratch(page: import("@playwright/test").Page, name: string) {
    await page.getByRole("button", { name: "Open Folder" }).click();
    const note = page.getByRole("option", { name });
    await expect(note).toBeVisible();
    await note.click();
    await expect(page.locator(".ProseMirror")).toBeVisible();
}

test("a view-mode round trip loses nothing", async ({ page }) => {
    // Locks fb3a3cb: rawMarkdown and the Tiptap document were independent, so
    // switching view mode silently dropped edits and Split's right pane was a
    // stale static render.
    const marker = `viewmode-${Date.now()}`;
    await gotoApp(page);
    await openScratch(page, "scratch-journeys.md");

    const editor = page.locator(".ProseMirror");
    await editor.click();
    await page.keyboard.press("End");
    await page.keyboard.type(` ${marker}`);

    await page.getByRole("button", { name: "Markdown" }).click();
    await expect(page.getByRole("textbox", { name: "Markdown source" })).toContainText(marker);

    await page.getByRole("button", { name: "Split" }).click();
    await expect(page.locator(".ProseMirror")).toContainText(marker);

    await page.getByRole("button", { name: "WYSIWYG" }).click();
    await expect(page.locator(".ProseMirror")).toContainText(marker);
});

test("edits made in the markdown pane reach the editor", async ({ page }) => {
    // The other direction of the same bug: typing in the textarea never touched
    // the editor document directly.
    const marker = `frommarkdown-${Date.now()}`;
    await gotoApp(page);
    await openScratch(page, "scratch-journeys.md");

    await page.getByRole("button", { name: "Markdown" }).click();
    const source = page.getByRole("textbox", { name: "Markdown source" });
    await source.fill(`# From markdown\n\n${marker}\n`);

    await page.getByRole("button", { name: "WYSIWYG" }).click();
    await expect(page.locator(".ProseMirror")).toContainText(marker);
});

test("a block can be inserted twice in a row from the toolbar", async ({ page }) => {
    // Locks 74647b4: inserting an atom node at end-of-document left a
    // NodeSelection on it, so the NEXT insert replaced it instead of adding.
    // Only the first insert of a session ever worked.
    await gotoApp(page);
    await openScratch(page, "scratch-journeys.md");

    const editor = page.locator(".ProseMirror");
    const insert = page.getByRole("button", { name: /Mermaid/i });

    await editor.click();
    await insert.click();
    await expect(editor.locator(".mermaid-block")).toHaveCount(1);

    await insert.click();
    await expect(editor.locator(".mermaid-block")).toHaveCount(2);
});

test("a block can be inserted from the slash menu", async ({ page }) => {
    await gotoApp(page);
    await openScratch(page, "scratch-journeys.md");

    const editor = page.locator(".ProseMirror");
    await editor.click();
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await page.keyboard.type("/mer");

    const menu = page.getByRole("listbox", { name: "Insert block" });
    await expect(menu).toBeVisible();
    await menu.getByRole("option").first().click();

    await expect(editor.locator(".mermaid-block")).toHaveCount(1);
});

test("rapid file switching lands on the file that was clicked last", async ({ page }) => {
    // B13: reads are async and unordered, so a slow read for an earlier
    // selection could land after a fast one and replace it.
    await gotoApp(page);
    await page.getByRole("button", { name: "Open Folder" }).click();

    await page.getByRole("option", { name: "welcome.md" }).click();
    await page.getByRole("option", { name: "getting-started.md" }).click();
    await page.getByRole("option", { name: "deeper.md" }).click();

    await expect(page.getByRole("option", { name: "deeper.md" })).toHaveAttribute(
        "aria-selected",
        "true"
    );
    await expect(page.locator(".ProseMirror")).toContainText("Deeper");
});

test("a Dataset registers and a Query returns rows from it", async ({ page }) => {
    // Guards the DuckDB path end to end, and the demo-data join that returned
    // zero rows because the CSV had `Alice` and the JSONL had `alice`.
    // Seed matches public/demo (name/role/experience), not the old name/score stub.
    await gotoApp(page);
    await openScratch(page, "scratch-journeys.md");

    await page.getByRole("button", { name: "Markdown" }).click();
    await page.getByRole("textbox", { name: "Markdown source" }).fill(
        [
            "```dataset",
            "source: sample-data.csv",
            "name: team",
            "limit: 5",
            "```",
            "",
            "```query",
            "sql: SELECT name, role, experience FROM team ORDER BY experience DESC",
            "```",
            "",
        ].join("\n")
    );
    await page.getByRole("button", { name: "WYSIWYG" }).click();

    const editor = page.locator(".ProseMirror");
    await expect(editor.locator(".dataset-block")).toBeVisible({ timeout: 20_000 });

    // Dataset preview first — proves registerFile completed. Query may still be
    // retrying "table does not exist" while DuckDB warms up on cold CI runners.
    await expect(editor.locator(".dataset-block")).toContainText("Alice", { timeout: 25_000 });
    await expect(editor.locator(".dataset-block .dataset-error")).toHaveCount(0);

    // If the query raced the register, Run again once the table exists.
    const query = editor.locator(".query-block");
    await expect(query).toBeVisible();
    if ((await query.locator(".dataset-error").count()) > 0) {
        await query.getByRole("button", { name: /^Run/ }).click();
    }
    await expect(query.locator(".dataset-error")).toHaveCount(0, { timeout: 25_000 });
    await expect(query).toContainText("Alice", { timeout: 10_000 });
    await expect(query).toContainText("Architect");
    await expect(query).toContainText("12");
});
