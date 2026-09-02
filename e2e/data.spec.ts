/**
 * Dataset + SQL install path.
 *
 * These are the failures that showed up in the desktop shell on a cold welcome
 * load: "Failed to load dataset" and Catalog Error "Table 'team' does not exist".
 * Earlier specs only asserted that the node views mounted — not that DuckDB
 * actually registered the files and that the welcome JOIN returned rows.
 *
 * Web E2E resolves sample-*.{csv,jsonl} against MOTION_WORKSPACE (the seeded
 * scratch root). The seed matches public/demo so this is the same contract the
 * welcome document ships with.
 */
import { test, expect, gotoApp } from "./fixtures";

async function openScratch(page: import("@playwright/test").Page, name: string) {
    await page.getByRole("button", { name: "Open Folder" }).click();
    const note = page.getByRole("treeitem", { name });
    await expect(note).toBeVisible();
    await note.click();
    await expect(page.locator(".ProseMirror")).toBeVisible();
}

test("welcome datasets register and show rows without an error banner", async ({ page }) => {
    await gotoApp(page);

    const editor = page.locator(".ProseMirror");
    await expect(editor.getByRole("heading", { name: "Welcome to Motion" })).toBeVisible();

    const datasets = editor.locator(".dataset-block");
    await expect(datasets).toHaveCount(2, { timeout: 20_000 });

    // No install failure UI — the red "Failed to load dataset" banners.
    await expect(editor.locator(".dataset-error")).toHaveCount(0, { timeout: 20_000 });

    // Rows from sample-data.csv (table team) and sample-events.jsonl (events).
    await expect(editor).toContainText("Alice", { timeout: 20_000 });
    await expect(editor).toContainText("Architect");
    await expect(editor).toContainText("login");
    await expect(editor).toContainText("view_page");
});

test("welcome SQL JOIN runs against the registered team and events tables", async ({ page }) => {
    await gotoApp(page);

    const editor = page.locator(".ProseMirror");
    const query = editor.locator(".query-block");
    await expect(query).toBeVisible({ timeout: 20_000 });

    // Catalog errors look like: Table with name team does not exist
    await expect(query.locator(".dataset-error")).toHaveCount(0, { timeout: 20_000 });

    // JOIN team.name = events.user — proof both tables installed under the
    // names the welcome document declares (name: team / name: events).
    await expect(query).toContainText("Alice", { timeout: 20_000 });
    await expect(query).toContainText("click_btn");
    await expect(query).toContainText("Bob");
    await expect(query).toContainText("view_page");
});

test("a document can register two datasets and JOIN them by table name", async ({ page }) => {
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
            "```dataset",
            "source: sample-events.jsonl",
            "name: events",
            "limit: 5",
            "```",
            "",
            "```query",
            "sql: SELECT team.name, events.event FROM team JOIN events ON team.name = events.user ORDER BY events.timestamp DESC",
            "```",
            "",
        ].join("\n")
    );
    await page.getByRole("button", { name: "WYSIWYG" }).click();

    const editor = page.locator(".ProseMirror");
    await expect(editor.locator(".dataset-block")).toHaveCount(2, { timeout: 20_000 });
    await expect(editor.locator(".query-block")).toBeVisible();

    await expect(editor.locator(".dataset-error")).toHaveCount(0, { timeout: 20_000 });
    await expect(editor).toContainText("Alice", { timeout: 20_000 });
    await expect(editor).toContainText("click_btn");
    await expect(editor).toContainText("Bob");
});

test("a missing dataset source surfaces an error instead of a silent empty table", async ({
    page,
    guard,
}) => {
    // Tiptap 3 + React 19: node views call flushSync while markdown→WYSIWYG
    // setContent is landing. Isolated this spec is clean; under a warm suite
    // the same path logs this and trips the console gate.
    guard.allow(/flushSync was called from inside a lifecycle method/);

    await gotoApp(page);
    await openScratch(page, "scratch-journeys.md");

    await page.getByRole("button", { name: "Markdown" }).click();
    await page.getByRole("textbox", { name: "Markdown source" }).fill(
        [
            "```dataset",
            "source: does-not-exist.csv",
            "name: missing_table",
            "limit: 5",
            "```",
            "",
        ].join("\n")
    );
    await page.getByRole("button", { name: "WYSIWYG" }).click();

    const block = page.locator(".ProseMirror .dataset-block");
    await expect(block).toBeVisible({ timeout: 20_000 });
    await expect(block.locator(".dataset-error")).toBeVisible({ timeout: 20_000 });
    await expect(block.locator(".dataset-error")).toContainText("Not in this workspace: does-not-exist.csv");
});

test("welcome datasets degrade when demo files are not in the workspace", async ({ page }) => {
    await page.route("**/api/fs/data-files", async (route) => {
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: "[]",
        });
    });
    await gotoApp(page);

    const editor = page.locator(".ProseMirror");
    await expect(editor.getByRole("heading", { name: "Welcome to Motion" })).toBeVisible();
    const datasets = editor.locator(".dataset-block");
    await expect(datasets).toHaveCount(2, { timeout: 20_000 });
    const banners = editor.locator(".dataset-block .dataset-error");
    await expect(banners).toHaveCount(2);
    await expect(banners.first()).toContainText("Demo data is not in this workspace");
    await expect(banners.nth(1)).toContainText("Demo data is not in this workspace");
});
