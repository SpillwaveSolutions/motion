/**
 * Settings dialog + CLI launcher preferences.
 */
import { test, expect, gotoApp } from "./fixtures";

test("Settings opens and shows CLI launcher options", async ({ page }) => {
    await gotoApp(page);

    await page.getByRole("button", { name: "Settings" }).click();
    const dialog = page.getByRole("dialog", { name: "Settings" });
    await expect(dialog).toBeVisible();

    await expect(dialog.getByRole("heading", { name: "CLI launcher" })).toBeVisible();
    await expect(dialog.getByText("motion .", { exact: true })).toBeVisible();

    const web = dialog.getByRole("radio", { name: /^Web/i });
    const desktop = dialog.getByRole("radio", { name: /^Desktop/i });
    await expect(web).toBeVisible();
    await expect(desktop).toBeVisible();
    // Exactly one launch mode is selected (may be a previously saved preference).
    expect((await web.isChecked()) !== (await desktop.isChecked())).toBe(true);

    await expect(dialog.getByLabel("Web port")).toBeVisible();
    await expect(dialog.getByRole("button", { name: /Copy install hint/i })).toBeVisible();

    // Switching modes updates the checked radio (and persists via /api/settings).
    await desktop.click();
    await expect(desktop).toBeChecked({ timeout: 5_000 });
    await web.click();
    await expect(web).toBeChecked({ timeout: 5_000 });

    await dialog.getByRole("button", { name: "Done" }).click();
    await expect(dialog).toHaveCount(0);
});

test("GET /api/settings returns launch preferences", async ({ page }) => {
    await gotoApp(page);
    const res = await page.request.get("/api/settings");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.settings).toBeTruthy();
    expect(["web", "desktop"]).toContain(body.settings.launchMode);
    expect(typeof body.settings.port).toBe("number");
    expect(typeof body.path).toBe("string");
    expect(String(body.cliInstallHint || "")).toMatch(/motion|bun link/i);
});
