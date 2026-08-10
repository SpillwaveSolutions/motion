/**
 * Classify a `motion <path>` argument as a workspace directory or a note to
 * open, without touching disk — the filesystem predicates are injected, the
 * same shape as `resolveWorkspaceArg` in ./settings.ts.
 *
 * `.md` and nothing else: MARKDOWN_EXTENSIONS is ["md"] (./fsCore.ts) and the
 * sidebar filters on that same constant, so accepting `.markdown` here would
 * open a document the file list cannot show. The extension test is also what
 * keeps a typo'd directory name from silently becoming a new empty note.
 *
 * There is deliberately no `exists` predicate. A missing `.md` classifies
 * exactly like an existing one, because the caller creates it — existence
 * cannot change the decision, so taking it as input would be a lie.
 */
export interface PathArgDeps {
    /** Resolve a possibly-relative argument to an absolute path. */
    resolve: (p: string) => string;
    isDirectory: (abs: string) => boolean;
}

export type PathArg =
    | { kind: "dir"; path: string }
    | { kind: "file"; path: string; dir: string }
    | { kind: "error"; error: string };

export function classifyPathArg(raw: string | undefined, deps: PathArgDeps): PathArg {
    const arg = (raw ?? ".").trim() || ".";
    const abs = deps.resolve(arg).replace(/\/+$/, "") || "/";

    if (deps.isDirectory(abs)) return { kind: "dir", path: abs };

    if (/\.md$/i.test(abs)) {
        const dir = abs.slice(0, abs.lastIndexOf("/")) || "/";
        return { kind: "file", path: abs, dir };
    }

    return { kind: "error", error: `not a directory: ${arg}` };
}
