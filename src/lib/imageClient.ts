import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "./storage";

/**
 * Browser-safe image generation call. imageGen.ts's Bun.spawn only works in a
 * real Bun process -- calling it directly from React component code throws,
 * since `Bun` doesn't exist in a browser/webview. This routes through a
 * process where it does: the Tauri Rust backend's run_image_cli command when
 * packaged, or the dev server's POST /api/image (which calls imageGen.ts
 * server-side) otherwise. Returns a base64 data URI, same shape either way.
 */
export async function generateImageFromUI(prompt: string): Promise<string> {
    if (isTauri()) {
        return await invoke<string>("run_image_cli", { prompt });
    }

    const res = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data?.error || `Image generation failed: ${res.status} ${res.statusText}`);
    }
    return data.dataUri as string;
}
