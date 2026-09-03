/**
 * Inline rename in the notes tree. New Note opens the field; right-click and
 * F2 do the same for an existing note. The OS prompt is not used.
 */
import { test, expect, gotoApp } from "./fixtures";

test("New Note opens inline rename; Enter commits a real filename", async ({ page }) => {
    await gotoApp(page);
    await page.getByRole("button", { name: "Open Folder" }).click();

    const write = page.waitForResponse(
        (r) => r.url().includes("/api/fs/write") && r.request().method() === "POST"
    );
    await page.getByRole("button", { name: "New Note" }).click();
    expect((await write).status()).toBe(200);

    const field = page.getByRole("textbox", { name: "Rename note" });
    await expect(field).toBeVisible();
    const name = `standup-${Date.now()}`;
    await field.fill(name);
    const rename = page.waitForResponse(
        (r) => r.url().includes("/api/fs/rename") && r.request().method() === "POST"
    );
    await field.press("Enter");
    expect((await rename).status()).toBe(200);

    await expect(page.getByRole("treeitem", { name: `${name}.md` })).toHaveAttribute(
        "aria-selected",
        "true"
    );
    await expect(page.locator(".ProseMirror")).toContainText("New Note");
});

test("Escape on a new note keeps the untitled filename", async ({ page }) => {
    await gotoApp(page);
    await page.getByRole("button", { name: "Open Folder" }).click();

    await page.getByRole("button", { name: "New Note" }).click();
    const field = page.getByRole("textbox", { name: "Rename note" });
    await expect(field).toBeVisible();
    await field.press("Escape");
    await expect(page.getByRole("treeitem", { name: /^untitled-/, selected: true })).toBeVisible();
});

test("right-click Rename starts the same inline field", async ({ page }) => {
    await gotoApp(page);
    await page.getByRole("button", { name: "Open Folder" }).click();
    const note = page.getByRole("treeitem", { name: "scratch-journeys.md" });
    await note.click();
    await note.click({ button: "right" });
    await page.getByRole("menuitem", { name: "Rename" }).click();
    const field = page.getByRole("textbox", { name: "Rename note" });
    await expect(field).toBeVisible();
    await expect(field).toHaveValue("scratch-journeys");
    await field.press("Escape");
});

test("F2 starts rename on the selected note", async ({ page }) => {
    await gotoApp(page);
    await page.getByRole("button", { name: "Open Folder" }).click();
    const note = page.getByRole("treeitem", { name: "scratch-journeys.md" });
    await note.click();
    await page.keyboard.press("F2");
    const field = page.getByRole("textbox", { name: "Rename note" });
    await expect(field).toBeVisible();
    await expect(field).toHaveValue("scratch-journeys");
    await field.press("Escape");
    await expect(page.getByRole("treeitem", { name: "scratch-journeys.md" })).toHaveAttribute(
        "aria-selected",
        "true"
    );
});

test("a second click on the already-selected file starts rename", async ({ page }) => {
    await gotoApp(page);
    await page.getByRole("button", { name: "Open Folder" }).click();
    const note = page.getByRole("treeitem", { name: "scratch-journeys.md" });
    await note.click();
    await expect(note).toHaveAttribute("aria-selected", "true");
    await note.click();
    const field = page.getByRole("textbox", { name: "Rename note" });
    await expect(field).toBeVisible();
    await field.press("Escape");
});
