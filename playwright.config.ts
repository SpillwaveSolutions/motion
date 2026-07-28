import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config for Motion's web mode.
 *
 * `webServer` boots the real Bun dev server, so a spec run is a real app run --
 * there is no separate "test build" that could drift from what ships.
 *
 * workers:1 for now. Raising it requires per-worker workspace isolation
 * (MOTION_WORKSPACE), otherwise parallel save/new-note specs race each other
 * over one shared filesystem root.
 */
export default defineConfig({
    testDir: "./e2e",
    // *.capture.spec.ts are hand-run diagnostic probes, not gates. BASELINE=1
    // opts them in; the normal suite never sees them.
    testIgnore: process.env["BASELINE"] ? [] : ["**/*.capture.spec.ts"],
    workers: 1,
    fullyParallel: false,
    forbidOnly: !!process.env["CI"],
    retries: 0,
    reporter: process.env["CI"] ? [["html"], ["list"]] : [["list"]],
    use: {
        baseURL: "http://localhost:3000",
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
    },
    projects: [
        {
            name: "chromium",
            use: {
                ...devices["Desktop Chrome"],
                // Locally: drive the already-installed Google Chrome, so a dev
                // machine needs no extra browser download. CI installs
                // Playwright's pinned Chromium and uses that instead.
                ...(process.env["CI"] ? {} : { channel: "chrome" as const }),
            },
        },
    ],
    webServer: {
        command: "bun run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env["CI"],
        timeout: 120_000,
    },
});
