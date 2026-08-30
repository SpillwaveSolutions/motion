/**
 * Workspace filesystem core -- the browser-mode counterpart to src-tauri/src/fs_core.rs.
 *
 * Pure in the sense that matters for testing: no server, no listener, no
 * module-level side effects. `src/server.ts` starts a build, a watcher and a
 * socket at import time, so nothing reachable through it can be unit-tested;
 * these functions are the part that actually needs the tests.
 *
 * The two implementations are held together by tests/contract/storage-cases.json,
 * which both this file and fs_core.rs are run against. If they drift, the build
 * goes red -- which is the point, because they have already drifted seven ways
 * once.
 *
 * NOT imported by the browser bundle: this runs in the Bun dev-server process.
 */
import {
    existsSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    realpathSync,
    statSync,
    writeFileSync,
} from "fs";
import { dirname, isAbsolute, join, relative, resolve, basename } from "path";

export type FsErrorCode = "denied" | "not-found" | "not-a-directory";

export class FsError extends Error {
    constructor(readonly code: FsErrorCode, message: string) {
        super(message);
        this.name = "FsError";
    }
}

/**
 * Component-aware containment.
 *
 * Deliberately NOT `candidate.startsWith(root)`: "/x/ws" is a string prefix of
 * "/x/ws-evil", so the naive check hands out a sibling directory. path.relative
 * compares path components, matching Rust's Path::starts_with. The Rust side
 * pins this same case in
 * tests::rejects_a_sibling_directory_sharing_the_workspace_prefix.
 *
 * The root itself counts as inside -- writeWorkspaceFile checks a file's parent,
 * which is legitimately the root for a top-level note.
 */
export function isInsideWorkspace(root: string, candidate: string): boolean {
    const rel = relative(root, candidate);
    if (rel === "") return true;
    return !rel.startsWith("..") && !isAbsolute(rel);
}

/** Resolve an existing path to its real location, following symlinks. */
function realOrThrow(path: string): string {
    try {
        return realpathSync(path);
    } catch {
        throw new FsError("not-found", `No such file or directory: ${path}`);
    }
}

/**
 * Turn a caller-supplied path into a canonical absolute path inside `root`,
 * or throw.
 *
 * A relative path is resolved against the workspace root, NOT the process
 * working directory. That is what makes a document portable between the desktop
 * app and the browser: a block storing `source: data/sales.csv` means the same
 * file in both, and `resolve_workspace_path` in fs_core.rs does the same thing.
 *
 * A path that does not exist yet (a new note) has its PARENT canonicalized and
 * the filename joined on, so a symlinked parent cannot be used to escape.
 */
export function resolveInWorkspace(root: string, requested: string): string {
    const rootReal = realOrThrow(root);
    const absolute = isAbsolute(requested) ? requested : join(rootReal, requested);

    let resolved: string;
    if (existsSync(absolute)) {
        resolved = realOrThrow(absolute);
    } else {
        const parent = dirname(resolve(absolute));
        const parentReal = realOrThrow(parent);
        resolved = join(parentReal, basename(absolute));
    }

    if (!isInsideWorkspace(rootReal, resolved)) {
        throw new FsError("denied", "Access denied: path is outside the opened workspace");
    }
    return resolved;
}

function assertDirectory(path: string): string {
    const real = realOrThrow(path);
    if (!statSync(real).isDirectory()) {
        throw new FsError("not-a-directory", `Not a directory: ${path}`);
    }
    return real;
}

/**
 * Recursive extension-filtered walk. Mirrors collect_files_with_extensions in
 * fs_core.rs: dotdirs skipped, results sorted, absolute paths returned.
 */
export function collectFiles(root: string, extensions: readonly string[]): string[] {
    const rootReal = assertDirectory(root);
    const out: string[] = [];

    const walk = (dir: string): void => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const full = join(dir, entry.name);
            if (entry.isDirectory()) {
                if (entry.name.startsWith(".")) continue;
                walk(full);
            } else if (entry.isFile()) {
                const dot = entry.name.lastIndexOf(".");
                if (dot <= 0) continue;
                const ext = entry.name.slice(dot + 1).toLowerCase();
                if (extensions.includes(ext)) out.push(full);
            }
        }
    };

    walk(rootReal);
    out.sort();
    return out;
}

export const MARKDOWN_EXTENSIONS = ["md", "markdown", "mdown", "mkd", "mdx"] as const;
export const DATA_EXTENSIONS = ["csv", "json", "jsonl"] as const;

export function readWorkspaceFile(root: string, requested: string): string {
    const path = resolveInWorkspace(root, requested);
    if (!existsSync(path)) {
        throw new FsError("not-found", `No such file: ${requested}`);
    }
    return readFileSync(path, "utf8");
}

export function writeWorkspaceFile(root: string, requested: string, content: string): void {
    const path = resolveInWorkspace(root, requested);
    // The parent must be inside the workspace too, matching write_file's second
    // jail check -- otherwise a symlinked directory could take the write out.
    const parent = dirname(path);
    if (!isInsideWorkspace(realOrThrow(root), parent)) {
        throw new FsError("denied", "Access denied: path is outside the opened workspace");
    }
    if (!existsSync(parent)) {
        mkdirSync(parent, { recursive: true });
    }
    writeFileSync(path, content, "utf8");
}

/** Absolute path -> path relative to the workspace root, for portable storage. */
export function toWorkspaceRelative(root: string, absolutePath: string): string {
    const rel = relative(realOrThrow(root), absolutePath);
    return rel === "" ? "." : rel;
}
