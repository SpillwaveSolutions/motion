/**
 * DocCommands: Ask AI returns a planned edit list; Apply commits it.
 *
 * Stubbed at `/api/ai/stream` (HTTP 200 SSE) so the suite stays deterministic
 * and the fixtures.ts >=400 gate does not fire.
 */
import { test, expect, gotoApp } from "./fixtures";

function sseBody(events: object[]): string {
    return events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("");
}

const ADD_ROW = {
    op: "table_add_row",
    table: 1,
    cells: ["Grace", "Architect"],
};

async function stubCommands(page: import("@playwright/test").Page, commands: object[]) {
    await page.route("**/api/ai/stream", async (route) => {
        await route.fulfill({
            status: 200,
            contentType: "text/event-stream",
            body: sseBody([
                ...commands.map((command) => ({ type: "command", command })),
                { type: "done", text: "", commands },
            ]),
        });
    });
}

async function openScratchCommands(page: import("@playwright/test").Page) {
    await page.getByRole("button", { name: "Open Folder" }).click();
    const note = page.getByRole("treeitem", { name: "scratch-commands.md" });
    await expect(note).toBeVisible();
    await note.click();
    const editor = page.locator(".ProseMirror");
    await expect(editor).toBeVisible();
    await expect(editor.getByRole("columnheader", { name: "Name" })).toBeVisible();
    await expect(editor.getByRole("cell", { name: "Ada" })).toBeVisible();
}

test("DocCommands preview lists the edit; Apply commits a table row", async ({ page }) => {
    await stubCommands(page, [ADD_ROW]);
    await gotoApp(page);
    await openScratchCommands(page);

    await page.getByRole("button", { name: "AI Refine document" }).click();

    const preview = page.getByRole("region", { name: "AI preview" });
    await expect(preview).toBeVisible({ timeout: 15_000 });
    const list = preview.getByRole("list", { name: "Proposed edits" });
    await expect(list).toBeVisible();
    await expect(list.getByRole("listitem")).toContainText("Add row to table 1");
    await expect(preview.getByRole("button", { name: "Replace" })).toHaveCount(0);
    await expect(preview.getByRole("button", { name: "Insert below" })).toHaveCount(0);

    await preview.getByRole("button", { name: "Apply 1 edit" }).click();
    await expect(page.getByRole("region", { name: "AI preview" })).toHaveCount(0);

    const editor = page.locator(".ProseMirror");
    await expect(editor.getByRole("cell", { name: "Grace" })).toBeVisible();
    await expect(editor.getByRole("cell", { name: "Architect" })).toBeVisible();
    await expect(editor.getByRole("cell", { name: "Ada" })).toBeVisible();
});

test("Discard leaves the table unchanged", async ({ page }) => {
    await stubCommands(page, [ADD_ROW]);
    await gotoApp(page);
    await openScratchCommands(page);

    await page.getByRole("button", { name: "AI Refine document" }).click();
    const preview = page.getByRole("region", { name: "AI preview" });
    await expect(preview).toBeVisible({ timeout: 15_000 });
    await preview.getByRole("button", { name: "Discard" }).click();

    await expect(page.getByRole("region", { name: "AI preview" })).toHaveCount(0);
    const editor = page.locator(".ProseMirror");
    await expect(editor.getByRole("cell", { name: "Ada" })).toBeVisible();
    await expect(editor.getByRole("cell", { name: "Grace" })).toHaveCount(0);
});

test("/ai can return insert_after_block and Apply inserts it", async ({ page }) => {
    const insert = {
        op: "insert_after_block",
        after: "# Scratch: commands",
        markdown: "INSERTED_OK a new paragraph.",
    };
    await stubCommands(page, [insert]);
    await gotoApp(page);
    await openScratchCommands(page);

    const editor = page.locator(".ProseMirror");
    await editor.locator("h1").click();
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await page.keyboard.type("/ai");

    const menu = page.getByRole("listbox", { name: "Slash commands" });
    await expect(menu).toBeVisible();
    await menu.getByRole("option", { name: "Ask AI" }).click();

    const panel = page.getByRole("region", { name: "Ask AI" });
    await expect(panel).toBeVisible();
    await panel.getByRole("textbox", { name: "Ask AI instruction" }).fill("Insert a note after the heading");
    await panel.getByRole("button", { name: "Ask AI" }).click();

    const preview = page.getByRole("region", { name: "AI preview" });
    await expect(preview).toBeVisible({ timeout: 15_000 });
    await expect(preview.getByRole("list", { name: "Proposed edits" })).toContainText("Insert after");
    await preview.getByRole("button", { name: "Apply 1 edit" }).click();

    await expect(editor).toContainText("INSERTED_OK");
    await expect(editor.getByRole("cell", { name: "Ada" })).toBeVisible();
});

test("an un-applicable command lands in the panel as an error", async ({ page }) => {
    await stubCommands(page, [{ op: "table_add_row", table: 9, cells: ["Nope"] }]);
    await gotoApp(page);
    await openScratchCommands(page);

    await page.getByRole("button", { name: "AI Refine document" }).click();
    const preview = page.getByRole("region", { name: "AI preview" });
    await expect(preview).toBeVisible({ timeout: 15_000 });
    await expect(preview.getByRole("alert")).toContainText("no table 9");
    await expect(page.locator(".ProseMirror").getByRole("cell", { name: "Ada" })).toBeVisible();
    await expect(preview.getByRole("button", { name: "Try again" })).toBeVisible();
});
