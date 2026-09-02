/**
 * User-facing copy when a Dataset/Query block cannot run.
 *
 * Opening a folder that is not Motion's demo tree used to dump DuckDB/HTTP
 * internals ("Failed to load dataset", Catalog Error: Table 'team' does not
 * exist) because welcome still points at sample-data.csv / sample-events.jsonl.
 * Classify that as "not in this workspace" instead of a crash.
 *
 * Browser-safe: no Bun, no I/O.
 */

export const DEMO_DATA_FILES = ["sample-data.csv", "sample-events.jsonl"] as const;

export function basename(path: string): string {
    const trimmed = path.replace(/[/\\]+$/, "");
    const parts = trimmed.split(/[/\\]/);
    return parts[parts.length - 1] || path;
}

export function isDemoDataFile(source: string): boolean {
    return (DEMO_DATA_FILES as readonly string[]).includes(basename(source));
}

export function workspaceHasDataFile(listed: string[], source: string): boolean {
    if (!source) return false;
    if (listed.includes(source)) return true;
    const base = basename(source);
    return listed.some((file) => file === base || file.endsWith(`/${base}`) || file.endsWith(`\\${base}`));
}

export function explainMissingDataset(source: string): string {
    if (isDemoDataFile(source)) {
        return "Demo data is not in this workspace. Open Motion's demo folder, or pick a CSV/JSONL from this folder.";
    }
    return `Not in this workspace: ${source}`;
}

export function isMissingFileError(message: string): boolean {
    return /not-found|No such file|Failed to read|HTTP 404|\b404\b/i.test(message);
}

export function explainDatasetError(source: string, error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    if (isMissingFileError(message)) return explainMissingDataset(source);
    return message || "Failed to load dataset";
}

export function explainQueryError(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    const match =
        message.match(/Table with name ([A-Za-z0-9_]+) does not exist/i) ||
        message.match(/Table ['"]?([A-Za-z0-9_]+)['"]? does not exist/i);
    if (match) {
        return `Table "${match[1]}" isn't registered. Load a Dataset for it first, or add the demo CSV/JSONL to this workspace.`;
    }
    return message || "Query failed";
}
