/**
 * Resizable sidebar / split, editor fills extra width, icon-only header
 * names, and logo mousedown does not select text.
 */
import { test, expect, gotoApp } from "./fixtures";

const HEADER_ACTIONS = [
    "Share",
    "Copy all",
    "Open Folder",
    "New Note",
    "New Folder",
    "Save note",
    "Synthesize",
];

test("every header action button has a non-empty accessible name", async ({ page }) => {
    await gotoApp(page);
    for (const name of HEADER_ACTIONS) {
        const btn = page.getByRole("button", { name, exact: true });
        await expect(btn).toBeVisible();
        const accessible = ((await btn.getAttribute("aria-label")) ?? (await btn.textContent()) ?? "").trim();
        expect(accessible.length, name).toBeGreaterThan(0);
    }
    await expect(page.getByRole("button", { name: "WYSIWYG" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Markdown" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Split" })).toBeVisible();
});

test("widening the viewport widens the editor surface", async ({ page }) => {
    await gotoApp(page);
    await page.setViewportSize({ width: 1000, height: 800 });
    const narrow = await page.locator(".editor-container").boundingBox();
    await page.setViewportSize({ width: 1400, height: 800 });
    const wide = await page.locator(".editor-container").boundingBox();
    expect(narrow).toBeTruthy();
    expect(wide).toBeTruthy();
    expect(wide!.width).toBeGreaterThan(narrow!.width + 200);
});

test("dragging the sidebar handle changes its width and the value persists", async ({ page }) => {
    await gotoApp(page);
    await page.setViewportSize({ width: 1400, height: 800 });
    const sidebar = page.getByTestId("app-sidebar");
    const handle = page.getByTestId("sidebar-resize");
    await expect(handle).toBeVisible();
    const before = await sidebar.boundingBox();
    expect(before).toBeTruthy();

    const box = await handle.boundingBox();
    expect(box).toBeTruthy();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + 40);
    await page.mouse.down();
    await page.mouse.move(box!.x + 80, box!.y + 40, { steps: 8 });
    await page.mouse.up();

    await expect
        .poll(async () => (await sidebar.boundingBox())?.width ?? 0)
        .toBeGreaterThan(before!.width + 40);

    await expect
        .poll(async () => (await page.request.get("/api/settings")).json().then((b) => b.settings.sidebarWidth), {
            timeout: 5_000,
        })
        .toBeGreaterThan(300);

    const persisted = (await sidebar.boundingBox())!.width;
    await page.reload();
    await page.waitForSelector("[data-app-ready]", { timeout: 30_000 });
    await expect
        .poll(async () => (await page.getByTestId("app-sidebar").boundingBox())?.width ?? 0)
        .toBeCloseTo(persisted, 0);
});

test("split divider is a separator and arrow keys move it", async ({ page }) => {
    await gotoApp(page);
    await page.getByRole("button", { name: "Open Folder" }).click();
    await page.getByRole("treeitem", { name: "welcome.md" }).click();
    await page.getByRole("button", { name: "Split" }).click();
    const handle = page.getByTestId("split-resize");
    await expect(handle).toBeVisible();
    await expect(handle).toHaveAttribute("role", "separator");
    await expect(handle).toHaveAttribute("aria-orientation", "vertical");
    const before = Number(await handle.getAttribute("aria-valuenow"));
    await handle.focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    const after = Number(await handle.getAttribute("aria-valuenow"));
    expect(after).toBeGreaterThan(before);
});

test("mousedown on the logo does not start a text selection", async ({ page }) => {
    await gotoApp(page);
    const logo = page.locator(".logo");
    await expect(logo).toBeVisible();
    const box = await logo.boundingBox();
    expect(box).toBeTruthy();
    await page.mouse.move(box!.x + 10, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.mouse.move(box!.x + Math.max(20, box!.width - 8), box!.y + box!.height / 2, { steps: 6 });
    await page.mouse.up();
    const selected = await page.evaluate(() => window.getSelection()?.toString() ?? "");
    expect(selected).toBe("");
});
