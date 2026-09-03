/**
 * Lightweight path globs for workspace notes (relative POSIX paths).
 *
 * Supports `*` (one segment), `**` (any depth), `?` (one non-slash char).
 * Empty pattern matches everything.
 */

import { basenameOf, filterPathsByName, toRel } from "./fileTree";

/** True if the string uses glob metacharacters or a path separator. */
export function looksLikeGlob(pattern: string): boolean {
    const p = pattern.trim();
    return p.length > 0 && (/[*?\[]/.test(p) || p.includes("/") || p.includes("\\"));
}

/**
 * Convert a glob to a case-insensitive RegExp anchored to the full relative path.
 */
export function globToRegExp(pattern: string): RegExp {
    let g = pattern.trim().replace(/\\/g, "/").replace(/^\.\//, "");
    // Trailing slash → match anything under that prefix
    if (g.endsWith("/") && !g.endsWith("**/")) {
        g = g + "**";
    }

    let re = "";
    let i = 0;
    while (i < g.length) {
        const c = g[i]!;
        if (c === "*" && g[i + 1] === "*") {
            if (g[i + 2] === "/") {
                // **/ → zero or more directories
                re += "(?:.*/)?";
                i += 3;
            } else {
                re += ".*";
                i += 2;
            }
        } else if (c === "*") {
            re += "[^/]*";
            i += 1;
        } else if (c === "?") {
            re += "[^/]";
            i += 1;
        } else if ("+.^${}()|[]\\".includes(c)) {
            re += "\\" + c;
            i += 1;
        } else {
            re += c;
            i += 1;
        }
    }
    return new RegExp(`^${re}$`, "i");
}

/** Match a workspace-relative path against a glob pattern. Empty → true. */
export function matchGlob(relPath: string, pattern: string): boolean {
    const p = pattern.trim();
    if (!p) return true;
    const rel = relPath.replace(/\\/g, "/").replace(/^\.\//, "");
    return globToRegExp(p).test(rel);
}

/**
 * Filter absolute note paths.
 *
 * - Empty pattern → all paths
 * - Plain text (no glob / no slash) → basename substring (name filter)
 * - Otherwise → path glob against path relative to workspaceRoot
 */
export function filterPathsByGlob(
    absolutePaths: string[],
    workspaceRoot: string | null,
    pattern: string
): string[] {
    const p = pattern.trim();
    if (!p) return absolutePaths;

    if (!looksLikeGlob(p) || !workspaceRoot) {
        // "welcome" stays a friendly name filter; no workspace → basename only
        return filterPathsByName(absolutePaths, p);
    }

    return absolutePaths.filter((abs) => matchGlob(toRel(workspaceRoot, abs), p));
}

/** Display helper: last path segment (re-export convenience). */
export { basenameOf };
