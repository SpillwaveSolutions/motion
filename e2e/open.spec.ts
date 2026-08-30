/**
 * Finder Open With, as far as a browser can stand in for it.
 *
 * Desktop: a file URL sets the workspace to the parent directory and selects
 * the file. Browser: `?open=welcome.md` does the same against MOTION_WORKSPACE
 * without clicking Open Folder — existing specs still click Open Folder, so
 * this query is opt-in.
 */
import { test, expect, gotoApp } from "./fixtures";

test("?open= selects the note without clicking Open Folder", async ({ page }) => {
    await gotoApp(page, "/?open=welcome.md");

    await expect(page.getByRole("treeitem", { name: "welcome.md" })).toHaveAttribute(
        "aria-selected",
        "true",
    );
    await expect(page.locator(".ProseMirror")).toContainText("Welcome");
    await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
});

test("?open= nested path selects the nested note", async ({ page }) => {
    await gotoApp(page, "/?open=nested/deeper.md");

    await expect(page.getByRole("treeitem", { name: "deeper.md" })).toHaveAttribute(
        "aria-selected",
        "true",
    );
    await expect(page.locator(".ProseMirror")).toContainText("Deeper");
});
