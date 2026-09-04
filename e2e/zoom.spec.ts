/**
 * Cmd+plus / Cmd+minus / Cmd+0 zoom content, not chrome.
 *
 * Root font-size stays 16px. Header buttons keep their box. Editor text grows.
 * A status overlay names the percentage, then disappears.
 *
 * ControlOrMeta, not Meta: CI runs Linux, where Meta is not the zoom modifier.
 */
import { test, expect, gotoApp } from "./fixtures";
import type { Page } from "@playwright/test";

const rootFontSize = (page: Page) =>
    page.evaluate(() => getComputedStyle(document.documentElement).fontSize);

const zoomVar = (page: Page) =>
    page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--zoom").trim());

async function paragraphBox(page: Page) {
    const para = page.locator(".ProseMirror p").first();
    await expect(para).toBeVisible();
    return para.boundingBox();
}

async function headerButtonBox(page: Page) {
    const btn = page.getByRole("button", { name: "Open Folder" });
    await expect(btn).toBeVisible();
    return btn.boundingBox();
}

/** The settings file is shared, so no spec may leave the app zoomed. */
async function resetZoom(page: Page) {
    await page.keyboard.press("ControlOrMeta+0");
    await expect.poll(() => zoomVar(page)).toBe("1");
    await expect.poll(() => rootFontSize(page)).toBe("16px");
    await expect
        .poll(async () => (await page.request.get("/api/settings")).json().then((b) => b.settings.zoom), {
            timeout: 5_000,
        })
        .toBe(1);
}

test("Cmd+plus grows the editor, not the header, and Cmd+0 restores it", async ({ page }) => {
    await gotoApp(page);
    await resetZoom(page);

    const btnBefore = await headerButtonBox(page);
    const paraBefore = await paragraphBox(page);
    expect(btnBefore).toBeTruthy();
    expect(paraBefore).toBeTruthy();

    await page.keyboard.press("ControlOrMeta+=");
    await expect.poll(() => zoomVar(page)).toBe("1.1");
    await expect.poll(() => rootFontSize(page)).toBe("16px");

    const btnAfter = await headerButtonBox(page);
    const paraAfter = await paragraphBox(page);
    expect(btnAfter?.width).toBeCloseTo(btnBefore!.width, 0);
    expect(btnAfter?.height).toBeCloseTo(btnBefore!.height, 0);
    expect(paraAfter!.height).toBeGreaterThan(paraBefore!.height);

    await page.keyboard.press("ControlOrMeta+=");
    await expect.poll(() => zoomVar(page)).toBe("1.2");

    await page.keyboard.press("ControlOrMeta+-");
    await expect.poll(() => zoomVar(page)).toBe("1.1");

    await page.keyboard.press("ControlOrMeta+0");
    await expect.poll(() => zoomVar(page)).toBe("1");
    await expect.poll(() => rootFontSize(page)).toBe("16px");

    await resetZoom(page);
});

test("zoom is clamped, so holding the key cannot make the app unusable", async ({ page }) => {
    await gotoApp(page);
    await resetZoom(page);

    for (let i = 0; i < 20; i++) await page.keyboard.press("ControlOrMeta+=");
    await expect.poll(() => zoomVar(page)).toBe("2");
    await expect.poll(() => rootFontSize(page)).toBe("16px");

    for (let i = 0; i < 30; i++) await page.keyboard.press("ControlOrMeta+-");
    await expect.poll(() => zoomVar(page)).toBe("0.75");

    await resetZoom(page);
});

test("the level survives a reload — the settings round-trip, not just state", async ({ page }) => {
    await gotoApp(page);
    await resetZoom(page);

    await page.keyboard.press("ControlOrMeta+=");
    await page.keyboard.press("ControlOrMeta+=");
    await expect.poll(() => zoomVar(page)).toBe("1.2");

    await expect
        .poll(async () => (await page.request.get("/api/settings")).json().then((b) => b.settings.zoom), {
            timeout: 5_000,
        })
        .toBeCloseTo(1.2, 5);

    await page.reload();
    await page.waitForSelector("[data-app-ready]", { timeout: 30_000 });
    await expect.poll(() => zoomVar(page)).toBe("1.2");
    await expect.poll(() => rootFontSize(page)).toBe("16px");

    await resetZoom(page);
});

test("a zoom keystroke shows the percentage, then it disappears", async ({ page }) => {
    await gotoApp(page);
    await resetZoom(page);

    const hud = page.getByRole("status", { name: "Zoom level" });
    await expect(hud).toHaveCount(0);

    await page.keyboard.press("ControlOrMeta+=");
    await expect(hud).toHaveText("110%");
    await expect(hud).toBeHidden({ timeout: 2_500 });

    await page.keyboard.press("ControlOrMeta+0");
    await expect(hud).toHaveText("100%");
    await expect(hud).toBeHidden({ timeout: 2_500 });

    await resetZoom(page);
});
