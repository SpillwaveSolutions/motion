import { invoke, isTauri as detectTauri } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

export interface StorageProvider {
    openFolder(): Promise<string | null>;
    listFiles(path: string): Promise<string[]>;
    readFile(path: string): Promise<string>;
    writeFile(path: string, content: string): Promise<void>;
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
}

export class WebStorage implements StorageProvider {
    constructor() {
        console.warn(
            "[Motion] WebStorage is active: file reads return mock data and writes do not persist. " +
            "Run inside the Tauri shell for real filesystem access."
        );
    }

    async openFolder(): Promise<string | null> {
        return "web-mock-folder";
    }

    // Mock for web testing/playwright
    async listFiles(_path: string): Promise<string[]> {
        return ["welcome.md", "getting-started.md", "architecture.md", "sample-data.csv", "sample-events.jsonl"];
    }

    async readFile(path: string): Promise<string> {
        if (path.includes("welcome.md")) return "# Welcome\nThis is a mock welcome file.";
        if (path.includes("sample-data.csv")) {
            return "id,name,role,experience\n1,Alice,Architect,12\n2,Bob,Author,5\n3,Charlie,Developer,8\n4,Diana,Designer,7\n5,Eve,Manager,10";
        }
        if (path.includes("sample-events.jsonl")) {
            return '{"event": "login", "user": "alice", "timestamp": "2024-03-20T10:00:00Z"}\n{"event": "view_page", "user": "bob", "timestamp": "2024-03-20T10:05:00Z"}\n{"event": "click_btn", "user": "alice", "timestamp": "2024-03-20T10:10:00Z"}';
        }
        return `Content for ${path}`;
    }

    async writeFile(path: string, _content: string): Promise<void> {
        console.warn(
            `[Motion] WebStorage: write to "${path}" was simulated and did not persist.`
        );
    }
}

/**
 * Detect Tauri 2 runtime via the official API.
 * Do not check `window.__TAURI__` — that only exists when `withGlobalTauri` is enabled.
 */
export const isTauri = (): boolean => detectTauri();

export const storage: StorageProvider = isTauri() ? new TauriStorage() : new WebStorage();
