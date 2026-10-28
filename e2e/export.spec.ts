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

test("PDF export draws a themed table with a header row and stripes", async ({ page }) => {
    await gotoApp(page, "/?open=export-table.md");
    await expect(page.locator(".ProseMirror")).toContainText("Export table");

    await page.getByRole("button", { name: "Export PDF" }).click();
    const dialog = page.getByRole("dialog", { name: "Export PDF" });
    await dialog.getByLabel("Export theme").selectOption({ label: "Clay" });
    const preview = dialog.frameLocator("iframe[title='Export preview']");
    await expect(preview.getByRole("columnheader", { name: "Name" })).toHaveCSS("background-color", "rgb(217, 119, 87)");
    await expect(preview.getByRole("cell", { name: "Ada" })).toHaveCSS("background-color", "rgb(250, 249, 245)");
    await expect(preview.getByRole("cell", { name: "Grace" })).toHaveCSS("background-color", "rgb(240, 238, 230)");
    await dialog.screenshot({ path: "/tmp/motion-preview-table-clay.png" });

    const download = page.waitForEvent("download");
    await dialog.getByRole("button", { name: "Download PDF" }).click();
    const pdfPath = await (await download).path();
    const pdf = readFileSync(pdfPath!).toString("latin1");
    expect(pdf.startsWith("%PDF")).toBe(true);
    for (const cell of ["Name", "Ada", "Margaret"]) expect(pdf).toContain(`(${cell}) Tj`);
    expect(pdf).toContain("0.85 0.47 0.34 rg");
    expect(pdf).toContain("0.94 0.93 0.9 rg");
});

test("a custom theme saves its table colors and exports with them", async ({ page }) => {
    await gotoApp(page, "/?open=export-table.md");
    await expect(page.locator(".ProseMirror")).toContainText("Export table");
    await page.getByRole("button", { name: "Themes" }).click();
    let dialog = page.getByRole("dialog", { name: "Theme settings" });
    await dialog.getByRole("button", { name: "Ice Snowstorm" }).click();
    await expect(dialog.getByLabel("Table alternate row hex")).toHaveValue("#E4EDF7");
    await expect(dialog.getByLabel("Table alternate row hex")).toBeDisabled();
    await dialog.getByRole("button", { name: "Clay" }).click();
    await expect(dialog.getByRole("heading", { name: "Tables" })).toBeVisible();
    await expect(dialog.getByLabel("Table header hex")).toHaveValue("#D97757");
    await expect(dialog.getByLabel("Table header hex")).toBeDisabled();
    await dialog.screenshot({ path: "/tmp/motion-themes-tables.png" });

    await dialog.getByRole("button", { name: "New theme" }).click();
    await dialog.getByLabel("Theme name").fill("Striped");
    await expect(dialog.getByLabel("Table alternate row hex")).toHaveValue("#F0EEE6");
    await dialog.getByLabel("Table header hex").fill("#123456");
    const save = page.waitForResponse(
        (res) => res.url().includes("/api/settings") && res.request().method() === "POST",
    );
    await dialog.getByRole("button", { name: "Save themes" }).click();
    expect((await save).ok()).toBeTruthy();

    await page.getByRole("button", { name: "Themes" }).click();
    dialog = page.getByRole("dialog", { name: "Theme settings" });
    await dialog.getByRole("button", { name: "Striped" }).last().click();
    await expect(dialog.getByLabel("Table header hex")).toHaveValue("#123456");
    await page.keyboard.press("Escape");

    // The saved color reaches the export, not only the settings file.
    await page.getByRole("button", { name: "Export PDF" }).click();
    const exportDialog = page.getByRole("dialog", { name: "Export PDF" });
    await exportDialog.getByLabel("Export theme").selectOption({ label: "Striped" });
    const preview = exportDialog.frameLocator("iframe[title='Export preview']");
    await expect(preview.getByRole("columnheader", { name: "Name" })).toHaveCSS("background-color", "rgb(18, 52, 86)");
    const download = page.waitForEvent("download");
    await exportDialog.getByRole("button", { name: "Download PDF" }).click();
    const pdf = readFileSync((await (await download).path())!).toString("latin1");
    expect(pdf).toContain("0.07 0.2 0.34 rg");
});

test("export drops YAML front matter and keeps two tables apart", async ({ page }) => {
    await gotoApp(page, "/?open=export-frontmatter.md");
    await expect(page.locator(".ProseMirror")).toContainText("Intro.");

    await page.getByRole("button", { name: "Export PDF" }).click();
    const dialog = page.getByRole("dialog", { name: "Export PDF" });
    const preview = dialog.frameLocator("iframe[title='Export preview']");
    await expect(preview.getByRole("heading", { level: 1 })).toHaveText(["Front matter note"]);
    await expect(preview.locator("body")).not.toContainText("previous:");
    await expect(preview.getByRole("table")).toHaveCount(2);
    await dialog.screenshot({ path: "/tmp/motion-preview-frontmatter.png" });

    const pdfDownload = page.waitForEvent("download");
    await dialog.getByRole("button", { name: "Download PDF" }).click();
    const pdf = readFileSync((await (await pdfDownload).path())!).toString("latin1");
    expect(pdf).toContain("(Front matter note) Tj");
    expect(pdf).not.toContain("previous:");

    await page.getByRole("button", { name: "Export Word" }).click();
    const wordDialog = page.getByRole("dialog", { name: "Export Word" });
    const wordDownload = page.waitForEvent("download");
    await wordDialog.getByRole("button", { name: "Download Word" }).click();
    const { unzipSync } = await import("fflate");
    const files = unzipSync(readFileSync((await (await wordDownload).path())!));
    const xml = new TextDecoder().decode(files["word/document.xml"]);
    expect(xml).toContain("Front matter note");
    expect(xml).not.toContain("previous:");
    expect(xml).not.toContain("</w:tbl><w:tbl>");
});
