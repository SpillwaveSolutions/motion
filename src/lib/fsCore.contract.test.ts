/**
 * Runs the canonical storage contract against the TypeScript implementation.
 *
 * The same tests/contract/storage-cases.json is run against the Rust
 * implementation by src-tauri/src/fs_core.rs. Neither side owns the file. If the
 * two implementations disagree about the jail, path resolution, listing order or
 * error classes, one of these two suites goes red.
 */
import { test, expect, describe } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync, realpathSync } from "fs";
import { tmpdir } from "os";
import { join, dirname, isAbsolute, relative, sep } from "path";
import {
    readWorkspaceFile,
    writeWorkspaceFile,
    collectFiles,
    FsError,
    MARKDOWN_EXTENSIONS,
    DATA_EXTENSIONS,
} from "./fsCore";

const contract = await Bun.file(
    new URL("../../tests/contract/storage-cases.json", import.meta.url)
).json();

interface Fixture {
    base: string;
    root: string;
    outside: string;
    cleanup: () => void;
}

function buildFixture(): Fixture {
    // realpath the temp base: on macOS /tmp is a symlink to /private/tmp, and the
    // implementation canonicalizes, so an un-resolved root would never match the
    // paths it returns.
    const base = realpathSync(mkdtempSync(join(tmpdir(), "motion-contract-")));
    const root = join(base, "ws");
    const outside = join(base, "outside");
    mkdirSync(root);
    mkdirSync(outside);

    const s = contract.setup;
    for (const [rel, body] of Object.entries(s.files as Record<string, string>)) {
        const target = join(root, rel);
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, body);
    }
    for (const [rel, body] of Object.entries(s.outside_files as Record<string, string>)) {
        writeFileSync(join(outside, rel), body);
    }
    for (const [name, target] of Object.entries(s.symlinks as Record<string, string>)) {
        symlinkSync(join(root, target), join(root, name));
    }
    // Sibling directories sharing the workspace name prefix, with bait inside.
    for (const suffix of s.sibling_dirs as string[]) {
        const sibling = root + suffix;
        mkdirSync(sibling, { recursive: true });
        writeFileSync(join(sibling, "planted.md"), "# Planted\n");
    }

    return { base, root, outside, cleanup: () => rmSync(base, { recursive: true, force: true }) };
}

/** `$ROOT` / `$OUTSIDE` in a case path expand to the fixture's real directories. */
function expand(path: string, f: Fixture): string {
    return path.replace("$OUTSIDE", f.outside).replace("$ROOT", f.root);
}

function classify(err: unknown): string {
    return err instanceof FsError ? err.code : `unexpected:${String(err)}`;
}

describe("storage contract (TypeScript implementation)", () => {
    for (const c of contract.cases as any[]) {
        test(c.name, () => {
            const f = buildFixture();
            try {
                const path = c.path ? expand(c.path, f) : "";
                const want = c.expect.result;

                const run = (): unknown => {
                    switch (c.op) {
                        case "read":
                            return readWorkspaceFile(f.root, path);
                        case "write":
                            return writeWorkspaceFile(f.root, path, c.content);
                        case "write_then_read":
                            writeWorkspaceFile(f.root, path, c.content);
                            return readWorkspaceFile(f.root, path);
                        case "list_markdown":
                        case "list_markdown_shape":
                            return collectFiles(f.root, MARKDOWN_EXTENSIONS);
                        case "list_data":
                            return collectFiles(f.root, DATA_EXTENSIONS);
                        default:
                            throw new Error(`unknown op: ${c.op}`);
                    }
                };

                if (want !== "ok") {
                    expect(() => run()).toThrow();
                    try {
                        run();
                    } catch (err) {
                        expect(classify(err)).toBe(want);
                    }
                    return;
                }

                const got = run();

                if (c.expect.content !== undefined) {
                    expect(got).toBe(c.expect.content);
                }
                if (c.expect.relative_paths !== undefined) {
                    const rels = (got as string[]).map((p) =>
                        relative(f.root, p).split(sep).join("/")
                    );
                    expect(rels).toEqual(c.expect.relative_paths);
                }
                if (c.expect.absolute) {
                    const list = got as string[];
                    expect(list.length).toBeGreaterThan(0);
                    expect(list.every((p) => isAbsolute(p))).toBe(true);
                }
            } finally {
                f.cleanup();
            }
        });
    }
});
