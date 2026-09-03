/**
 * IDE-style project navigation: tree, flat, name filter, content search.
 */
import { test, expect, gotoApp } from "./fixtures";

async function openWorkspace(page: import("@playwright/test").Page) {
    await page.getByRole("button", { name: "Open Folder" }).click();
    await expect(page.getByRole("option", { name: "welcome.md" })).toBeVisible();
}

test("tree view is folders collapsed by default; click to open", async ({ page }) => {
    await gotoApp(page);
    await openWorkspace(page);

    // Tree is default: only top-level folders + root notes (not every nested file).
    await expect(page.getByRole("button", { name: /^nested$/ })).toBeVisible();
    await expect(page.getByRole("option", { name: "welcome.md" })).toBeVisible();
    await expect(page.getByRole("option", { name: "deeper.md" })).toHaveCount(0);

    // Click the folder to expand, then open the nested note.
    await page.getByRole("button", { name: /^nested$/ }).click();
    await expect(page.getByRole("option", { name: "deeper.md" })).toBeVisible();
    await page.getByRole("option", { name: "deeper.md" }).click();
    await expect(page.locator(".ProseMirror")).toContainText("Deeper");
});

test("flat view lists every note as a top-level option", async ({ page }) => {
    await gotoApp(page);
    await openWorkspace(page);

    await page.getByRole("button", { name: "Flat", exact: true }).click();
    await expect(page.getByRole("option", { name: "welcome.md" })).toBeVisible();
    await expect(page.getByRole("option", { name: "deeper.md" })).toBeVisible();
    await expect(page.getByRole("option", { name: "getting-started.md" })).toBeVisible();
});

test("name filter narrows the notes list", async ({ page }) => {
    await gotoApp(page);
    await openWorkspace(page);

    await page.getByLabel("Search notes").fill("welcome");
    await expect(page.getByRole("option", { name: "welcome.md" })).toBeVisible();
    await expect(page.getByRole("option", { name: "deeper.md" })).toHaveCount(0);
});

test("path glob narrows the notes list", async ({ page }) => {
    await gotoApp(page);
    await openWorkspace(page);

    await page.getByLabel("Path glob").fill("nested/**");
    await expect(page.getByRole("option", { name: "deeper.md" })).toBeVisible();
    await expect(page.getByRole("option", { name: "welcome.md" })).toHaveCount(0);
});

test("content search finds text inside notes", async ({ page }) => {
    await gotoApp(page);
    await openWorkspace(page);

    await page.getByLabel("Search in file contents").fill("Welcome");
    await expect(page.getByRole("listbox", { name: "Search results" })).toBeVisible({
        timeout: 10_000,
    });
    // Seeded welcome.md contains "Welcome"
    await expect(
        page.getByRole("listbox", { name: "Search results" }).getByRole("option").first()
    ).toBeVisible();
    await page.getByRole("listbox", { name: "Search results" }).getByRole("option").first().click();
    await expect(page.locator(".ProseMirror")).toContainText(/Welcome/i);
});

test("glob then grep compose as AND", async ({ page }) => {
    await gotoApp(page);
    await openWorkspace(page);

    // Scope to nested/** then grep "Deeper" → hit deeper.md
    await page.getByLabel("Path glob").fill("nested/**");
    await page.getByLabel("Search in file contents").fill("Deeper");
    await expect(page.getByRole("listbox", { name: "Search results" })).toBeVisible({
        timeout: 10_000,
    });
    await expect(
        page.getByRole("listbox", { name: "Search results" }).getByRole("option").first()
    ).toContainText("deeper.md");

    // Same glob + string only in welcome.md → no hits (AND excludes root notes)
    await page.getByLabel("Search in file contents").fill("Welcome");
    await expect(page.getByRole("listbox", { name: "Search results" })).toBeVisible({
        timeout: 10_000,
    });
    await expect(page.getByText("No content matches in globbed files.")).toBeVisible();
});
