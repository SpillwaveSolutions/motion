/**
 * Structural gates for docs/ui rubric rows marked check:layout / check:blocks.
 *
 * These are merge blockers. Visual "agent" rows are judged from captures, not here.
 */
import { test, expect, gotoApp } from "./fixtures";

test.describe("layout", () => {
    test("grid topology", async ({ page }) => {
        await gotoApp(page);
        await page.setViewportSize({ width: 1280, height: 800 });

        const header = page.locator("header.app-header");
        const sidebar = page.locator("aside.app-sidebar");
        const main = page.locator("main.app-main");

        await expect(header).toBeVisible();
        await expect(sidebar).toBeVisible();
        await expect(main).toBeVisible();

        const h = await header.boundingBox();
        const s = await sidebar.boundingBox();
        const m = await main.boundingBox();
        expect(h && s && m).toBeTruthy();

        // Header spans the top (full width of the shell).
        expect(h!.y).toBeLessThanOrEqual(s!.y);
        expect(h!.width).toBeGreaterThan(600);

        // Sidebar left of main; tops roughly aligned under header.
        expect(s!.x).toBeLessThan(m!.x);
        expect(s!.x + s!.width).toBeLessThanOrEqual(m!.x + 2);

        // Toolbar lives inside main when editor is mounted.
        await expect(page.locator(".editor-toolbar")).toBeVisible();
    });

    test("inventory", async ({ page }) => {
        await gotoApp(page);

        await expect(page.getByRole("button", { name: "Open Folder" })).toBeEnabled();
        await expect(page.getByRole("button", { name: "New Note" })).toBeDisabled();
        await expect(page.getByRole("button", { name: "Synthesize" })).toBeDisabled();
        await expect(page.getByLabel("Search notes")).toBeDisabled();
        await expect(page.getByRole("heading", { name: "Welcome to Motion" })).toBeVisible();
        await expect(page.locator(".ProseMirror")).toBeVisible();

        // Empty sidebar guidance (no workspace yet).
        await expect(
            page.locator("aside.app-sidebar").getByText(/No folder opened|Open a folder/i)
        ).toBeVisible();

        await page.getByRole("button", { name: "Open Folder" }).click();
        await expect(page.getByRole("option", { name: "welcome.md" })).toBeVisible();
        await expect(page.getByRole("button", { name: "New Note" })).toBeEnabled();
        await expect(page.getByRole("button", { name: "Synthesize" })).toBeEnabled();
    });

    test("view toggle", async ({ page }) => {
        await gotoApp(page);
        // Mode-switch on a short seeded note. The built-in Welcome doc mounts
        // many TipTap React node views; tearing them down mid-render logs
        // flushSync warnings from @tiptap/react (not product chrome).
        await page.getByRole("button", { name: "Open Folder" }).click();
        await page.getByRole("option", { name: "welcome.md" }).click();

        const modes = ["WYSIWYG", "Markdown", "Split"] as const;
        for (const name of modes) {
            await expect(page.getByRole("button", { name })).toBeVisible();
        }

        const active = page.locator(".view-toggle-btn.active");
        await expect(active).toHaveCount(1);
        await expect(active).toHaveText("WYSIWYG");

        await page.getByRole("button", { name: "Markdown" }).click();
        await expect(page.locator(".view-toggle-btn.active")).toHaveText("Markdown");

        await page.getByRole("button", { name: "Split" }).click();
        await expect(page.locator(".view-toggle-btn.active")).toHaveText("Split");
        await expect(page.locator(".view-toggle-btn.active")).toHaveCount(1);
    });

    test("view modes switch cleanly", async ({ page }) => {
        await gotoApp(page);
        await page.getByRole("button", { name: "Open Folder" }).click();
        await page.getByRole("option", { name: "welcome.md" }).click();
        await page.getByRole("button", { name: "Markdown" }).click();
        await expect(page.getByRole("button", { name: "Markdown" })).toHaveClass(/active/);
        await page.getByRole("button", { name: "Split" }).click();
        await expect(page.getByRole("button", { name: "Split" })).toHaveClass(/active/);
        await page.getByRole("button", { name: "WYSIWYG" }).click();
        await expect(page.locator(".ProseMirror")).toBeVisible();
        // fixtures auto-assert zero console/network errors
    });

    test("sidebar controls", async ({ page }) => {
        await gotoApp(page);
        await page.getByRole("button", { name: "Open Folder" }).click();
        await expect(page.getByRole("option", { name: "welcome.md" })).toBeVisible();

        await expect(page.getByRole("toolbar", { name: "Notes view" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Tree" })).toHaveAttribute(
            "aria-pressed",
            "true"
        );
        await expect(page.getByLabel("Sort notes")).toBeVisible();
        await expect(page.getByLabel("Path glob")).toBeVisible();
        await expect(page.getByLabel("Search in file contents")).toBeVisible();
    });

    test("toolbar named", async ({ page }) => {
        await gotoApp(page);
        const toolbar = page.locator(".editor-toolbar");
        await expect(toolbar).toBeVisible();

        // Sample of icon buttons — all must have accessible names.
        for (const name of ["Bold (⌘B)", "Italic (⌘I)", "Undo (⌘Z)", "Redo (⌘⇧Z)"]) {
            await expect(toolbar.getByRole("button", { name })).toBeVisible();
        }
    });

    test("insert block buttons", async ({ page }) => {
        await gotoApp(page);
        const toolbar = page.locator(".editor-toolbar");
        for (const name of [
            "Insert Mermaid",
            "Insert Dataset",
            "Insert Query",
            "Insert AI Diagram",
            "Insert AI Image",
        ]) {
            await expect(toolbar.getByRole("button", { name })).toBeVisible();
        }
    });

    test("save-as dialog", async ({ page }) => {
        await gotoApp(page);
        await page.getByRole("button", { name: "Open Folder" }).click();
        await page.getByRole("button", { name: "New Note" }).click();
        await expect(page.locator(".ProseMirror")).toContainText("New Note");

        await page.getByRole("button", { name: /^Save/ }).click();
        const dialog = page.getByRole("dialog", { name: /Save As/i });
        await expect(dialog).toBeVisible();
        await expect(dialog.getByLabel("File name")).toBeVisible();
        await expect(dialog.getByRole("button", { name: "Cancel" })).toBeVisible();
        await expect(dialog.getByRole("button", { name: /^Save$/ })).toBeVisible();

        await dialog.getByRole("button", { name: "Cancel" }).click();
        await expect(dialog).toHaveCount(0);
    });

    /**
     * The deterministic rows of docs/ui/dialogs.md § Unsaved Changes. Outcome
     * behaviour lives in e2e/unsaved-guard.spec.ts; this is the inventory and
     * addressability contract the wireframe is judged against.
     */
    test("unsaved dialog", async ({ page }) => {
        await gotoApp(page);
        await page.getByRole("button", { name: "Open Folder" }).click();
        await page.getByRole("option", { name: "scratch-unsaved.md" }).click();
        await expect(page.locator(".ProseMirror")).toContainText("Scratch");

        // A clean buffer must not raise it at all.
        await page.getByRole("option", { name: "getting-started.md" }).click();
        await expect(page.getByRole("dialog", { name: /Unsaved Changes/i })).toHaveCount(0);

        await page.getByRole("option", { name: "scratch-unsaved.md" }).click();
        await page.locator(".ProseMirror").click();
        await page.keyboard.press("End");
        await page.keyboard.type(" LAYOUT-EDIT");

        await page.getByRole("option", { name: "getting-started.md" }).click();
        const dialog = page.getByRole("dialog", { name: /Unsaved Changes/i });
        await expect(dialog).toBeVisible();
        await expect(dialog).toHaveAttribute("aria-modal", "true");
        for (const name of ["Save", "Discard", "Cancel"]) {
            await expect(dialog.getByRole("button", { name, exact: true })).toBeVisible();
        }

        // Cancel is non-destructive: selection stays put.
        await dialog.getByRole("button", { name: "Cancel" }).click();
        await expect(dialog).toHaveCount(0);
        await expect(page.getByRole("option", { name: "scratch-unsaved.md" })).toHaveAttribute(
            "aria-selected",
            "true"
        );

        // Leave the workspace clean for the next spec.
        await page.getByRole("option", { name: "getting-started.md" }).click();
        await page.getByRole("dialog", { name: /Unsaved Changes/i })
            .getByRole("button", { name: "Discard" })
            .click();
    });

    test("no chrome control outside viewport at 1280x800", async ({ page }) => {
        await gotoApp(page);
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.getByRole("button", { name: "Open Folder" }).click();
        await expect(page.getByRole("option", { name: "welcome.md" })).toBeVisible();

        // Chrome only — long note bodies legitimately overflow inside main's
        // scrollport. Header + sidebar controls must stay in view.
        const outside = await page.evaluate(() => {
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const roots = [
                document.querySelector("header.app-header"),
                document.querySelector("aside.app-sidebar"),
            ].filter(Boolean) as HTMLElement[];
            const bad: string[] = [];
            for (const root of roots) {
                const els = [
                    ...root.querySelectorAll<HTMLElement>(
                        "button, a[href], input, select, textarea, [role='button'], [role='option']"
                    ),
                ];
                for (const el of els) {
                    const r = el.getBoundingClientRect();
                    if (r.width === 0 || r.height === 0) continue;
                    const style = getComputedStyle(el);
                    if (style.visibility === "hidden" || style.display === "none") continue;
                    // Sidebar list may scroll; allow if inside a scrollport.
                    if (r.right > vw + 2 || r.bottom > vh + 2 || r.left < -2 || r.top < -2) {
                        let scrollable = false;
                        for (let p: HTMLElement | null = el; p && p !== root.parentElement; p = p.parentElement) {
                            const cs = getComputedStyle(p);
                            if (
                                (cs.overflowY === "auto" || cs.overflowY === "scroll") &&
                                p.scrollHeight > p.clientHeight + 1
                            ) {
                                scrollable = true;
                                break;
                            }
                        }
                        if (!scrollable) {
                            const label =
                                el.getAttribute("aria-label") ||
                                el.textContent?.trim().slice(0, 40) ||
                                el.tagName;
                            bad.push(`${label} @ ${Math.round(r.left)},${Math.round(r.top)}`);
                        }
                    }
                }
            }
            return bad.slice(0, 8);
        });

        expect(outside, `chrome controls outside viewport:\n  ${outside.join("\n  ")}`).toEqual([]);
    });
});

test.describe("blocks", () => {
    test("welcome node views", async ({ page }) => {
        await gotoApp(page);
        const editor = page.locator(".ProseMirror");
        await expect(editor).toBeVisible();

        for (const [name, selector] of [
            ["mermaid", ".mermaid-block, [data-type='mermaid'], .mermaid-preview"],
            ["dataset", ".dataset-block"],
            ["query", ".query-block"],
        ] as const) {
            await expect(
                editor.locator(selector).first(),
                `${name} should render as a node view on welcome`
            ).toBeVisible({ timeout: 15_000 });
        }
    });
});
