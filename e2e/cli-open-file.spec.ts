/**
 * `motion <file.md>` — the CLI names a note, Motion boots into it.
 *
 * Drives the second dev server declared in playwright.config.ts, which is
 * launched with MOTION_AUTO_OPEN=1 + MOTION_OPEN_FILE the way the CLI launches
 * it. The shared server on 3000 deliberately sets neither, because every other
 * spec asserts the empty-shell cold start.
 */
import { join } from "path";
import { test, expect } from "./fixtures";
import { AUTO_OPEN_PORT, AUTO_OPEN_NOTE } from "./workspace";

const APP = `http://localhost:${AUTO_OPEN_PORT}/`;
// The config publishes the scratch root here before workers fork.
const AUTO_OPEN_FILE = join(process.env["MOTION_WORKSPACE"] ?? "", AUTO_OPEN_NOTE);

async function gotoAutoOpenApp(page: import("@playwright/test").Page) {
    await page.goto(APP);
    await page.waitForSelector("[data-app-ready]", { timeout: 30_000 });
}

test("boots into the CLI-named note with its folder in the sidebar", async ({ page }) => {
    await gotoAutoOpenApp(page);

    // The note itself is open -- no click, no Open Folder.
    await expect(page.locator(".ProseMirror")).toContainText("Welcome", {
        timeout: 15_000,
    });
    await expect(page.locator(".ProseMirror")).toContainText(
        "A seeded note for end-to-end runs"
    );

    // ...and it is the selected entry, not merely one of the listed ones.
    const note = page.getByRole("option", { name: "welcome.md" });
    await expect(note).toBeVisible();
    await expect(note).toHaveAttribute("aria-selected", "true");

    // The parent folder is the workspace, so its siblings are listed too.
    await expect(page.getByRole("option", { name: "getting-started.md" })).toBeVisible();
});

test("the bootstrap payload carries the absolute file path", async ({ page }) => {
    await gotoAutoOpenApp(page);

    const res = await page.request.get(`${APP}api/fs/workspace`);
    expect(res.status()).toBe(200);
    const body = await res.json();

    expect(body.autoOpen).toBe(true);
    // Absolute, because collectFiles and the sidebar both speak absolute paths.
    expect(body.openFile).toBe(AUTO_OPEN_FILE);
    expect(String(body.openFile).startsWith(String(body.root))).toBe(true);
});
