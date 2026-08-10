/**
 * Unsaved-changes guard on a sidebar file switch.
 *
 * Spec + rubric: docs/ui/dialogs.md § Unsaved Changes.
 *
 * Every outcome is covered, including the clean switch: a guard that fires when
 * nothing is dirty trains the user to click through it, which is worse than not
 * having one.
 */
import { test, expect, gotoApp } from "./fixtures";
import type { Page } from "@playwright/test";

const SCRATCH = "scratch-unsaved.md";
const OTHER = "getting-started.md";

async function openWorkspace(page: Page) {
    await page.getByRole("button", { name: "Open Folder" }).click();
    await expect(page.getByRole("option", { name: "welcome.md" })).toBeVisible();
}

async function openNote(page: Page, name: string) {
    await page.getByRole("option", { name }).click();
    await expect(page.getByRole("option", { name })).toHaveAttribute(
        "aria-selected",
        "true"
    );
}

/** Type into the document so the buffer diverges from disk. */
async function dirtyTheBuffer(page: Page, text: string) {
    const editor = page.locator(".ProseMirror");
    await editor.click();
    await page.keyboard.press("End");
    await page.keyboard.type(text);
    await expect(editor).toContainText(text);
}

const dialog = (page: Page) =>
    page.getByRole("dialog", { name: /Unsaved Changes/i });

test("a clean buffer switches notes with no dialog at all", async ({ page }) => {
    await gotoApp(page);
    await openWorkspace(page);
    await openNote(page, SCRATCH);

    await page.getByRole("option", { name: OTHER }).click();

    await expect(dialog(page)).toHaveCount(0);
    await expect(page.getByRole("option", { name: OTHER })).toHaveAttribute(
        "aria-selected",
        "true"
    );
});

test("Cancel leaves the original note active and still dirty", async ({ page }) => {
    await gotoApp(page);
    await openWorkspace(page);
    await openNote(page, SCRATCH);
    await dirtyTheBuffer(page, " CANCEL-EDIT");

    await page.getByRole("option", { name: OTHER }).click();
    await expect(dialog(page)).toBeVisible();
    await dialog(page).getByRole("button", { name: "Cancel" }).click();

    await expect(dialog(page)).toHaveCount(0);
    // Selection did not move, and the edit is still in the buffer.
    await expect(page.getByRole("option", { name: SCRATCH })).toHaveAttribute(
        "aria-selected",
        "true"
    );
    await expect(page.locator(".ProseMirror")).toContainText("CANCEL-EDIT");

    // Still dirty: trying again prompts again rather than silently proceeding.
    await page.getByRole("option", { name: OTHER }).click();
    await expect(dialog(page)).toBeVisible();
    await dialog(page).getByRole("button", { name: "Cancel" }).click();
});

test("Discard opens the requested note and drops the edits", async ({ page }) => {
    await gotoApp(page);
    await openWorkspace(page);
    await openNote(page, SCRATCH);
    await dirtyTheBuffer(page, " DISCARD-EDIT");

    await page.getByRole("option", { name: OTHER }).click();
    await dialog(page).getByRole("button", { name: "Discard" }).click();

    await expect(dialog(page)).toHaveCount(0);
    await expect(page.getByRole("option", { name: OTHER })).toHaveAttribute(
        "aria-selected",
        "true"
    );
    await expect(page.locator(".ProseMirror")).toContainText("Second seeded note");

    // Going back shows the note as it was on disk -- the edit is gone.
    await openNote(page, SCRATCH);
    await expect(page.locator(".ProseMirror")).not.toContainText("DISCARD-EDIT");
});

test("Save writes the edits, then opens the requested note", async ({ page }) => {
    await gotoApp(page);
    await openWorkspace(page);
    await openNote(page, SCRATCH);
    await dirtyTheBuffer(page, " SAVE-EDIT");

    await page.getByRole("option", { name: OTHER }).click();
    await dialog(page).getByRole("button", { name: "Save" }).click();

    await expect(dialog(page)).toHaveCount(0);
    await expect(page.getByRole("option", { name: OTHER })).toHaveAttribute(
        "aria-selected",
        "true"
    );

    // Reopening proves it reached disk, not just the in-memory buffer.
    await openNote(page, SCRATCH);
    await expect(page.locator(".ProseMirror")).toContainText("SAVE-EDIT");

    // ...and the reloaded buffer is clean, so the next switch is unguarded.
    await page.getByRole("option", { name: OTHER }).click();
    await expect(dialog(page)).toHaveCount(0);
});

test("Escape cancels the guard", async ({ page }) => {
    await gotoApp(page);
    await openWorkspace(page);
    await openNote(page, SCRATCH);
    await dirtyTheBuffer(page, " ESCAPE-EDIT");

    await page.getByRole("option", { name: OTHER }).click();
    await expect(dialog(page)).toBeVisible();
    await page.keyboard.press("Escape");

    await expect(dialog(page)).toHaveCount(0);
    await expect(page.getByRole("option", { name: SCRATCH })).toHaveAttribute(
        "aria-selected",
        "true"
    );
});
