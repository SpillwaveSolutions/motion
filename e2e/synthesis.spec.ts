/**
 * Workspace synthesis, end to end.
 *
 * The LLM is stubbed at the network boundary (`/api/llm`) rather than mocked in
 * code: everything above it is the real thing -- the real modules, the real
 * storage, the real filesystem -- so this proves the wiring, not the mock.
 * Stubbing also keeps the suite deterministic and free.
 */
import { test, expect, gotoApp } from "./fixtures";

/** Shape a plausible answer per stage from the prompt the app actually sends. */
async function stubLLM(page: import("@playwright/test").Page) {
    await page.route("**/api/llm", async (route) => {
        const body = route.request().postDataJSON() as { prompt?: string };
        const prompt = body?.prompt ?? "";

        let content = "# SKILL\n\nHow to work in this workspace.\n";
        if (prompt.includes("summary")) {
            content = "- covers the seeded note\n- mentions testing";
        } else if (prompt.includes("JSON")) {
            content = JSON.stringify({
                suggestedLabels: ["Seeded Notes", "Testing"],
                shouldSplit: false,
                reasoning: "the notes cohere",
            });
        } else if (prompt.includes("Table of Contents") || prompt.includes("TOC")) {
            content = "# Table of Contents\n\n- welcome.md — the entry point\n";
        }

        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ content, rawOutput: content }),
        });
    });
}

test("synthesizing a workspace writes TOC.md and SKILL.md", async ({ page }) => {
    await stubLLM(page);
    await gotoApp(page);
    await page.getByRole("button", { name: "Open Folder" }).click();
    await expect(page.getByRole("treeitem", { name: "welcome.md" })).toBeVisible();

    await page.getByRole("button", { name: "Synthesize" }).click();

    // The status region reports progress and then the result.
    const status = page.getByRole("status", { name: "Workspace synthesis" });
    await expect(status).toContainText(/Synthesized \d+ notes/, { timeout: 60_000 });
    await expect(status).toContainText("Seeded Notes");

    // Both documents exist on disk and are listed.
    await expect(page.getByRole("treeitem", { name: "TOC.md" })).toBeVisible();
    await expect(page.getByRole("treeitem", { name: "SKILL.md" })).toBeVisible();

    const toc = await page.evaluate(async () => {
        const list = (await (await fetch("/api/fs/list")).json()) as string[];
        const path = list.find((p) => p.endsWith("TOC.md"));
        return (await (await fetch(`/api/fs/read?path=${encodeURIComponent(path!)}`)).json())
            .content as string;
    });
    expect(toc).toContain("Table of Contents");
});

test("synthesis reports a readable failure instead of dying silently", async ({ page, guard }) => {
    guard.allow(/Workspace synthesis failed/);
    guard.allow(/HTTP 500/);
    guard.allow(/status of 500/);

    await page.route("**/api/llm", (route) =>
        route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({ error: "claude CLI not found" }),
        })
    );

    await gotoApp(page);
    await page.getByRole("button", { name: "Open Folder" }).click();
    await page.getByRole("button", { name: "Synthesize" }).click();

    await expect(page.getByRole("status", { name: "Workspace synthesis" })).toContainText(/Synthesis failed/, {
        timeout: 30_000,
    });
    // The message names the cause rather than a bare status code.
    await expect(page.getByRole("status", { name: "Workspace synthesis" })).toContainText(/claude CLI not found/);
});
