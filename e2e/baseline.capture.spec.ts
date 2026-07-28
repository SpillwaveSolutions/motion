/**
 * Baseline probe -- NOT part of the suite (excluded by the .capture.ts name).
 *
 * Run it by hand to see what a cold load actually emits before tightening the
 * console/network gate:
 *
 *     bunx playwright test e2e/baseline.capture.ts --config playwright.config.ts
 *
 * The welcome document mounts DuckDB-WASM, Mermaid and the Dataset/Query blocks
 * immediately, so "zero console output" was never a safe assumption. Measure,
 * then gate.
 */
import { test } from "@playwright/test";

test("capture cold-load console and network baseline", async ({ page }) => {
    const console_: string[] = [];
    const failed: string[] = [];
    const badStatus: string[] = [];

    page.on("console", (m) => console_.push(`[${m.type()}] ${m.text()}`));
    page.on("requestfailed", (r) =>
        failed.push(`${r.method()} ${r.url()} -- ${r.failure()?.errorText ?? "?"}`)
    );
    page.on("response", (r) => {
        if (r.status() >= 400) badStatus.push(`${r.status()} ${r.url()}`);
    });

    await page.goto("/");
    await page.waitForSelector("[data-app-ready]", { timeout: 30_000 });
    await page.waitForTimeout(5_000); // let async block mounts settle

    console.log("\n===== CONSOLE =====");
    for (const l of console_) console.log(l);
    console.log("\n===== REQUESTFAILED =====");
    for (const l of failed) console.log(l);
    console.log("\n===== STATUS >= 400 =====");
    for (const l of badStatus) console.log(l);
    console.log("\n===== END BASELINE =====\n");
});
