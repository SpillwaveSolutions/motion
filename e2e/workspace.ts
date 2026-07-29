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

export const SEED_FILES: Record<string, string> = {
    "welcome.md": "# Welcome\n\nA seeded note for end-to-end runs.\n",
    "getting-started.md": "# Getting started\n\nSecond seeded note.\n",
    "nested/deeper.md": "# Deeper\n\nProves recursive listing.\n",
    "sample-data.csv": "name,score\nada,10\ngrace,12\n",
    "sample-events.jsonl": '{"user":"ada","event":"login"}\n{"user":"grace","event":"edit"}\n',
    // One scratch file per spec that writes. Specs share a workspace, so a spec
    // saving into a file another spec reads is cross-test contamination -- it
    // showed up as four sanitize specs failing only when the suite ran in order.
    "scratch-blocks.md": "# Scratch: blocks\n",
    "scratch-sanitize.md": "# Scratch: sanitize\n",
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
