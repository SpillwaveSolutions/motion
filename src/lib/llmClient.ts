import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "./storage";
import type { LLMOptions, LLMResponse, ModelProvider } from "./cliWrappers";

/**
 * Browser-safe LLM call. cliWrappers.callLLM's Bun.spawn only works in a
 * real Bun process -- calling it directly from React component code throws,
 * since `Bun` doesn't exist in a browser/webview. This routes through a
 * process where it does: the Tauri Rust backend's run_llm_cli command when
 * packaged, or the dev server's POST /api/llm (which calls cliWrappers.ts
 * server-side) otherwise.
 *
 * A JSON body with `error` is a failure even on HTTP 200. That lets tests
 * (and a future envelope) report a CLI miss without tripping the Playwright
 * >=400 gate. Non-OK HTTP still throws, for the existing /api/llm contract.
 */
export async function callLLMFromUI(
    provider: ModelProvider,
    options: LLMOptions
): Promise<LLMResponse> {
    if (isTauri()) {
        const content = await invoke<string>("run_llm_cli", {
            provider,
            prompt: options.prompt,
            systemPrompt: options.systemPrompt,
            model: options.model,
        });
        return { content, rawOutput: content };
    }

    const res = await fetch("/api/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            provider,
            prompt: options.prompt,
            systemPrompt: options.systemPrompt,
            model: options.model,
        }),
    });
    const data = (await res.json()) as { error?: unknown; content?: string; rawOutput?: string };
    if (typeof data?.error === "string" && data.error) {
        throw new Error(data.error);
    }
    if (!res.ok) {
        throw new Error(`LLM call failed: ${res.status} ${res.statusText}`);
    }
    return data as LLMResponse;
}
