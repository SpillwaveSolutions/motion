/**
 * Cmd+plus / Cmd+minus / Cmd+0 zoom, remembered across restarts.
 *
 * Asserts the *computed* root font size rather than the keystroke's intent.
 * preventDefault on the browser's own page-zoom shortcut is not guaranteed
 * across browsers, so "we sent the key" proves nothing about what the user
 * ends up looking at.
 *
 * ControlOrMeta, not Meta: CI runs Linux, where Meta is not the zoom modifier.
 */
import { test, expect, gotoApp } from "./fixtures";
import type { Page } from "@playwright/test";

const rootFontSize = (page: Page) =>
    page.evaluate(() => getComputedStyle(document.documentElement).fontSize);

/** The settings file is shared, so no spec may leave the app zoomed. */
async function resetZoom(page: Page) {
    await page.keyboard.press("ControlOrMeta+0");
    await expect.poll(() => rootFontSize(page)).toBe("16px");
    // Outlast the persistence debounce so the reset actually reaches disk.
    await expect
        .poll(async () => (await page.request.get("/api/settings")).json().then((b) => b.settings.zoom), {
            timeout: 5_000,
        })
        .toBe(1);
}

test("Cmd+plus grows the window and Cmd+0 restores it exactly", async ({ page }) => {
    await gotoApp(page);
    await expect.poll(() => rootFontSize(page)).toBe("16px");

    await page.keyboard.press("ControlOrMeta+=");
    await expect.poll(() => rootFontSize(page)).toBe("17.6px");

    await page.keyboard.press("ControlOrMeta+=");
    await expect.poll(() => rootFontSize(page)).toBe("19.2px");

    await page.keyboard.press("ControlOrMeta+-");
    await expect.poll(() => rootFontSize(page)).toBe("17.6px");

    await page.keyboard.press("ControlOrMeta+0");
    await expect.poll(() => rootFontSize(page)).toBe("16px");

    await resetZoom(page);
});

test("zoom is clamped, so holding the key cannot make the app unusable", async ({ page }) => {
    await gotoApp(page);

    for (let i = 0; i < 20; i++) await page.keyboard.press("ControlOrMeta+=");
    // ZOOM_MAX 2.0 -> 32px, and no further.
    await expect.poll(() => rootFontSize(page)).toBe("32px");

    for (let i = 0; i < 30; i++) await page.keyboard.press("ControlOrMeta+-");
    // ZOOM_MIN 0.75 -> 12px.
    await expect.poll(() => rootFontSize(page)).toBe("12px");

    await resetZoom(page);
});

test("the level survives a reload — the settings round-trip, not just state", async ({ page }) => {
    await gotoApp(page);

    await page.keyboard.press("ControlOrMeta+=");
    await page.keyboard.press("ControlOrMeta+=");
    await expect.poll(() => rootFontSize(page)).toBe("19.2px");

    // Wait for the debounced write to land before throwing the page away.
    await expect
        .poll(async () => (await page.request.get("/api/settings")).json().then((b) => b.settings.zoom), {
            timeout: 5_000,
        })
        .toBeCloseTo(1.2, 5);

    await page.reload();
    await page.waitForSelector("[data-app-ready]", { timeout: 30_000 });
    await expect.poll(() => rootFontSize(page)).toBe("19.2px");

    await resetZoom(page);
});
