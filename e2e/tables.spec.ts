/**
 * GFM tables: pipe markdown becomes a real <table>, survives save/reload,
 * and can be inserted from the toolbar and slash menu.
 */
import { test, expect, gotoApp } from "./fixtures";

async function openScratchTables(page: import("@playwright/test").Page) {
    await page.getByRole("button", { name: "Open Folder" }).click();
    await page.getByRole("treeitem", { name: "scratch-tables.md" }).click();
    await expect(page.locator(".ProseMirror")).toBeVisible();
}

/**
 * The note is read asynchronously after it is clicked, and that read replaces
 * the editor's content whenever it lands. Filling once races it: the read can
 * arrive afterwards and silently restore the old document, leaving the spec
 * asserting against a note it never wrote. Retrying until the value sticks is
 * content-agnostic, so it holds no matter what an earlier test saved here.
 */
async function setMarkdown(page: import("@playwright/test").Page, doc: string) {
    await page.getByRole("button", { name: "Markdown" }).click();
    const source = page.getByRole("textbox", { name: "Markdown source" });
    await expect(async () => {
        await source.fill(doc);
        await expect(source).toHaveValue(doc, { timeout: 1_000 });
    }).toPass({ timeout: 15_000 });
    await page.getByRole("button", { name: "WYSIWYG" }).click();
    await expect(page.locator(".ProseMirror")).toBeVisible();
}

const PIPE_DOC = [
    "# Round trip",
    "",
    "| Name | Role |",
    "| --- | --- |",
    "| Ada | Engineer |",
    "| Grace | Architect |",
    "",
].join("\n");

test("a pipe table becomes a real table and survives save/reload", async ({ page }) => {
    await gotoApp(page);
    await openScratchTables(page);
    await setMarkdown(page, PIPE_DOC);

    const editor = page.locator(".ProseMirror");
    const table = editor.getByRole("table");
    await expect(table).toBeVisible();
    await expect(table.getByRole("columnheader")).toHaveCount(2);
    await expect(table).toContainText("Ada");
    await expect(table).toContainText("Architect");

    // Autosave may already have written this document, so waiting on one
    // specific response races. Collect every write instead, then let the save
    // state tell us nothing is still in flight before navigating away.
    const writes: number[] = [];
    page.on("response", (r) => {
        if (r.url().includes("/api/fs/write")) writes.push(r.status());
    });
    const saveButton = page.getByRole("button", { name: "Save note" });
    await saveButton.click();
    await expect(saveButton).toHaveAttribute("data-save-state", "saved");
    expect(writes.length).toBeGreaterThan(0);
    expect(writes.every((status) => status === 200)).toBe(true);

    await gotoApp(page);
    await openScratchTables(page);

    const reloaded = page.locator(".ProseMirror").getByRole("table");
    await expect(reloaded).toBeVisible({ timeout: 15_000 });
    await expect(reloaded).toContainText("Ada");
    await expect(reloaded).toContainText("Architect");
    await expect(page.locator(".ProseMirror")).not.toContainText("| Name | Role |");

    await page.getByRole("button", { name: "Markdown" }).click();
    const reloadedSource = page.getByRole("textbox", { name: "Markdown source" });
    await expect(reloadedSource).toContainText("| Ada | Engineer |");

    // Switching view modes re-serializes, which can mark a note dirty with no
    // edit behind it and arm the 1.5s autosave. Settling here keeps teardown
    // from cancelling that write mid-flight -- an aborted POST the page-error
    // gate rightly refuses to ignore. The spurious dirty itself is filed
    // separately; this only makes the spec deterministic about it.
    await saveButton.click();
    await expect(saveButton).toHaveAttribute("data-save-state", "saved");
});

test("Insert Table creates a 3×3 and Add row grows it", async ({ page }) => {
    await gotoApp(page);
    await openScratchTables(page);
    await setMarkdown(page, "# Scratch: tables\n\n");

    await page.getByRole("button", { name: "Insert Table" }).click();
    const editor = page.locator(".ProseMirror");
    const table = editor.getByRole("table");
    await expect(table).toBeVisible();
    await expect(table.getByRole("row")).toHaveCount(3);
    await expect(table.getByRole("columnheader")).toHaveCount(3);

    await table.getByRole("columnheader").first().click();
    await expect(page.getByRole("button", { name: "Add row" })).toBeVisible();
    await page.getByRole("button", { name: "Add row" }).click();
    await expect(table.getByRole("row")).toHaveCount(4);

    await table.getByRole("cell").first().click();
    await page.keyboard.type("cell-one");
    await expect(table).toContainText("cell-one");
});

test("/tab inserts a table from the slash menu", async ({ page }) => {
    await gotoApp(page);
    await openScratchTables(page);
    await setMarkdown(page, "# Scratch: tables\n\n");

    const editor = page.locator(".ProseMirror");
    await editor.click();
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await page.keyboard.type("/tab");

    const menu = page.getByRole("listbox", { name: "Slash commands" });
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("option")).toHaveCount(1);
    await expect(menu.getByRole("option").first()).toHaveText("Table");
    await menu.getByRole("option", { name: "Table" }).click();

    const table = editor.getByRole("table");
    await expect(table).toBeVisible();
    await expect(table.getByRole("columnheader")).toHaveCount(3);
});

/**
 * Table cells are `block+`, so inserting a table from inside one used to nest
 * a table in a cell -- a shape GFM cannot serialize, so the note stopped
 * round-tripping. Both entry points must escape to the top level instead.
 */
test("Insert Table from inside a table appends a sibling, never a nested one", async ({ page }) => {
    await gotoApp(page);
    await openScratchTables(page);
    await setMarkdown(page, PIPE_DOC);

    const editor = page.locator(".ProseMirror");
    const first = editor.getByRole("table").first();
    await expect(first).toBeVisible();

    // Caret inside the existing table, then insert another one.
    await first.getByRole("cell").first().click();
    await page.getByRole("button", { name: "Insert Table" }).click();

    await expect(editor.getByRole("table")).toHaveCount(2);
    // The giveaway for the bug: a table rendered inside another table's cell.
    await expect(editor.locator("table table")).toHaveCount(0);

    // And the document still round-trips as two separate GFM tables.
    await page.getByRole("button", { name: "Markdown" }).click();
    const source = page.getByRole("textbox", { name: "Markdown source" });
    await expect(source).toHaveValue(/\| Ada \| Engineer \|/);
    await expect(source).toHaveValue(/(\|[^\n]*\|\n\|\s*---)[\s\S]*(\|[^\n]*\|\n\|\s*---)/);
});

test("/tab from inside a table also escapes, with the typed text removed", async ({ page }) => {
    await gotoApp(page);
    await openScratchTables(page);
    await setMarkdown(page, PIPE_DOC);

    const editor = page.locator(".ProseMirror");
    const first = editor.getByRole("table").first();
    // Triple-click selects the cell's paragraph, so typing replaces it: the
    // slash menu only opens when "/" is the first character of the block.
    await first.getByRole("cell").first().click({ clickCount: 3 });
    await page.keyboard.type("/tab");

    const menu = page.getByRole("listbox", { name: "Slash commands" });
    await expect(menu).toBeVisible();
    await menu.getByRole("option", { name: "Table" }).click();

    await expect(editor.getByRole("table")).toHaveCount(2);
    await expect(editor.locator("table table")).toHaveCount(0);
    // The deletion ran in the same transaction as the insert, so the position
    // handed to the insert had to be re-based: "/tab" must not survive.
    await expect(editor).not.toContainText("/tab");
});
