/**
 * The specs that were structurally impossible before Phase 1.
 *
 * Under the old WebStorage these could not have failed: `writeFile` was a
 * console.warn that reported success, so "save then reload and check the edit
 * survived" would have passed against a backend that never wrote anything.
 * Now the browser talks to a real filesystem through /api/fs/*, so a broken save
 * is a red test.
 */
import { test, expect, gotoApp } from "./fixtures";

/** Open a seeded note by its accessible name and wait for it to render. */
async function openNote(page: import("@playwright/test").Page, name: string) {
    await page.getByRole("button", { name: "Open Folder" }).click();
    const note = page.getByRole("option", { name });
    await expect(note).toBeVisible();
    await note.click();
    await expect(page.locator(".ProseMirror")).toBeVisible();
}

test("lists the seeded workspace, including nested files", async ({ page }) => {
    await gotoApp(page);
    await page.getByRole("button", { name: "Open Folder" }).click();

    await expect(page.getByRole("option", { name: "welcome.md" })).toBeVisible();
    await expect(page.getByRole("option", { name: "getting-started.md" })).toBeVisible();
    // Tree mode collapses folders by default — Flat lists every recursive note.
    await page.getByRole("button", { name: "Flat" }).click();
    await expect(page.getByRole("option", { name: "deeper.md" })).toBeVisible();
});

test("an edit survives save and reload", async ({ page }) => {
    const marker = `persisted-${Date.now()}`;

    await gotoApp(page);
    await openNote(page, "welcome.md");

    const editor = page.locator(".ProseMirror");
    await editor.click();
    await page.keyboard.press("End");
    await page.keyboard.type(` ${marker}`);

    // Assert on the write actually reaching the server, not on a timeout.
    const write = page.waitForResponse(
        (r) => r.url().includes("/api/fs/write") && r.request().method() === "POST"
    );
    await page.getByRole("button", { name: /^Save/ }).click();
    expect((await write).status()).toBe(200);

    await gotoApp(page);
    await openNote(page, "welcome.md");
    await expect(page.locator(".ProseMirror")).toContainText(marker);
});

test("a new note is Untitled until Save names it from the document title", async ({ page }) => {
    // macOS-style: New Note is in memory only. First Save opens Save As with a
    // title-derived default (New Note → new-note.md).
    await gotoApp(page);
    await page.getByRole("button", { name: "Open Folder" }).click();

    await page.getByRole("button", { name: "New Note" }).click();
    await expect(page.locator(".ProseMirror")).toContainText("New Note");
    await expect(page.getByRole("button", { name: /Untitled/i })).toBeVisible();

    // Not on disk yet — no sidebar entry until Save.
    await expect(page.getByRole("option", { name: "new-note.md" })).toHaveCount(0);

    const write = page.waitForResponse(
        (r) => r.url().includes("/api/fs/write") && r.request().method() === "POST"
    );
    await page.getByRole("button", { name: /^Save/ }).click();

    const dialog = page.getByRole("dialog", { name: /Save As/i });
    await expect(dialog).toBeVisible();
    const nameField = dialog.getByLabel("File name");
    await expect(nameField).toHaveValue("new-note.md");
    await dialog.getByRole("button", { name: /^Save$/ }).click();
    expect((await write).status()).toBe(200);

    await expect(page.getByRole("option", { name: "new-note.md" })).toBeVisible();
    await expect(page.getByRole("option", { name: "new-note.md" })).toHaveAttribute(
        "aria-selected",
        "true"
    );
});

