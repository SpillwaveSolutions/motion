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

async function setMarkdown(page: import("@playwright/test").Page, doc: string) {
    await page.getByRole("button", { name: "Markdown" }).click();
    const source = page.getByRole("textbox", { name: "Markdown source" });
    await source.fill(doc);
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

    const write = page.waitForResponse((r) => r.url().includes("/api/fs/write"));
    await page.getByRole("button", { name: "Save note" }).click();
    expect((await write).status()).toBe(200);

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
