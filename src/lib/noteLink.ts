/**
 * Decide what a clicked markdown link should do.
 *
 * Relative links resolve from the note that contains them, then from the
 * workspace root. A hit must be a markdown file we already know about (the
 * open folder's listing) unless it is an absolute path outside that folder,
 * which the desktop app can open by switching workspace. Web URLs are not
 * notes.
 */

const NOTE_EXTS = ["md", "markdown", "mdown", "mkd", "mdx"] as const;

export type NoteLinkAction =
    | { action: "open"; path: string }
    | { action: "switch"; file: string; workspace: string }
    | { action: "external"; url: string }
    | { action: "missing" }
    | { action: "ignore" };

export interface NoteLinkContext {
    currentFile: string | null;
    workspaceRoot: string | null;
    files: readonly string[];
}

/** TipTap's default check rejects `dir/note.md` (a slash after a letter). */
export function isNoteLinkUri(url: string): boolean {
    if (!url) return true;
    return !/^(javascript|data|vbscript):/i.test(url.trim());
}

export function resolveNoteLink(href: string, ctx: NoteLinkContext): NoteLinkAction {
    const raw = href.trim();
    if (!raw) return { action: "ignore" };
    if (/^(javascript|data|vbscript):/i.test(raw)) return { action: "ignore" };
    if (raw.startsWith("#")) return { action: "ignore" };
    if (/^(https?:|mailto:|tel:)/i.test(raw) || raw.startsWith("//")) {
        return { action: "external", url: raw };
    }

    const pathPart = extractLocalPath(raw);
    if (pathPart == null || !pathPart.trim()) return { action: "ignore" };

    const dirHint = /[/\\]$/.test(pathPart);
    const decoded = decodePath(pathPart).replace(/\\/g, "/");
    const root = ctx.workspaceRoot ? stripTrail(normalizePath(ctx.workspaceRoot)) : null;
    const candidates = pathCandidates(decoded, dirHint, ctx, root);
    const hit = matchFile(candidates, ctx.files);
    if (hit) return { action: "open", path: hit };

    if (!decoded.includes("/") && !isAbsolutePath(decoded)) {
        const byName = uniqueBasename(decoded, ctx.files);
        if (byName) return { action: "open", path: byName };
    }

    const absolute = candidates.find((c) => isAbsolutePath(c) && looksLikeNote(c));
    if (absolute && (!root || !isInside(absolute, root))) {
        const workspace = dirnameOf(absolute);
        if (workspace) return { action: "switch", file: absolute, workspace };
    }

    return { action: "missing" };
}

function extractLocalPath(raw: string): string | null {
    if (/^file:/i.test(raw)) {
        try {
            const url = new URL(raw);
            let path = decodeURIComponent(url.pathname);
            if (/^\/[A-Za-z]:\//.test(path)) path = path.slice(1);
            return path;
        } catch {
            return null;
        }
    }
    let cut = raw.length;
    const hash = raw.indexOf("#");
    const query = raw.indexOf("?");
    if (hash >= 0) cut = Math.min(cut, hash);
    if (query >= 0) cut = Math.min(cut, query);
    return raw.slice(0, cut);
}

function pathCandidates(
    decoded: string,
    dirHint: boolean,
    ctx: NoteLinkContext,
    root: string | null,
): string[] {
    const bases: string[] = [];
    if (isAbsolutePath(decoded)) {
        bases.push(normalizePath(decoded));
    } else {
        const rel = decoded.replace(/^\/+/, "");
        if (ctx.currentFile) {
            const dir = dirnameOf(normalizePath(ctx.currentFile));
            if (dir) bases.push(normalizePath(joinPath(dir, rel)));
        }
        if (root) bases.push(normalizePath(joinPath(root, rel)));
    }
    const out: string[] = [];
    for (const base of bases) {
        for (const extra of expand(base, dirHint)) out.push(extra);
    }
    return out;
}

function expand(path: string, dirHint: boolean): string[] {
    const clean = path.replace(/\/+$/, "");
    const extFirst = NOTE_EXTS.map((ext) => `${clean}.${ext}`);
    const indexFirst = [`${clean}/README.md`, `${clean}/index.md`];
    if (looksLikeNote(clean)) return [clean];
    if (dirHint) return [...indexFirst, clean, ...extFirst];
    return [clean, ...extFirst, ...indexFirst];
}

function matchFile(candidates: string[], files: readonly string[]): string | null {
    const exact = new Map<string, string>();
    for (const file of files) exact.set(normalizePath(file), file);
    for (const candidate of candidates) {
        const hit = exact.get(normalizePath(candidate));
        if (hit) return hit;
    }
    const groups = new Map<string, string[]>();
    for (const file of files) {
        const key = normalizePath(file).toLowerCase();
        const list = groups.get(key) ?? [];
        list.push(file);
        groups.set(key, list);
    }
    for (const candidate of candidates) {
        const list = groups.get(normalizePath(candidate).toLowerCase());
        if (list?.length === 1) return list[0]!;
    }
    return null;
}

function uniqueBasename(hrefPath: string, files: readonly string[]): string | null {
    const name = hrefPath.split("/").pop()?.toLowerCase();
    if (!name) return null;
    const names = new Set<string>([name]);
    if (!looksLikeNote(name)) {
        for (const ext of NOTE_EXTS) names.add(`${name}.${ext}`);
    }
    const hits = files.filter((file) => names.has((file.split(/[/\\]/).pop() ?? "").toLowerCase()));
    return hits.length === 1 ? hits[0]! : null;
}

function looksLikeNote(path: string): boolean {
    const base = path.split("/").pop()?.toLowerCase() ?? "";
    return NOTE_EXTS.some((ext) => base.endsWith(`.${ext}`));
}

function isAbsolutePath(path: string): boolean {
    return path.startsWith("/") || /^[A-Za-z]:\//.test(path);
}

function isInside(path: string, root: string): boolean {
    const p = normalizePath(path);
    const r = stripTrail(normalizePath(root));
    return p === r || p.startsWith(`${r}/`);
}

function joinPath(dir: string, rel: string): string {
    if (!dir || dir === "/") return `/${rel.replace(/^\/+/, "")}`;
    return `${stripTrail(dir)}/${rel.replace(/^\/+/, "")}`;
}

function dirnameOf(path: string): string {
    const n = stripTrail(path.replace(/\\/g, "/"));
    const i = n.lastIndexOf("/");
    if (i < 0) return "";
    if (i === 0) return "/";
    if (/^[A-Za-z]:$/.test(n.slice(0, i))) return `${n.slice(0, i)}/`;
    return n.slice(0, i);
}

function stripTrail(path: string): string {
    if (path === "/") return path;
    return path.replace(/\/+$/, "");
}

function decodePath(path: string): string {
    if (!path.includes("%")) return path;
    try {
        return decodeURIComponent(path);
    } catch {
        return path;
    }
}

function normalizePath(path: string): string {
    const slash = path.replace(/\\/g, "/");
    const drive = slash.match(/^([A-Za-z]:)(?=\/|$)/)?.[1];
    const body = drive ? slash.slice(drive.length) : slash;
    const abs = body.startsWith("/") || Boolean(drive);
    const parts: string[] = [];
    for (const seg of body.split("/")) {
        if (!seg || seg === ".") continue;
        if (seg === "..") {
            if (parts.length > 0) parts.pop();
            else if (!abs) parts.push("..");
            continue;
        }
        parts.push(seg);
    }
    const joined = parts.join("/");
    if (drive) return joined ? `${drive}/${joined}` : `${drive}/`;
    if (abs) return `/${joined}`;
    return joined;
}
