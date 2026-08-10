import { defineConfig, devices } from "@playwright/test";
import { join } from "path";
import { createWorkspace, AUTO_OPEN_PORT, AUTO_OPEN_NOTE } from "./e2e/workspace";

// Created at config load so webServer.env can reference it. Specs perform real
// writes now, so they must never run against the tracked public/demo fixtures.
const E2E_WORKSPACE = process.env["MOTION_WORKSPACE"] ?? createWorkspace();
// Published so worker processes (forked after this module runs) see the same
// scratch root. Without it a spec that needs the path would have to import this
// config, re-run it, and create a second workspace to compare against.
process.env["MOTION_WORKSPACE"] = E2E_WORKSPACE;

// Settings live under $HOME by default, so an unredirected run rewrites the
// developer's own ~/.config/motion/settings.json -- launch mode today, zoom
// level once that ships. Redirect the whole file into the scratch workspace.
const E2E_SETTINGS = join(E2E_WORKSPACE, ".motion-settings.json");

// `motion <file.md>` boots with MOTION_AUTO_OPEN + MOTION_OPEN_FILE, which is
// the exact opposite of the cold-start empty shell every other spec relies on
// (see the comment on the bootstrap effect in src/App.tsx). It therefore gets
// its own server rather than a flag flipped on the shared one.
const AUTO_OPEN_FILE = join(E2E_WORKSPACE, AUTO_OPEN_NOTE);

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
    // Hand-run probes (not gates):
    //   *.capture.spec.ts  — BASELINE=1 re-measure / guard proof
    //   capture.spec.ts    — CAPTURE=1 UI artefact writer (docs/ui)
    // A job that "passes" without asserting is worse than no job.
    testIgnore: (() => {
        const ignore: string[] = [];
        if (!process.env["BASELINE"]) ignore.push("**/*.capture.spec.ts");
        if (!process.env["CAPTURE"]) ignore.push("**/capture.spec.ts");
        return ignore;
    })(),
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
    webServer: [
        {
            command: "bun run dev",
            url: "http://localhost:3000",
            // Never reuse a server here: an already-running dev server would be
            // pointed at someone's real workspace, not the seeded scratch one.
            reuseExistingServer: false,
            timeout: 120_000,
            env: {
                MOTION_WORKSPACE: E2E_WORKSPACE,
                MOTION_SETTINGS_FILE: E2E_SETTINGS,
            },
        },
        {
            command: "bun run dev",
            url: `http://localhost:${AUTO_OPEN_PORT}`,
            reuseExistingServer: false,
            timeout: 120_000,
            env: {
                PORT: String(AUTO_OPEN_PORT),
                MOTION_WORKSPACE: E2E_WORKSPACE,
                MOTION_SETTINGS_FILE: E2E_SETTINGS,
                MOTION_AUTO_OPEN: "1",
                MOTION_OPEN_FILE: AUTO_OPEN_FILE,
            },
        },
    ],
});
