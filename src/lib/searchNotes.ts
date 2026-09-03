/**
 * In-file search across workspace notes — Find-in-Files style, client-side.
 * Reads through the storage API so web and Tauri share one path.
 */

export interface SearchHit {
    path: string;
    line: number; // 1-based
    text: string;
}

export interface SearchNotesOptions {
    /** Cap how many files we open (large workspaces). Default 200. */
    maxFiles?: number;
    /** Cap total hits returned. Default 100. */
    maxHits?: number;
    /** Case-insensitive match. Default true. */
    caseInsensitive?: boolean;
}

/**
 * Search markdown files for a substring. Empty query → no hits.
 */
export async function searchInNotes(
    paths: string[],
    query: string,
    readFile: (path: string) => Promise<string>,
    options: SearchNotesOptions = {}
): Promise<SearchHit[]> {
    const q = query.trim();
    if (!q) return [];

    const maxFiles = options.maxFiles ?? 200;
    const maxHits = options.maxHits ?? 100;
    const ci = options.caseInsensitive !== false;
    const needle = ci ? q.toLowerCase() : q;

    const hits: SearchHit[] = [];
    const slice = paths.slice(0, maxFiles);

    for (const path of slice) {
        let content: string;
        try {
            content = await readFile(path);
        } catch {
            continue;
        }
        const lines = content.split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i] ?? "";
            const hay = ci ? line.toLowerCase() : line;
            if (hay.includes(needle)) {
                hits.push({
                    path,
                    line: i + 1,
                    text: line.trim().slice(0, 200),
                });
                if (hits.length >= maxHits) return hits;
            }
        }
    }
    return hits;
}
