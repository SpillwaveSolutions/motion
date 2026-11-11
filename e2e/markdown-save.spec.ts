/**
 * A save writes the markdown that people write: `- item` lists, `1. item`
 * lists, `## 1. Title` headings, and `snake_case` words come back as is.
 */
import { test, expect, gotoApp } from "./fixtures";

const NOTE =
    "# Format\n\n## 1. Where\n\n- one\n- two\n  - nested\n- three\n\n1. first\n2. second\n\nStatus: awaiting_approval.\n\nOutro.\n";

async function readNote(page: import("@playwright/test").Page, name: string): Promise<string> {
    return page.evaluate(async (file) => {
        const list = (await (await fetch("/api/fs/list")).json()) as string[];
        const path = list.find((p) => p.endsWith(file));
        const res = await fetch(`/api/fs/read?path=${encodeURIComponent(path!)}`);
        return (await res.json()).content as string;
    }, name);
}

test("an edit changes only the edited line in the saved markdown", async ({ page }) => {
    await gotoApp(page, "/?open=scratch-format.md");
    const prose = page.locator(".ProseMirror");
    await expect(prose.getByRole("heading", { level: 2 })).toHaveText("1. Where");
    await expect(prose.getByRole("listitem")).toHaveCount(6);

    await prose.getByText("Outro.").click();
    await page.keyboard.press("End");
    await page.keyboard.type(" Edited.");

    await expect.poll(() => readNote(page, "scratch-format.md")).toContain("Outro. Edited.");
    expect(await readNote(page, "scratch-format.md")).toBe(NOTE.replace("Outro.", "Outro. Edited."));
});

test("the Markdown view shows the lists and the heading as written", async ({ page }) => {
    await gotoApp(page, "/?open=scratch-format.md");
    await expect(page.locator(".ProseMirror").getByRole("heading", { level: 2 })).toBeVisible();
    await page.getByRole("button", { name: "Markdown", exact: true }).click();
    const source = page.getByRole("textbox", { name: "Markdown source" });
    await expect(source).toHaveValue(/## 1\. Where\n\n- one\n- two\n  - nested\n- three\n\n1\. first\n2\. second\n/);
    await expect(page.getByRole("button", { name: "Save note" })).toHaveAttribute("title", "All changes saved");
});