test("a new note can be edited, saved under a chosen name, and reloaded", async ({ page }) => {
    const marker = `newnote-persist-${Date.now()}`;
    const filename = `persist-${Date.now()}.md`;

    await gotoApp(page);
    await page.getByRole("button", { name: "Open Folder" }).click();
    await page.getByRole("button", { name: "New Note" }).click();

    const editor = page.locator(".ProseMirror");
    await expect(editor).toContainText("New Note");
    await editor.click();
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await page.keyboard.type(marker);

    const saveWrite = page.waitForResponse(
        (r) => r.url().includes("/api/fs/write") && r.request().method() === "POST"
    );
    await page.getByRole("button", { name: /^Save/ }).click();

    const dialog = page.getByRole("dialog", { name: /Save As/i });
    await dialog.getByLabel("File name").fill(filename);
    await dialog.getByRole("button", { name: /^Save$/ }).click();
    expect((await saveWrite).status()).toBe(200);
    await expect(page.locator(".save-status")).toContainText(/Saved/, { timeout: 5_000 });

    await gotoApp(page);
    await page.getByRole("button", { name: "Open Folder" }).click();
    await page.getByRole("option", { name: filename }).click();
    await expect(page.locator(".ProseMirror")).toContainText(marker, { timeout: 15_000 });
});

test("saving a new note over an existing name asks before replacing", async ({ page }) => {
    await gotoApp(page);
    await page.getByRole("button", { name: "Open Folder" }).click();
    await page.getByRole("button", { name: "New Note" }).click();

    page.once("dialog", async (d) => {
        expect(d.message()).toMatch(/already exists/i);
        await d.dismiss();
    });

    await page.getByRole("button", { name: /^Save/ }).click();
    const dialog = page.getByRole("dialog", { name: /Save As/i });
    await dialog.getByLabel("File name").fill("welcome.md");
    await dialog.getByRole("button", { name: /^Save$/ }).click();

    // Dismissed replace → welcome.md content on disk unchanged; still Untitled.
    await expect(page.getByRole("button", { name: /Untitled/i })).toBeVisible();
    const content = await page.evaluate(async () => {
        const res = await fetch("/api/fs/list");
        const list = (await res.json()) as string[];
        const welcome = list.find((p) => p.endsWith("welcome.md"))!;
        const read = await fetch(`/api/fs/read?path=${encodeURIComponent(welcome)}`);
        return (await read.json()).content as string;
    });
    expect(content).toMatch(/Welcome/i);
    expect(content).not.toMatch(/^# New Note\s*$/m);
});

test("writes land on disk where the next read can find them", async ({ page }) => {
    const marker = `roundtrip-${Date.now()}`;

    await gotoApp(page);
    await openNote(page, "getting-started.md");

    const editor = page.locator(".ProseMirror");
    await editor.click();
    await page.keyboard.press("End");
    await page.keyboard.type(` ${marker}`);

    const write = page.waitForResponse((r) => r.url().includes("/api/fs/write"));
    await page.getByRole("button", { name: /^Save/ }).click();
    await write;

    // Read it straight back through the API, bypassing the editor entirely --
    // proves the bytes are on disk, not merely in React state.
    const listed = await page.evaluate(async () => {
        const res = await fetch("/api/fs/list");
        return (await res.json()) as string[];
    });
    const target = listed.find((p) => p.endsWith("getting-started.md"));
    expect(target).toBeDefined();

    const content = await page.evaluate(async (path) => {
        const res = await fetch(`/api/fs/read?path=${encodeURIComponent(path)}`);
        return (await res.json()).content as string;
    }, target as string);

    expect(content).toContain(marker);
});

test("the filesystem API refuses a real file outside the workspace", async ({ page, guard }) => {
    // Refusal is the correct answer, so let it past the network gate.
    guard.allow(/HTTP 403/);
    guard.allow(/status of 403/);
    await gotoApp(page);

    // An absolute path to a file that genuinely exists outside the workspace.
    // A traversal like ../../../etc/passwd would be refused too, but as
    // not-found -- it lands on a path that does not exist, so it never reaches
    // the containment check. This case exercises the jail itself.
    const result = await page.evaluate(async () => {
        const res = await fetch(`/api/fs/read?path=${encodeURIComponent("/etc/passwd")}`);
        return { status: res.status, body: await res.text() };
    });

    expect(result.status).toBe(403);
    expect(result.body).not.toContain("root:");
});
