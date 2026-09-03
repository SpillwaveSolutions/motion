/**
 * YAML front matter is Markdown-only: hidden in WYSIWYG, present in source.
 */
import { test, expect, gotoApp } from "./fixtures";

test("WYSIWYG hides front matter; Markdown view keeps it", async ({ page }) => {
    await gotoApp(page);
    await page.getByRole("button", { name: "Open Folder" }).click();
    await expect(page.getByRole("option", { name: "with-frontmatter.md" })).toBeVisible();
    await page.getByRole("option", { name: "with-frontmatter.md" }).click();

    // WYSIWYG (default): body heading only — not YAML keys or fence noise.
    const prose = page.locator(".ProseMirror");
    await expect(prose).toContainText("Visible Heading");
    await expect(prose).toContainText("Body after the YAML block");
    await expect(prose).not.toContainText("primary_keyword");
    await expect(prose).not.toContainText("HideFromWysiwyg");
    await expect(prose).not.toContainText("title: Frontmatter Fixture");

    // Markdown source still has the full front matter block.
    await page.getByRole("button", { name: "Markdown", exact: true }).click();
    const source = page.getByLabel("Markdown source");
    await expect(source).toContainText("---");
    await expect(source).toContainText("primary_keyword");
    await expect(source).toContainText("HideFromWysiwyg");
    await expect(source).toContainText("# Visible Heading");
});
