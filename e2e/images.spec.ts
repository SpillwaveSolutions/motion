/**
 * Markdown images: a relative `![alt](path)` shows the file from the note's
 * folder, and an edit saves the image link back unchanged.
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

test("a relative image link shows the image from the note's folder", async ({ page }) => {
    await gotoApp(page, "/?open=img-notes/view.md");
    const image = page.locator(".ProseMirror").getByRole("img", { name: "Context diagram" });
    await expect(image).toBeVisible();
    await expect(image).toHaveAttribute("src", /^blob:/);
    await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(2);
    await expect(page.getByRole("button", { name: "Save note" })).toHaveAttribute("title", "All changes saved");
});

test("an edit keeps the image link in the saved markdown", async ({ page }) => {
    await gotoApp(page, "/?open=img-notes/scratch-edit.md");
    const prose = page.locator(".ProseMirror");
    await expect(prose.getByRole("img", { name: "Context diagram" })).toBeVisible();
    await prose.getByText("Outro.").click();
    await page.keyboard.press("End");
    await page.keyboard.type(" Edited.");

    await expect.poll(() => readNote(page, "img-notes/scratch-edit.md")).toContain("Outro. Edited.");
    const disk = await readNote(page, "img-notes/scratch-edit.md");
    expect(disk).toContain("![Context diagram](images/context.png)");
    expect(disk).not.toContain("blob:");
});

test("a missing image shows as missing and keeps its link", async ({ page, guard }) => {
    // The note's folder, then the workspace root: two 404s, each also logged by the browser.
    guard.allow(/HTTP 404: GET .*\/api\/fs\/image\?path=.*gone\.png/);
    guard.allow(/Failed to load resource: the server responded with a status of 404/);
    await gotoApp(page, "/?open=img-notes/missing.md");
    const image = page.locator(".ProseMirror").getByRole("img", { name: "Gone" });
    await expect(image).toHaveClass(/note-image-missing/);
    await expect(image).toHaveAttribute("title", "Image not found: images/gone.png");

    await page.getByRole("button", { name: "Markdown", exact: true }).click();
    await expect(page.getByRole("textbox", { name: "Markdown source" })).toHaveValue(/!\[Gone\]\(images\/gone\.png\)/);
});

test("the Markdown view does not make the browser fetch the raw image path", async ({ page }) => {
    await gotoApp(page, "/?open=img-notes/view.md");
    await expect(page.locator(".ProseMirror").getByRole("img", { name: "Context diagram" })).toBeVisible();
    const stray: string[] = [];
    page.on("request", (req) => {
        if (new URL(req.url()).pathname === "/images/context.png") stray.push(req.url());
    });
    await page.getByRole("button", { name: "Markdown", exact: true }).click();
    await expect(page.getByRole("textbox", { name: "Markdown source" })).toHaveValue(/!\[Context diagram\]\(images\/context\.png\)/);
    await page.getByRole("button", { name: "WYSIWYG" }).click();
    await expect(page.locator(".ProseMirror").getByRole("img", { name: "Context diagram" })).toHaveAttribute("src", /^blob:/);
    expect(stray).toEqual([]);
});
