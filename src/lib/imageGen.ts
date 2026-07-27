/**
 * Image generation via the `imagen` CLI (wraps Google's Gemini Imagen API).
 * Runs Bun.spawn -- only callable from a real Bun process (the dev server or
 * a Tauri Rust command's shelled-out equivalent), never directly from
 * browser/webview-executed React code. See src/lib/imageClient.ts for the
 * browser-safe entry point that routes here through a Bun process.
 *
 * ponytail: images come back as a base64 data URI stored directly on the
 * TipTap node's `src` attribute, mirroring how DiagramGenExtension stores
 * rendered Mermaid text inline -- no workspace-relative file path, no Tauri
 * asset-protocol plumbing. Bloats the markdown file per image (~1.3x the
 * PNG's bytes as base64 text); switch to writing real files under a
 * workspace assets/ dir if that bloat becomes a real problem.
 */

import { tmpdir } from "node:os";
import { join } from "node:path";
import { unlink } from "node:fs/promises";

const DEFAULT_TIMEOUT_MS = 120_000;

export interface ImageGenResult {
    dataUri: string;
}

export async function generateImage(prompt: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<ImageGenResult> {
    const tmpPath = join(tmpdir(), `motion-imagegen-${Date.now()}-${Math.random().toString(36).slice(2)}.png`);

    let timedOut = false;
    let proc: ReturnType<typeof Bun.spawn> | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    try {
        proc = Bun.spawn(["imagen", "generate", prompt, "-o", tmpPath], {
            stdout: "pipe",
            stderr: "pipe",
        });

        timer = setTimeout(() => {
            timedOut = true;
            try {
                proc?.kill();
            } catch {
                // ignore kill errors
            }
        }, timeoutMs);

        const stderr = proc.stderr as ReadableStream<Uint8Array>;
        const [exitCode, errorOutput] = await Promise.all([
            proc.exited,
            new Response(stderr).text(),
        ]);

        if (timedOut) {
            throw new Error(`imagen CLI timed out after ${timeoutMs}ms`);
        }
        if (exitCode !== 0) {
            throw new Error(`imagen CLI failed with exit code ${exitCode}: ${errorOutput}`);
        }

        const file = Bun.file(tmpPath);
        if (!(await file.exists())) {
            throw new Error("imagen CLI reported success but produced no output file");
        }
        const bytes = await file.arrayBuffer();
        const base64 = Buffer.from(bytes).toString("base64");
        return { dataUri: `data:image/png;base64,${base64}` };
    } catch (error) {
        console.error("Error calling imagen:", error);
        throw error;
    } finally {
        if (timer) clearTimeout(timer);
        await unlink(tmpPath).catch(() => {});
    }
}
