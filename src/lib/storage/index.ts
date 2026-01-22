import { invoke } from "@tauri-apps/api/core";
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
        return typeof selected === "string" ? selected : null;
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
    async openFolder(): Promise<string | null> {
        return "web-mock-folder";
    }

    // Mock for web testing/playwright
    async listFiles(_path: string): Promise<string[]> {
        return ["welcome.md", "getting-started.md", "architecture.md"];
    }

    async readFile(path: string): Promise<string> {
        if (path.includes("welcome.md")) return "# Welcome\nThis is a mock welcome file.";
        return `Content for ${path}`;
    }

    async writeFile(_path: string, _content: string): Promise<void> {
        console.log("WebStorage: Write simulated");
    }
}

export const isTauri = () => (window as any).__TAURI__ !== undefined;

export const storage: StorageProvider = isTauri() ? new TauriStorage() : new WebStorage();

