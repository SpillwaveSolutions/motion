/**
 * The gate every E2E spec inherits.
 *
 * Import `test` from here, never from "@playwright/test" directly -- these
 * checks are automatic (`auto: true`) so a spec cannot forget them.
 *
 * A test fails if, during its run, the page produced any of:
 *   - a console message of type `error`
 *   - an uncaught page exception
 *   - a request that failed at the transport level
 *   - a response with status >= 400
 *
 * Why all four, and not just the first: Playwright's `requestfailed` event does
 * NOT fire for HTTP 404 or 500 -- those are *successful* requests that happen to
 * carry an error status. A 404 is precisely the signature of bug B2 (New Note
 * creates a file the editor then cannot read), so a gate watching only
 * `requestfailed` would sail straight past the bug it exists to catch.
 *
 * Warnings are recorded but never fatal: `WebStorage` warns on construction by
 * design, and warning-level noise is not a defect signal.
 *
 * Baseline as measured on a cold load (see baseline.capture.spec.ts): zero
 * errors, zero failed requests, zero >=400 responses. The gate is therefore
 * strict by default. If it goes red, something regressed -- do not loosen it
 * without re-measuring.
 */
import { test as base, expect } from "@playwright/test";

class PageGuard {
    readonly violations: string[] = [];
    readonly warnings: string[] = [];
    private allowed: RegExp[] = [];

    /**
     * Opt a single test out of one expected violation -- e.g. a spec that
     * deliberately drives an error path. Scope it as tightly as possible; a
     * bare /./ defeats the gate.
     */
    allow(pattern: RegExp): void {
        this.allowed.push(pattern);
    }

    record(violation: string): void {
        this.violations.push(violation);
    }

    unexpected(): string[] {
        return this.violations.filter((v) => !this.allowed.some((p) => p.test(v)));
    }
}

export const test = base.extend<{ guard: PageGuard }>({
    guard: [
        async ({ page }, use) => {
            const guard = new PageGuard();

            page.on("console", (msg) => {
                if (msg.type() === "error") {
                    guard.record(`console.error: ${msg.text()}`);
                } else if (msg.type() === "warning") {
                    guard.warnings.push(msg.text());
                }
            });
            page.on("pageerror", (err) => {
                guard.record(`uncaught exception: ${err.message}`);
            });
            page.on("requestfailed", (req) => {
                guard.record(
                    `request failed: ${req.method()} ${req.url()} -- ${req.failure()?.errorText ?? "unknown"}`
                );
            });
            page.on("response", (res) => {
                if (res.status() >= 400) {
                    guard.record(`HTTP ${res.status()}: ${res.request().method()} ${res.url()}`);
                }
            });

            await use(guard);

            const unexpected = guard.unexpected();
            expect(
                unexpected,
                `Page produced ${unexpected.length} unexpected error(s):\n  ` +
                    unexpected.join("\n  ")
            ).toEqual([]);
        },
        { auto: true },
    ],
});

export { expect } from "@playwright/test";

/** Navigate and wait for React to have actually rendered, not merely parsed. */
export async function gotoApp(page: import("@playwright/test").Page): Promise<void> {
    await page.goto("/");
    await page.waitForSelector("[data-app-ready]", { timeout: 30_000 });
}
