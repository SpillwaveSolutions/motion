/**
 * Project-tree helpers — IDE-style hierarchy from a flat list of absolute paths.
 */

export type SortMode = "name-asc" | "name-desc" | "recent";

export type TreeNode =
    | { kind: "dir"; name: string; /** relative path from workspace */ rel: string; children: TreeNode[] }
    | { kind: "file"; name: string; rel: string; /** absolute path for open/save */ path: string };

export function basenameOf(path: string): string {
    return path.split(/[/\\]/).pop() || path;
}

/** Path relative to workspace root, using forward slashes for stable keys. */
export function toRel(workspaceRoot: string, absolutePath: string): string {
    const root = workspaceRoot.replace(/[/\\]+$/, "");
    let rel = absolutePath;
    if (absolutePath.startsWith(root)) {
        rel = absolutePath.slice(root.length).replace(/^[/\\]+/, "");
    }
    return rel.replace(/\\/g, "/");
}

/**
 * Build a sorted directory tree from absolute markdown paths.
 * Empty intermediate folders appear only when they contain notes below them.
 */
export function buildFileTree(absolutePaths: string[], workspaceRoot: string): TreeNode[] {
    type DirAcc = { kind: "dir"; name: string; rel: string; dirs: Map<string, DirAcc>; files: TreeNode[] };
    const root: DirAcc = { kind: "dir", name: "", rel: "", dirs: new Map(), files: [] };

    for (const abs of absolutePaths) {
        const rel = toRel(workspaceRoot, abs);
        if (!rel || rel === ".") continue;
        const parts = rel.split("/").filter(Boolean);
        if (parts.length === 0) continue;

        let node = root;
        for (let i = 0; i < parts.length - 1; i++) {
            const name = parts[i]!;
            const childRel = parts.slice(0, i + 1).join("/");
            let child = node.dirs.get(name);
            if (!child) {
                child = { kind: "dir", name, rel: childRel, dirs: new Map(), files: [] };
                node.dirs.set(name, child);
            }
            node = child;
        }
        const fileName = parts[parts.length - 1]!;
        node.files.push({ kind: "file", name: fileName, rel, path: abs });
    }

    const finalize = (acc: DirAcc): TreeNode[] => {
        const dirs: TreeNode[] = [...acc.dirs.values()]
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
            .map((d) => ({
                kind: "dir" as const,
                name: d.name,
                rel: d.rel,
                children: finalize(d),
            }));
        const files = [...acc.files].sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
        );
        return [...dirs, ...files];
    };

    return finalize(root);
}

export function filterPathsByName(paths: string[], query: string): string[] {
    const q = query.trim().toLowerCase();
    if (!q) return paths;
    return paths.filter((p) => basenameOf(p).toLowerCase().includes(q));
}

/**
 * Sort absolute paths. `recent` maps absolute path → timestamp (ms) of last open.
 * Paths missing from `recent` sort after recently opened ones when mode is recent.
 */
export function sortPaths(
    paths: string[],
    mode: SortMode,
    recent: ReadonlyMap<string, number> = new Map()
): string[] {
    const copy = [...paths];
    if (mode === "name-asc") {
        return copy.sort((a, b) =>
            basenameOf(a).localeCompare(basenameOf(b), undefined, { sensitivity: "base" })
        );
    }
    if (mode === "name-desc") {
        return copy.sort((a, b) =>
            basenameOf(b).localeCompare(basenameOf(a), undefined, { sensitivity: "base" })
        );
    }
    // recent
    return copy.sort((a, b) => {
        const ta = recent.get(a) ?? 0;
        const tb = recent.get(b) ?? 0;
        if (tb !== ta) return tb - ta;
        return basenameOf(a).localeCompare(basenameOf(b), undefined, { sensitivity: "base" });
    });
}

/** Collect only file nodes under a tree (for tests / selection). */
export function flattenTreeFiles(nodes: TreeNode[]): string[] {
    const out: string[] = [];
    const walk = (list: TreeNode[]) => {
        for (const n of list) {
            if (n.kind === "file") out.push(n.path);
            else walk(n.children);
        }
    };
    walk(nodes);
    return out;
}

/**
 * Directory rel-paths that must be expanded so `rel` (file or dir) is visible
 * under a collapsed-by-default tree. For `agents/index.md` → `["agents"]`.
 * Root-level files return [].
 */
export function ancestorDirRels(rel: string): string[] {
    const parts = rel.replace(/\\/g, "/").split("/").filter(Boolean);
    if (parts.length <= 1) return [];
    const out: string[] = [];
    for (let i = 0; i < parts.length - 1; i++) {
        out.push(parts.slice(0, i + 1).join("/"));
    }
    return out;
}

/**
 * All directory rels to expand so every path in `absolutePaths` is reachable
 * from a collapsed tree (name-filter “show matches” mode).
 */
export function dirsToRevealPaths(
    absolutePaths: string[],
    workspaceRoot: string
): string[] {
    const dirs = new Set<string>();
    for (const abs of absolutePaths) {
        for (const d of ancestorDirRels(toRel(workspaceRoot, abs))) {
            dirs.add(d);
        }
    }
    return [...dirs];
}
