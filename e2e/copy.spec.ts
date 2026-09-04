/**
 * Copy All writes the live note as markdown (text/plain) and rendered HTML
 * (text/html) so paste follows the destination. The OS clipboard is stubbed:
 * we assert what Motion handed the Clipboard API, not the host pasteboard.
 *
 * Accessible name stays "Copy all" (aria-label). Copied lives in
 * data-copy-state and title — assert those, not visible text (the control is icon-only).
 */
import { test, expect, gotoApp } from "./fixtures";

const CLIPBOARD_STUB = `
(() => {
  class StubClipboardItem {
    constructor(parts) {
      this._parts = parts;
      this.types = Object.keys(parts);
    }
    async getType(type) {
      return await this._parts[type];
    }
  }
  window.ClipboardItem = StubClipboardItem;
  const fake = {
    write: async (items) => {
      const out = {};
      for (const item of items) {
        for (const type of item.types) {
          out[type] = await (await item.getType(type)).text();
        }
      }
      window.__motionCopied = out;
    },
    writeText: async (text) => {
      window.__motionCopied = { "text/plain": text };
    },
  };
  try {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      writable: true,
      value: fake,
    });
  } catch (_) {}
  Object.defineProperty(Navigator.prototype, "clipboard", {
    configurable: true,
    get() { return fake; },
  });
})();
`;

test.beforeEach(async ({ page }) => {
    await page.addInitScript(CLIPBOARD_STUB);
});

async function copiedPayload(page: import("@playwright/test").Page) {
    return page.evaluate(
        () => (window as unknown as { __motionCopied: Record<string, string> }).__motionCopied
    );
}

test("Copy All is disabled until a note is selected", async ({ page }) => {
    await gotoApp(page);
    const copy = page.getByRole("button", { name: "Copy all" });
    await expect(copy).toBeVisible();
    await expect(copy).toBeDisabled();
    await expect(copy).toHaveAttribute("title", "Select a note to copy");
});

test("Copy All is enabled on the welcome note and becomes Copied", async ({ page }) => {
    await gotoApp(page, "/?open=welcome.md");
    const copy = page.getByRole("button", { name: "Copy all" });
    await expect(page.getByRole("treeitem", { name: "welcome.md" })).toHaveAttribute(
        "aria-selected",
        "true",
    );
    await expect(copy).toBeEnabled();
    await expect(page.locator(".ProseMirror")).toContainText("Welcome");

    await copy.click();
    await expect(page.getByTestId("copy-all")).toHaveAttribute("data-copy-state", "copied");

    const payload = await copiedPayload(page);
    expect(payload["text/plain"]).toContain("# Welcome");
    expect(payload["text/html"]).toMatch(/<h1/i);
    expect(payload["text/html"]).toContain("Welcome");
    expect(payload["text/html"]).not.toContain("# Welcome");
});

test("Copy All includes unsaved edits from the live buffer", async ({ page, guard }) => {
    guard.allow(/flushSync was called from inside a lifecycle method/);
    await gotoApp(page);
    await page.getByRole("button", { name: "Open Folder" }).click();
    await page.getByRole("treeitem", { name: "scratch-journeys.md" }).click();
    await expect(page.locator(".ProseMirror")).toBeVisible();

    await page.getByRole("button", { name: "Markdown" }).click();
    const source = page.getByRole("textbox", { name: "Markdown source" });
    await expect(source).toBeVisible();
    await expect(source).toHaveValue(/Scratch: journeys/);
    await source.fill("# Pasted later\n\n**bold live edit**");
    await expect(source).toHaveValue(/Pasted later/);
    await page.getByRole("button", { name: "Copy all" }).click();
    await expect(page.getByTestId("copy-all")).toHaveAttribute("data-copy-state", "copied");

    const payload = await copiedPayload(page);
    expect(payload["text/plain"]).toContain("# Pasted later");
    expect(payload["text/plain"]).toContain("**bold live edit**");
    expect(payload["text/html"]).toMatch(/<h1/i);
    expect(payload["text/html"]).toContain("Pasted later");
    expect(payload["text/html"]).toMatch(/<(strong|b)>/i);
});
