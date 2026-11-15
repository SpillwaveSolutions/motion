/**
 * Live sidebar refresh. Another program (here, Node `fs` in the spec process)
 * changes the open workspace on disk. The sidebar follows through OS file
 * events, with no reload and no Open Folder click.
 */
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { test, expect, gotoApp, openFolder } from "./fixtures";

async function workspaceRoot(page: import("@playwright/test").Page): Promise<string> {
    const res = await page.request.get("/api/fs/workspace");
    expect(res.ok()).toBe(true);
    return (await res.json()).root as string;
}

test("a note added outside Motion shows in the sidebar, and goes when deleted", async ({ page }) => {
    await gotoApp(page);
    await openFolder(page);
    const root = await workspaceRoot(page);
    const name = `external-${Date.now()}.md`;
    const file = join(root, name);

    writeFileSync(file, "# External\n\nWritten by another program.\n");
    try {
        await expect(page.getByRole("treeitem", { name })).toBeVisible({ timeout: 5000 });

        // The new note is readable, not just listed.
        await page.getByRole("treeitem", { name }).click();
        await expect(page.locator(".ProseMirror")).toContainText("Written by another program.");

        // Leave the note first: deleting the open note keeps it in the editor.
        await page.getByRole("treeitem", { name: "welcome.md" }).click();
    } finally {
        rmSync(file, { force: true });
    }
    await expect(page.getByRole("treeitem", { name })).toHaveCount(0, { timeout: 5000 });
});

test("a note added inside a dot folder stays out of the sidebar", async ({ page }) => {
    await gotoApp(page);
    await openFolder(page);
    const root = await workspaceRoot(page);
    const hidden = `hidden-${Date.now()}.md`;
    const visible = `visible-${Date.now()}.md`;
    const dotDir = join(root, ".watch-hidden");
    mkdirSync(dotDir, { recursive: true });

    try {
        writeFileSync(join(dotDir, hidden), "# Hidden\n");
        // A visible note written after it proves the refresh ran, so the
        // missing hidden note is a real result and not a slow watcher.
        writeFileSync(join(root, visible), "# Visible\n");
        await expect(page.getByRole("treeitem", { name: visible })).toBeVisible({ timeout: 5000 });
        await expect(page.getByRole("treeitem", { name: hidden })).toHaveCount(0);
    } finally {
        rmSync(dotDir, { recursive: true, force: true });
        rmSync(join(root, visible), { force: true });
    }
});
