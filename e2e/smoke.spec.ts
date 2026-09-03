/**
 * The first real gate. If this is red, nothing else matters.
 *
 * It asserts almost nothing about behaviour on purpose -- its job is to prove
 * the app boots clean, and to prove the console/network guard in fixtures.ts is
 * wired to every spec.
 */
import { test, expect, gotoApp } from "./fixtures";

test("app boots with the editor mounted and a clean console", async ({ page }) => {
    await gotoApp(page);

    // The welcome document renders through the real Tiptap editor.
    await expect(page.locator(".ProseMirror")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Welcome to Motion" })).toBeVisible();

    // Shell controls are present.
    await expect(page.getByRole("button", { name: "Open Folder" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Copy all" })).toBeVisible();
    await expect(page.getByTestId("header-drag-gutter")).toBeVisible();
    await expect(page.getByLabel("Search notes")).toBeVisible();

    // The guard fixture asserts zero console errors / failed requests / >=400
    // responses at teardown -- no explicit assertion needed here.
});
