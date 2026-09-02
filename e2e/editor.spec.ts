/**
 * Editor dirty tracking and Markdown-source highlighting.
 */
import { test, expect, gotoApp } from "./fixtures";

async function openNote(page: import("@playwright/test").Page, name: string) {
    await page.getByRole("button", { name: "Open Folder" }).click();
    const note = page.getByRole("treeitem", { name });
    await expect(note).toBeVisible();
    await note.click();
    await expect(page.locator(".ProseMirror")).toBeVisible();
}

test("switching view modes does not autosave an unedited note", async ({ page }) => {
    await gotoApp(page);
    await openNote(page, "scratch-dirty.md");

    const writes: string[] = [];
    page.on("request", (req) => {
        if (req.method() === "POST" && req.url().includes("/api/fs/write")) {
            writes.push(req.url());
        }
    });

    await page.getByRole("button", { name: "Markdown" }).click();
    await expect(page.getByRole("textbox", { name: "Markdown source" })).toBeVisible();
    await page.getByRole("button", { name: "Split" }).click();
    await expect(page.locator(".ProseMirror")).toBeVisible();
    await page.getByRole("button", { name: "WYSIWYG" }).click();
    await expect(page.locator(".ProseMirror")).toBeVisible();

    await expect(page.getByRole("button", { name: "Save note" })).toHaveAttribute(
        "title",
        "All changes saved"
    );

    // Longer than the 1.5s autosave debounce.
    await page.waitForTimeout(2000);
    expect(writes, "view-mode switches must not write the file").toEqual([]);
});

test("markdown source is syntax-highlighted", async ({ page }) => {
    await gotoApp(page);
    await openNote(page, "welcome.md");

    await page.getByRole("button", { name: "Markdown" }).click();
    const source = page.getByRole("textbox", { name: "Markdown source" });
    await expect(source).toBeVisible();
    await expect(source).toHaveValue(/# Welcome/);
    await expect(page.locator(".markdown-source-highlight .hljs-section")).toBeVisible();

    await page.getByRole("button", { name: "Split" }).click();
    await expect(page.getByLabel("Markdown preview")).toBeVisible();
    await expect(page.locator(".markdown-source-preview .hljs-section")).toBeVisible();
});

test("an actual edit still autosaves", async ({ page }) => {
    await gotoApp(page);
    await openNote(page, "scratch-dirty.md");

    const editor = page.locator(".ProseMirror");
    await editor.click();
    await page.keyboard.press("End");
    await page.keyboard.type(" edited");

    const write = page.waitForResponse(
        (r) => r.url().includes("/api/fs/write") && r.request().method() === "POST"
    );
    await expect(page.getByRole("button", { name: "Save note" })).toHaveAttribute(
        "title",
        "Save note (⌘S)"
    );
    expect((await write).status()).toBe(200);
});
