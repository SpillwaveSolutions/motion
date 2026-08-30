/**
 * Ask AI / Refine, end to end.
 *
 * The LLM is stubbed at `/api/llm` (HTTP 200 even on failure) so the suite
 * stays deterministic and the fixtures.ts >=400 gate does not fire.
 */
import { test, expect, gotoApp } from "./fixtures";

const AI_REPLY = "AI_EDIT_OK the fox is quicker.";

async function stubLLM(page: import("@playwright/test").Page, content = AI_REPLY) {
    await page.route("**/api/llm", async (route) => {
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ content, rawOutput: content }),
        });
    });
}

async function openScratchAi(page: import("@playwright/test").Page) {
    await page.getByRole("button", { name: "Open Folder" }).click();
    const note = page.getByRole("treeitem", { name: "scratch-ai.md" });
    await expect(note).toBeVisible();
    await note.click();
    const editor = page.locator(".ProseMirror");
    await expect(editor).toBeVisible();
    await expect(editor).toContainText("quick brown fox");
}

test("selecting text shows Ask AI, previews, then Replace commits", async ({ page }) => {
    await stubLLM(page);
    await gotoApp(page);
    await openScratchAi(page);

    const editor = page.locator(".ProseMirror");
    await editor.locator("p").filter({ hasText: "quick brown fox" }).click({ clickCount: 3 });

    const bubble = page.getByRole("button", { name: "Ask AI" });
    await expect(bubble).toBeVisible();
    await bubble.click();

    const panel = page.getByRole("region", { name: "Ask AI" });
    await expect(panel).toBeVisible();
    await panel.getByRole("button", { name: "Rewrite" }).click();

    const preview = page.getByRole("region", { name: "AI preview" });
    await expect(preview).toBeVisible({ timeout: 15_000 });
    await expect(preview).toContainText("AI_EDIT_OK");
    await expect(preview.getByRole("button", { name: "Replace" })).toBeVisible();
    await expect(preview.getByRole("button", { name: "Insert below" })).toBeVisible();

    await preview.getByRole("button", { name: "Replace" }).click();
    await expect(editor).toContainText("AI_EDIT_OK");
    await expect(page.getByRole("region", { name: "AI preview" })).toHaveCount(0);
});

test("/ai opens a prompt at the cursor and Insert below commits", async ({ page }) => {
    await stubLLM(page, "AI_INSERT_OK");
    await gotoApp(page);
    await openScratchAi(page);

    const editor = page.locator(".ProseMirror");
    await editor.click();
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await page.keyboard.type("/ai");

    const menu = page.getByRole("listbox", { name: "Slash commands" });
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("option").first()).toHaveText("Ask AI");
    await menu.getByRole("option", { name: "Ask AI" }).click();

    const panel = page.getByRole("region", { name: "Ask AI" });
    await expect(panel).toBeVisible();
    await panel.getByRole("textbox", { name: "Ask AI instruction" }).fill("Continue this note");
    await panel.getByRole("button", { name: "Ask AI" }).click();

    const preview = page.getByRole("region", { name: "AI preview" });
    await expect(preview).toBeVisible({ timeout: 15_000 });
    await expect(preview.getByRole("button", { name: "Insert below" })).toBeVisible();
    await expect(preview.getByRole("button", { name: "Replace" })).toHaveCount(0);

    await preview.getByRole("button", { name: "Insert below" }).click();
    await expect(editor).toContainText("AI_INSERT_OK");
});

test("Refine previews a document-scoped edit with no Insert below", async ({ page }) => {
    await stubLLM(page);
    await gotoApp(page);
    await openScratchAi(page);

    await page.getByRole("button", { name: "AI Refine document" }).click();

    const preview = page.getByRole("region", { name: "AI preview" });
    await expect(preview).toBeVisible({ timeout: 15_000 });
    await expect(preview).toContainText("AI_EDIT_OK");
    await expect(preview.getByRole("button", { name: "Replace" })).toBeVisible();
    await expect(preview.getByRole("button", { name: "Insert below" })).toHaveCount(0);

    await preview.getByRole("button", { name: "Replace" }).click();
    await expect(page.locator(".ProseMirror")).toContainText("AI_EDIT_OK");
});

test("Refine failure lands in the panel, not an alert", async ({ page }) => {
    await page.route("**/api/llm", (route) =>
        route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ error: "claude CLI not found" }),
        })
    );

    await gotoApp(page);
    await openScratchAi(page);
    await page.getByRole("button", { name: "AI Refine document" }).click();

    const preview = page.getByRole("region", { name: "AI preview" });
    await expect(preview).toBeVisible({ timeout: 15_000 });
    await expect(preview.getByRole("alert")).toContainText("claude CLI not found");
    await expect(page.locator(".ProseMirror")).toContainText("quick brown fox");
    await expect(preview.getByRole("button", { name: "Try again" })).toBeVisible();
    await expect(preview.getByRole("button", { name: "Discard" })).toBeVisible();
});

test("markdown mode has no bubble; Refine still previews", async ({ page, guard }) => {
    guard.allow(/flushSync was called from inside a lifecycle method/);
    await stubLLM(page);
    await gotoApp(page);
    await openScratchAi(page);

    await page.getByRole("button", { name: "Markdown" }).click();
    const source = page.getByRole("textbox", { name: "Markdown source" });
    await expect(source).toBeVisible();

    await source.click();
    await source.press("Control+A");
    await expect(page.getByRole("button", { name: "Ask AI" })).toHaveCount(0);

    await page.getByRole("button", { name: "AI Refine document" }).click();
    const preview = page.getByRole("region", { name: "AI preview" });
    await expect(preview).toBeVisible({ timeout: 15_000 });
    await expect(preview.getByRole("button", { name: "Insert below" })).toHaveCount(0);
    await preview.getByRole("button", { name: "Replace" }).click();
    await expect(source).toContainText("AI_EDIT_OK");
});
