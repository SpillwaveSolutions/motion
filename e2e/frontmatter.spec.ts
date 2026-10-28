/**
 * YAML front matter is note metadata: WYSIWYG hides it, the Markdown view and
 * the file on disk keep it, and an edit never rewrites it.
 */
import { test, expect, gotoApp } from "./fixtures";

async function readNote(page: import("@playwright/test").Page, name: string): Promise<string> {
    return page.evaluate(async (file) => {
        const list = (await (await fetch("/api/fs/list")).json()) as string[];
        const path = list.find((p) => p.endsWith(file));
        const res = await fetch(`/api/fs/read?path=${encodeURIComponent(path!)}`);
        return (await res.json()).content as string;
    }, name);
}

test("WYSIWYG hides front matter, and the Markdown view keeps it", async ({ page }) => {
    await gotoApp(page, "/?open=scratch-frontmatter.md");
    const prose = page.locator(".ProseMirror");
    await expect(prose.getByRole("heading", { level: 1 })).toHaveText("Visible heading");
    await expect(prose).not.toContainText("title:");
    await expect(prose.locator("hr")).toHaveCount(0);

    await page.getByRole("button", { name: "Markdown", exact: true }).click();
    const source = page.getByRole("textbox", { name: "Markdown source" });
    await expect(source).toHaveValue(/^---\ntitle: Front matter scratch\ntags: \[a, b\]\n---\n\n# Visible heading/);
    await expect(page.getByRole("button", { name: "Save note" })).toHaveAttribute("title", "All changes saved");
});

test("an edit saves the body and keeps the front matter on disk", async ({ page }) => {
    await gotoApp(page, "/?open=scratch-frontmatter.md");
    await page.locator(".ProseMirror").getByText("Body text.").click();
    await page.keyboard.press("End");
    await page.keyboard.type(" Edited.");

    const write = page.waitForResponse((r) => r.url().includes("/api/fs/write") && r.request().method() === "POST");
    expect((await write).status()).toBe(200);
    const disk = await readNote(page, "scratch-frontmatter.md");
    expect(disk.startsWith("---\ntitle: Front matter scratch\ntags: [a, b]\n---\n\n# Visible heading\n")).toBe(true);
    expect(disk).toContain("Body text. Edited.");
    expect(disk).not.toContain("* * *");
});

test("front matter changed in the Markdown view survives a WYSIWYG edit", async ({ page }) => {
    await gotoApp(page, "/?open=scratch-frontmatter-source.md");
    await expect(page.locator(".ProseMirror")).toContainText("Source body.");
    await page.getByRole("button", { name: "Markdown", exact: true }).click();
    const source = page.getByRole("textbox", { name: "Markdown source" });
    const value = await source.inputValue();
    await source.fill(value.replace(/^title: .*$/m, "title: Renamed in source"));

    await page.getByRole("button", { name: "WYSIWYG" }).click();
    await page.locator(".ProseMirror").getByText("Source body.").click();
    await page.keyboard.press("End");
    await page.keyboard.type(" More.");
    await expect.poll(() => readNote(page, "scratch-frontmatter-source.md")).toContain("More.");
    const disk = await readNote(page, "scratch-frontmatter-source.md");
    expect(disk.startsWith("---\ntitle: Renamed in source\n")).toBe(true);
    expect(disk.match(/^---$/gm)?.length).toBe(2);
});
