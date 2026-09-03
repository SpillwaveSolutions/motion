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
    const note = page.getByRole("treeitem", { name });
    await expect(note).toBeVisible();
    await note.click();
    await expect(page.locator(".ProseMirror")).toBeVisible();
}

test("lists the seeded workspace, including nested files", async ({ page }) => {
    await gotoApp(page);
    await page.getByRole("button", { name: "Open Folder" }).click();

    await expect(page.getByRole("treeitem", { name: "welcome.md" })).toBeVisible();
    await expect(page.getByRole("treeitem", { name: "getting-started.md" })).toBeVisible();
    // Recursive listing: this one lives in nested/.
    await expect(page.getByRole("treeitem", { name: "deeper.md" })).toBeVisible();
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
    await page.getByRole("button", { name: "Save note" }).click();
    expect((await write).status()).toBe(200);

    await gotoApp(page);
    await openNote(page, "welcome.md");
    await expect(page.locator(".ProseMirror")).toContainText(marker);
});

test("a new note is created, listed, and opens without error", async ({ page }) => {
    // B2: New Note used to write to a no-op backend, then the editor fetched the
    // file that was never created. The dev server answered that miss with
    // 200 + index.html, so the note "opened" showing a page of HTML.
    await gotoApp(page);
    await page.getByRole("button", { name: "Open Folder" }).click();

    // handleNewNote is async, so the click resolves before the file exists.
    // Wait on the write itself rather than on a redraw.
    const write = page.waitForResponse(
        (r) => r.url().includes("/api/fs/write") && r.request().method() === "POST"
    );
    await page.getByRole("button", { name: "New Note" }).click();
    expect((await write).status()).toBe(200);

    const field = page.getByRole("textbox", { name: "Rename note" });
    await expect(field).toBeVisible();
    await field.press("Escape");

    const created = page.getByRole("treeitem", { name: /^untitled-/ });
    await expect(created).toBeVisible();
    await expect(created).toHaveAttribute("aria-selected", "true");
    await expect(page.locator(".ProseMirror")).toContainText("New Note");

    // The guard fixture fails this test on any 404 or console error, which is
    // exactly what the old behaviour produced.
});

test("a new note can be edited, saved, and reloaded with content intact", async ({ page }) => {
    // Create only wrote the stub; the human path is create → type → Save →
    // come back later. That path was untested, and Save was icon-only so people
    // could not find it. This locks the full journey.
    const marker = `newnote-persist-${Date.now()}`;

    await gotoApp(page);
    await page.getByRole("button", { name: "Open Folder" }).click();

    const createWrite = page.waitForResponse(
        (r) => r.url().includes("/api/fs/write") && r.request().method() === "POST"
    );
    await page.getByRole("button", { name: "New Note" }).click();
    expect((await createWrite).status()).toBe(200);

    const field = page.getByRole("textbox", { name: "Rename note" });
    await expect(field).toBeVisible();
    await field.press("Escape");

    // Shared workspace may already contain untitled notes from earlier specs;
    // pin the one this click just selected.
    const created = page.getByRole("treeitem", { name: /^untitled-/, selected: true });
    await expect(created).toBeVisible();
    const basename = ((await created.textContent()) ?? "").trim();
    expect(basename).toMatch(/^untitled-.*\.md$/);

    const editor = page.locator(".ProseMirror");
    await expect(editor).toContainText("New Note");
    await editor.click();
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await page.keyboard.type(marker);

    // Visible labeled Save (not icon-only). Accessible name still matches /^Save/.
    const saveBtn = page.getByRole("button", { name: "Save note" });
    await expect(saveBtn).toBeVisible();
    await expect(saveBtn).toContainText("Save");

    const saveWrite = page.waitForResponse(
        (r) => r.url().includes("/api/fs/write") && r.request().method() === "POST"
    );
    await saveBtn.click();
    expect((await saveWrite).status()).toBe(200);
    await expect(page.locator(".save-status")).toContainText(/Saved/, { timeout: 5_000 });

    // Full reload — proves the bytes are on disk, not only in React state.
    await gotoApp(page);
    await page.getByRole("button", { name: "Open Folder" }).click();
    await page.getByRole("treeitem", { name: basename }).click();
    await expect(page.locator(".ProseMirror")).toContainText(marker, { timeout: 15_000 });
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
    await page.getByRole("button", { name: "Save note" }).click();
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
