/**
 * Seeded temp workspace for E2E runs.
 *
 * Specs must never point at public/demo: they now perform real writes, and that
 * directory holds tracked fixtures. Playwright's global setup builds a scratch
 * workspace and the dev server is pointed at it via MOTION_WORKSPACE.
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, realpathSync } from "fs";
import { tmpdir } from "os";
import { join, dirname } from "path";

/**
 * Port for the second dev server, launched the way `motion <file.md>` launches
 * one (MOTION_AUTO_OPEN + MOTION_OPEN_FILE). Lives here rather than in
 * playwright.config.ts because importing that config from a spec re-executes
 * it inside the worker — which mints a *second* scratch workspace and makes
 * every path assertion compare two different temp directories.
 */
export const AUTO_OPEN_PORT = 3001;

/** The note the auto-open server is told to open. */
export const AUTO_OPEN_NOTE = "welcome.md";

export const SEED_FILES: Record<string, string> = {
    "welcome.md": "# Welcome\n\nA seeded note for end-to-end runs.\n",
    "getting-started.md": "# Getting started\n\nSecond seeded note.\n",
    "nested/deeper.md": "# Deeper\n\nProves recursive listing.\n",
    // Front matter must stay in Markdown view only — not WYSIWYG.
    "with-frontmatter.md": `---
title: Frontmatter Fixture
primary_keyword: "HideFromWysiwyg"
---

# Visible Heading

Body after the YAML block.
`,
    // Same shape as public/demo — the welcome document registers these as
    // tables `team` and `events` and JOINs on team.name = events.user. A
    // name/score-only fixture made that path untested and hid install failures.
    "sample-data.csv":
        "id,name,role,experience\n1,Alice,Architect,12\n2,Bob,Author,5\n3,Charlie,Developer,8\n",
    "sample-events.jsonl": [
        '{"event":"login","user":"Alice","timestamp":"2024-03-20T10:00:00Z"}',
        '{"event":"view_page","user":"Bob","timestamp":"2024-03-20T10:05:00Z"}',
        '{"event":"click_btn","user":"Alice","timestamp":"2024-03-20T10:10:00Z"}',
        "",
    ].join("\n"),
    // One scratch file per spec that writes. Specs share a workspace, so a spec
    // saving into a file another spec reads is cross-test contamination -- it
    // showed up as four sanitize specs failing only when the suite ran in order.
    "scratch-blocks.md": "# Scratch: blocks\n",
    "scratch-sanitize.md": "# Scratch: sanitize\n",
    "scratch-journeys.md": "# Scratch: journeys\n",
};

export function createWorkspace(): string {
    const root = realpathSync(mkdtempSync(join(tmpdir(), "motion-e2e-")));
    for (const [rel, body] of Object.entries(SEED_FILES)) {
        const target = join(root, rel);
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, body);
    }
    return root;
}

export function destroyWorkspace(root: string): void {
    rmSync(root, { recursive: true, force: true });
}
