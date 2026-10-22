/**
 * Reload from disk, themed PDF/Word export, and the theme settings dialog.
 * The export dialog's iframe is the preview of the file that downloads.
 */
import { readFileSync } from "fs";
import { test, expect, gotoApp } from "./fixtures";

test("reload drops unsaved edits and restores the file", async ({ page }) => {
    await gotoApp(page, "/?open=welcome.md");
    await expect(page.locator(".ProseMirror")).toContainText("Welcome");
    await page.locator(".ProseMirror").click();
    await page.keyboard.type("ZZZ-UNSAVED ");
    await expect(page.locator(".ProseMirror")).toContainText("ZZZ-UNSAVED");

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Reload note" }).click();

    await expect(page.locator(".ProseMirror")).not.toContainText("ZZZ-UNSAVED");
    await expect(page.locator(".ProseMirror")).toContainText("Welcome");
});

test("theme settings can add a theme and both builtins preview", async ({ page }) => {
    await gotoApp(page, "/?open=welcome.md");
    await page.getByRole("button", { name: "Themes" }).click();
    const dialog = page.getByRole("dialog", { name: "Theme settings" });
    await expect(dialog.getByRole("button", { name: "Ice Snowstorm" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Clay" })).toBeVisible();

    await dialog.getByRole("button", { name: "Clay" }).click();
    await expect(dialog.getByLabel("Headings hex")).toHaveValue("#141413");
    await expect(dialog.getByLabel("Accent hex")).toHaveValue("#D97757");
    await dialog.screenshot({ path: "/tmp/motion-preview-themes.png" });

    await dialog.getByRole("button", { name: "New theme" }).click();
    await dialog.getByLabel("Theme name").fill("Harbor");
    const save = page.waitForResponse(
        (res) => res.url().includes("/api/settings") && res.request().method() === "POST",
    );
    await dialog.getByRole("button", { name: "Save themes" }).click();
    expect((await save).ok()).toBeTruthy();

    await page.getByRole("button", { name: "Themes" }).click();
    await expect(page.getByRole("dialog", { name: "Theme settings" }).getByRole("button", { name: "Harbor" })).toBeVisible();
    await page.keyboard.press("Escape");
});

test("export preview uses the theme and downloads PDF and Word", async ({ page }) => {
    await gotoApp(page, "/?open=welcome.md");
    await expect(page.locator(".ProseMirror")).toContainText("Welcome");

    await page.getByRole("button", { name: "Export PDF" }).click();
    const dialog = page.getByRole("dialog", { name: "Export PDF" });
    await dialog.getByLabel("Export theme").selectOption({ label: "Clay" });
    const preview = dialog.frameLocator("iframe[title='Export preview']");
    await expect(preview.locator("body")).toHaveCSS("background-color", "rgb(250, 249, 245)");
    await expect(preview.locator("h1").first()).toHaveCSS("color", "rgb(20, 20, 19)");
    await dialog.screenshot({ path: "/tmp/motion-preview-clay.png" });

    await dialog.getByLabel("Export theme").selectOption({ label: "Ice Snowstorm" });
    await expect(preview.locator("body")).toHaveCSS("background-color", "rgb(243, 246, 251)");
    await expect(preview.locator("h1").first()).toHaveCSS("color", "rgb(11, 31, 75)");
    await dialog.screenshot({ path: "/tmp/motion-preview-ice.png" });

    const pdfDownload = page.waitForEvent("download");
    await dialog.getByRole("button", { name: "Download PDF" }).click();
    const pdf = await pdfDownload;
    const pdfPath = await pdf.path();
    expect(pdfPath).toBeTruthy();
    const pdfBytes = readFileSync(pdfPath!);
    expect(pdfBytes.subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.suggestedFilename()).toMatch(/\.pdf$/);

    await page.getByRole("button", { name: "Export Word" }).click();
    const wordDialog = page.getByRole("dialog", { name: "Export Word" });
    await wordDialog.getByLabel("Export theme").selectOption({ label: "Clay" });
    const wordDownload = page.waitForEvent("download");
    await wordDialog.getByRole("button", { name: "Download Word" }).click();
    const word = await wordDownload;
    const wordPath = await word.path();
    const wordBytes = readFileSync(wordPath!);
    expect(wordBytes[0]).toBe(0x50);
    expect(wordBytes[1]).toBe(0x4b);
    expect(word.suggestedFilename()).toMatch(/\.docx$/);
});
