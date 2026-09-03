/**
 * Walks the capture recipes in docs/ui/*.md and writes one screenshot per
 * documented state so a rubric can be judged against the real render.
 *
 *   CAPTURE=1 bunx playwright test e2e/capture.spec.ts
 *   CAPTURE=1 CAPTURE_OUT=/tmp/shots bunx playwright test e2e/capture.spec.ts -g sidebar
 *
 * Skipped unless CAPTURE is set: these produce artefacts, they do not assert,
 * and a CI job that "passes" without checking anything is worse than no job.
 *
 * Default output: .artifacts/screenshots/ui/ (gitignored).
 */
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { test, expect, type Page } from "@playwright/test";
import { FREEZE_KEY } from "../src/lib/useCaptureMode";

const OUT = resolve(process.env["CAPTURE_OUT"] ?? ".artifacts/screenshots/ui");

test.beforeAll(() => {
    mkdirSync(OUT, { recursive: true });
});

test.skip(!process.env["CAPTURE"], "Set CAPTURE=1 to write UI capture artefacts");

async function seedFreeze(page: Page): Promise<void> {
    await page.addInitScript((key: string) => {
        try {
            localStorage.setItem(key, "1");
        } catch {
            /* private mode */
        }
    }, FREEZE_KEY);
}

async function gotoReady(page: Page): Promise<void> {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.waitForSelector("[data-app-ready]", { timeout: 30_000 });
}

async function openWorkspace(page: Page): Promise<void> {
    await page.getByRole("button", { name: "Open Folder" }).click();
    await expect(page.getByRole("option", { name: "welcome.md" })).toBeVisible({
        timeout: 30_000,
    });
}

async function shot(page: Page, name: string, clip?: { x: number; y: number; width: number; height: number }): Promise<void> {
    await page.waitForTimeout(200);
    await page.screenshot({
        path: resolve(OUT, `${name}.png`),
        fullPage: false,
        ...(clip ? { clip } : {}),
    });
}

test.describe("docs/ui captures", () => {
    test("app-shell-01-welcome", async ({ page }) => {
        await seedFreeze(page);
        await gotoReady(page);
        await expect(page.locator(".ProseMirror")).toBeVisible();
        await shot(page, "app-shell-01-welcome");
    });

    test("app-shell-02-workspace", async ({ page }) => {
        await seedFreeze(page);
        await gotoReady(page);
        await openWorkspace(page);
        await shot(page, "app-shell-02-workspace");
    });

    test("sidebar-01-empty", async ({ page }) => {
        await seedFreeze(page);
        await gotoReady(page);
        const box = await page.locator("aside.app-sidebar").boundingBox();
        expect(box).toBeTruthy();
        await shot(page, "sidebar-01-empty", box!);
    });

    test("sidebar-02-tree", async ({ page }) => {
        await seedFreeze(page);
        await gotoReady(page);
        await openWorkspace(page);
        const box = await page.locator("aside.app-sidebar").boundingBox();
        expect(box).toBeTruthy();
        await shot(page, "sidebar-02-tree", box!);
    });

    test("sidebar-03-filter-empty", async ({ page }) => {
        await seedFreeze(page);
        await gotoReady(page);
        await openWorkspace(page);
        await page.getByLabel("Path glob").fill("zzz-nope-no-match");
        await expect(page.getByText(/No notes match glob/)).toBeVisible();
        const box = await page.locator("aside.app-sidebar").boundingBox();
        expect(box).toBeTruthy();
        await shot(page, "sidebar-03-filter-empty", box!);
    });

    test("editor-01-wysiwyg", async ({ page }) => {
        await seedFreeze(page);
        await gotoReady(page);
        await expect(page.getByRole("heading", { name: "Welcome to Motion" })).toBeVisible();
        await shot(page, "editor-01-wysiwyg");
    });

    test("editor-02-markdown", async ({ page }) => {
        await seedFreeze(page);
        await gotoReady(page);
        // Short note avoids TipTap React node-view teardown noise on the
        // built-in Welcome doc (see layout.spec view-toggle note).
        await openWorkspace(page);
        await page.getByRole("option", { name: "welcome.md" }).click();
        await page.getByRole("button", { name: "Markdown" }).click();
        await expect(page.getByRole("button", { name: "Markdown" })).toHaveClass(/active/);
        await shot(page, "editor-02-markdown");
    });

    test("editor-03-split", async ({ page }) => {
        await seedFreeze(page);
        await gotoReady(page);
        await openWorkspace(page);
        await page.getByRole("option", { name: "welcome.md" }).click();
        await page.getByRole("button", { name: "Split" }).click();
        await expect(page.getByRole("button", { name: "Split" })).toHaveClass(/active/);
        await shot(page, "editor-03-split");
    });

    test("dialogs-01-save-as", async ({ page }) => {
        await seedFreeze(page);
        await gotoReady(page);
        await openWorkspace(page);
        await page.getByRole("button", { name: "New Note" }).click();
        await expect(page.locator(".ProseMirror")).toContainText("New Note");
        await page.getByRole("button", { name: /^Save/ }).click();
        const dialog = page.getByRole("dialog", { name: /Save As/i });
        await expect(dialog).toBeVisible();
        await shot(page, "dialogs-01-save-as");
    });

    test("blocks-01-welcome-rest", async ({ page }) => {
        await seedFreeze(page);
        await gotoReady(page);
        const editor = page.locator(".ProseMirror");
        await expect(editor.locator(".dataset-block").first()).toBeVisible({ timeout: 15_000 });
        await expect(editor.locator(".query-block").first()).toBeVisible({ timeout: 15_000 });
        // Mermaid may use .mermaid-block or preview-only markup depending on render path.
        await expect(
            editor.locator(".mermaid-block, .mermaid-preview, [data-type='mermaid']").first()
        ).toBeVisible({ timeout: 15_000 });
        await shot(page, "blocks-01-welcome-rest");
    });
});
