/**
 * Share → Gist / Notion. The real APIs are never hit: Playwright routes
 * `/api/publish/*` and the handlers always answer HTTP 200 with an envelope
 * so the fixtures.ts >=400 gate stays green on a refused token.
 */
import { test, expect, gotoApp } from "./fixtures";

const GIST_URL = "https://gist.github.com/motion-e2e/abc";
const NOTION_URL = "https://www.notion.so/motion-e2e-page";

test("Share publishes the current note to a Gist", async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem("motion.publish.githubToken", "ghp_test");
    });
    await page.route("**/api/publish/gist", async (route) => {
        const body = route.request().postDataJSON() as { filename?: string; token?: string };
        expect(body.filename).toBe("welcome.md");
        expect(body.token).toBe("ghp_test");
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ ok: true, url: GIST_URL }),
        });
    });

    await gotoApp(page, "/?open=welcome.md");
    await expect(page.locator(".ProseMirror")).toContainText("Welcome");
    await expect(page.getByRole("button", { name: "Share" })).toBeEnabled();

    await page.getByRole("button", { name: "Share" }).click();
    await page.getByRole("menuitem", { name: "Publish to Gist" }).click();

    const published = page.getByRole("status", { name: "Published" });
    await expect(published).toBeVisible();
    await expect(published.getByRole("link", { name: GIST_URL })).toBeVisible();
});

test("Share publishes the current note to Notion", async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem("motion.publish.notionToken", "ntn_test");
        localStorage.setItem(
            "motion.publish.notionParentPageId",
            "01234567-89ab-cdef-0123-456789abcdef",
        );
    });
    await page.route("**/api/publish/notion", async (route) => {
        const body = route.request().postDataJSON() as { title?: string; token?: string };
        expect(body.title).toBe("welcome");
        expect(body.token).toBe("ntn_test");
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ ok: true, url: NOTION_URL }),
        });
    });

    await gotoApp(page, "/?open=welcome.md");
    await expect(page.locator(".ProseMirror")).toContainText("Welcome");

    await page.getByRole("button", { name: "Share" }).click();
    await page.getByRole("menuitem", { name: "Publish to Notion" }).click();

    const published = page.getByRole("status", { name: "Published" });
    await expect(published).toBeVisible();
    await expect(published.getByRole("link", { name: NOTION_URL })).toBeVisible();
});

test("a missing GitHub token opens Settings instead of calling the API", async ({ page }) => {
    let gistHits = 0;
    await page.route("**/api/publish/gist", async (route) => {
        gistHits += 1;
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ ok: false, error: "should not have been called" }),
        });
    });

    await gotoApp(page, "/?open=welcome.md");
    await expect(page.getByRole("button", { name: "Share" })).toBeEnabled();
    await page.getByRole("button", { name: "Share" }).click();
    await page.getByRole("menuitem", { name: "Publish to Gist" }).click();

    await expect(page.getByRole("dialog", { name: "Publish settings" })).toBeVisible();
    expect(gistHits).toBe(0);
});

test("a refused Gist is a 200 envelope the network gate does not fail on", async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem("motion.publish.githubToken", "ghp_bad");
    });
    await page.route("**/api/publish/gist", async (route) => {
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ ok: false, error: "Bad credentials" }),
        });
    });

    await gotoApp(page, "/?open=welcome.md");
    await page.getByRole("button", { name: "Share" }).click();
    await page.getByRole("menuitem", { name: "Publish to Gist" }).click();

    const failed = page.getByRole("status", { name: "Publish failed" });
    await expect(failed).toBeVisible();
    await expect(failed).toContainText("Bad credentials");
});
