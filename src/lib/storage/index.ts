import { invoke, isTauri as detectTauri } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

export interface StorageProvider {
    openFolder(): Promise<string | null>;
    listFiles(path: string): Promise<string[]>;
    readFile(path: string): Promise<string>;
    writeFile(path: string, content: string): Promise<void>;
    /** CSV/JSON/JSONL files in the opened workspace, for the Dataset block's source picker. */
    listDataFiles(): Promise<string[]>;
}

export class TauriStorage implements StorageProvider {
    async openFolder(): Promise<string | null> {
        const selected = await open({
            directory: true,
            multiple: false,
            title: "Open Documents Folder"
        });
        if (typeof selected !== "string") {
            return null;
        }
        // Register the opened folder as the allowed workspace root on the Rust side.
        await invoke<string>("set_workspace", { path: selected });
        return selected;
    }

    async listFiles(path: string): Promise<string[]> {
        return await invoke<string[]>("list_markdown_files", { path });
    }

    async readFile(path: string): Promise<string> {
        return await invoke<string>("read_file", { path });
    }

    async writeFile(path: string, content: string): Promise<void> {
        await invoke("write_file", { path, content });
    }

    async listDataFiles(): Promise<string[]> {
        return await invoke<string[]>("list_data_files");
    }
}

/** Surface the dev server's error message rather than a bare status code. */
async function failed(res: Response, what: string): Promise<never> {
    let detail = `${res.status} ${res.statusText}`;
    try {
        const body = await res.json();
        if (body?.error) detail = body.error;
    } catch {
        /* non-JSON body; the status line is all we have */
    }
    throw new Error(`${what}: ${detail}`);
}

/**
 * Browser-mode storage, backed by the dev server's real filesystem API.
 *
 * This replaces the former WebStorage, which faked the filesystem: `writeFile`
 * was a console.warn that reported success and `openFolder` returned the literal
 * string "web-mock-folder". That made web mode useless as a test surface --
 * saving could not fail, so testing a save proved nothing about the desktop app.
 *
 * Every operation now goes through /api/fs/*, which delegates to the same
 * fsCore the Tauri commands mirror, so behaviour that passes here is behaviour
 * the desktop app is held to by tests/contract/storage-cases.json.
 */
export class HttpStorage implements StorageProvider {
    /**
     * The browser has no folder picker: the workspace is fixed by the server's
     * MOTION_WORKSPACE. Returns the real root so the UI shows where it is
     * working, instead of a placeholder that is not a path at all.
     */
    async openFolder(): Promise<string | null> {
        const res = await fetch("/api/fs/workspace");
        if (!res.ok) return await failed(res, "Failed to open workspace");
        const { root } = await res.json();
        return root ?? null;
    }

    async listFiles(_path: string): Promise<string[]> {
        const res = await fetch("/api/fs/list");
        if (!res.ok) return await failed(res, "Failed to list files");
        return await res.json();
    }

    async readFile(path: string): Promise<string> {
        const res = await fetch(`/api/fs/read?path=${encodeURIComponent(path)}`);
        if (!res.ok) return await failed(res, `Failed to read "${path}"`);
        const { content } = await res.json();
        return content;
    }

    async writeFile(path: string, content: string): Promise<void> {
        const res = await fetch("/api/fs/write", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path, content }),
        });
        if (!res.ok) await failed(res, `Failed to write "${path}"`);
    }

    async listDataFiles(): Promise<string[]> {
        const res = await fetch("/api/fs/data-files");
        if (!res.ok) return await failed(res, "Failed to list data files");
        return await res.json();
    }
}

/**
 * Detect Tauri 2 runtime via the official API.
 * Do not check `window.__TAURI__` — that only exists when `withGlobalTauri` is enabled.
 */
export const isTauri = (): boolean => detectTauri();

/**
 * The workspace root currently open, remembered when a folder is opened.
 *
 * Documents must store workspace-RELATIVE paths: an absolute path baked into a
 * Dataset block does not exist on anyone else's machine, and used to differ
 * between the two runtimes (web returned bare filenames, desktop absolute
 * paths), so a document authored in one mode could not resolve in the other.
 * Listings still return absolute paths -- unambiguous for the backend -- and
 * this converts at the point of storage.
 */
let workspaceRoot: string | null = null;

export function rememberWorkspaceRoot(root: string | null): void {
    workspaceRoot = root;
}

export function relativeToWorkspace(absolutePath: string): string {
    if (!workspaceRoot) return absolutePath;
    const root = workspaceRoot.replace(/[/\\]$/, "");
    if (!absolutePath.startsWith(root)) return absolutePath;
    return absolutePath.slice(root.length).replace(/^[/\\]+/, "");
}

export const storage: StorageProvider = isTauri() ? new TauriStorage() : new HttpStorage();
