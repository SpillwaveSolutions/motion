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

export class WebStorage implements StorageProvider {
    constructor() {
        console.warn(
            "[Motion] WebStorage is active: reads come from the dev server's public/demo/ " +
            "workspace (no Tauri filesystem access here); writes do not persist. " +
            "Run inside the Tauri shell for real filesystem access."
        );
    }

    async openFolder(): Promise<string | null> {
        return "web-mock-folder";
    }

    // No Tauri filesystem in a plain browser -- list the real demo workspace
    // the dev server serves from public/demo/, instead of a hardcoded array
    // that could drift from what's actually there.
    async listFiles(_path: string): Promise<string[]> {
        const res = await fetch("/api/demo-files");
        if (!res.ok) return [];
        return await res.json();
    }

    async readFile(path: string): Promise<string> {
        const filename = path.split("/").pop() ?? path;
        const res = await fetch(`/demo/${encodeURIComponent(filename)}`);
        if (!res.ok) {
            throw new Error(`Failed to read "${path}": ${res.status} ${res.statusText}`);
        }
        return await res.text();
    }

    async writeFile(path: string, _content: string): Promise<void> {
        console.warn(
            `[Motion] WebStorage: write to "${path}" was simulated and did not persist.`
        );
    }

    async listDataFiles(): Promise<string[]> {
        const res = await fetch("/api/demo-files");
        if (!res.ok) return [];
        const files: string[] = await res.json();
        return files.filter((f) => /\.(csv|json|jsonl)$/i.test(f));
    }
}

/**
 * Detect Tauri 2 runtime via the official API.
 * Do not check `window.__TAURI__` — that only exists when `withGlobalTauri` is enabled.
 */
export const isTauri = (): boolean => detectTauri();

export const storage: StorageProvider = isTauri() ? new TauriStorage() : new WebStorage();
