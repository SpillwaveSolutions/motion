/**
 * A markdown link to a file on disk loads that note. A miss must not
 * navigate the webview (the page guard treats the resulting 404 as a failure).
 */
import { test, expect, gotoApp } from "./fixtures";

test("clicking a relative markdown link opens that note", async ({ page }) => {
    await gotoApp(page, "/?open=scratch-links.md");
    await expect(page.locator(".ProseMirror")).toContainText("Links");

    await page.locator(".ProseMirror a", { hasText: "Getting started" }).click();

    await expect(page.getByRole("treeitem", { name: "getting-started.md" })).toHaveAttribute(
        "aria-selected",
        "true",
    );
    await expect(page.locator(".ProseMirror")).toContainText("Getting started");
    await expect(page.getByRole("heading", { name: "Getting started" })).toBeVisible();
});

test("clicking a nested markdown link opens that note", async ({ page }) => {
    await gotoApp(page, "/?open=scratch-links.md");
    await page.locator(".ProseMirror a", { hasText: "Deeper" }).click();

    await expect(page.getByRole("treeitem", { name: "deeper.md" })).toHaveAttribute(
        "aria-selected",
        "true",
    );
    await expect(page.locator(".ProseMirror")).toContainText("Deeper");
});

test("a link that is not on disk stays on the note", async ({ page }) => {
    await gotoApp(page, "/?open=scratch-links.md");
    await page.locator(".ProseMirror a", { hasText: "Missing" }).click();

    await expect(page.getByRole("treeitem", { name: "scratch-links.md" })).toHaveAttribute(
        "aria-selected",
        "true",
    );
    await expect(page.locator(".ProseMirror")).toContainText("Links");
});
