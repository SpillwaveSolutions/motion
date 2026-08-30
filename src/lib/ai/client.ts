/**
 * Browser-safe Ask AI transport. Packs context in the UI, then either:
 *   - POST /api/ai/stream (SSE) when an HTTP origin is available
 *     (browser, `bun tauri dev`), or
 *   - callLLMFromUI / run_llm_cli as one chunk (packaged Tauri until sidecar).
 *
 * Never imports the Anthropic SDK or Bun.
 */

import { callLLMFromUI } from "../llmClient";
import { isTauri } from "../storage";
import { extractDocCommandsFence, type DocCommand } from "./commands";
import { buildAiContext } from "./context";
import { packPromptParts, unwrapReply } from "./prompt";
import {
    AI_STREAM_PATH,
    encodeSse,
    parseSseBlock,
    type AiStreamRequest,
} from "./protocol";
import type { RunAskAiInput } from "./run";

export type AskAiOutcome = {
    text: string;
    commands: DocCommand[];
};

export function prepareAskAiRequest(input: RunAskAiInput): AiStreamRequest & { prompt: string } {
    const instruction = input.instruction.trim();
    if (!instruction) {
        throw new Error("Ask AI needs an instruction.");
    }
    const ctx = buildAiContext({
        title: input.title,
        before: input.before,
        selection: input.selection,
        after: input.after,
        priorOps: input.priorOps,
        budget: input.budget,
    });
    return packPromptParts(ctx, instruction);
}

function httpAiAvailable(): boolean {
    if (typeof window === "undefined") return true;
    const proto = window.location.protocol;
    return proto === "http:" || proto === "https:";
}

function isAbortError(error: unknown): boolean {
    if (!error) return false;
    if (typeof error === "object" && (error as { name?: string }).name === "AbortError") return true;
    const message = error instanceof Error ? error.message : String(error);
    return /abort|cancel/i.test(message);
}

function finishOutcome(text: string, commands: DocCommand[]): AskAiOutcome {
    const reply = unwrapReply(text);
    if (commands.length > 0) return { text: reply, commands };
    if (!reply.trim()) {
        throw new Error("The model returned an empty reply.");
    }
    return { text: reply, commands: [] };
}

export type StreamAskAiHandlers = {
    onText?: (full: string) => void;
    onCommands?: (commands: DocCommand[]) => void;
    signal?: AbortSignal;
};

/**
 * Stream an Ask AI reply. `onText` is the cumulative unwrapped-so-far text
 * (fence unwrap only runs on the final `done` event; live tokens are raw).
 * `onCommands` fires as DocCommands arrive and again on `done`.
 */
export async function streamAskAiFromUI(
    input: RunAskAiInput,
    handlers: StreamAskAiHandlers = {}
): Promise<AskAiOutcome> {
    const packed = prepareAskAiRequest(input);
    const tryHttp = !isTauri() || httpAiAvailable();
    if (tryHttp) {
        try {
            return await streamViaHttp(packed, handlers);
        } catch (error) {
            if (handlers.signal?.aborted || isAbortError(error)) {
                throw new Error("Ask AI was cancelled.");
            }
            if (!isTauri()) throw error;
        }
    }
    return streamViaCli(packed, handlers);
}

async function streamViaCli(
    packed: AiStreamRequest & { prompt: string },
    handlers: StreamAskAiHandlers
): Promise<AskAiOutcome> {
    if (handlers.signal?.aborted) {
        throw new Error("Ask AI was cancelled.");
    }
    const response = await callLLMFromUI("claude", {
        prompt: packed.prompt,
        systemPrompt: packed.systemPrompt,
        model: packed.model,
    });
    if (handlers.signal?.aborted) {
        throw new Error("Ask AI was cancelled.");
    }
    const raw = response.content ?? "";
    const commands = extractDocCommandsFence(raw) ?? [];
    if (commands.length > 0) {
        handlers.onCommands?.(commands);
        return { text: "", commands };
    }
    const reply = unwrapReply(raw);
    if (!reply.trim()) {
        throw new Error("The model returned an empty reply.");
    }
    handlers.onText?.(reply);
    return { text: reply, commands: [] };
}

async function streamViaHttp(
    packed: AiStreamRequest,
    handlers: StreamAskAiHandlers
): Promise<AskAiOutcome> {
    const res = await fetch(AI_STREAM_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            systemPrompt: packed.systemPrompt,
            context: packed.context,
            instruction: packed.instruction,
            model: packed.model,
        }),
        signal: handlers.signal,
    });
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("text/event-stream") && res.body) {
        return readSse(res.body, handlers);
    }
    const data = (await res.json()) as { error?: unknown; content?: string; commands?: DocCommand[] };
    if (typeof data?.error === "string" && data.error) {
        throw new Error(data.error);
    }
    if (!res.ok) {
        throw new Error(`Ask AI failed: ${res.status} ${res.statusText}`);
    }
    const commands = Array.isArray(data.commands) ? data.commands : [];
    const outcome = finishOutcome(data.content ?? "", commands);
    if (outcome.text) handlers.onText?.(outcome.text);
    if (outcome.commands.length) handlers.onCommands?.(outcome.commands);
    return outcome;
}

async function readSse(body: ReadableStream<Uint8Array>, handlers: StreamAskAiHandlers): Promise<AskAiOutcome> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let raw = "";
    const commands: DocCommand[] = [];
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split("\n\n");
            buffer = parts.pop() ?? "";
            for (const part of parts) {
                const event = parseSseBlock(part);
                if (!event) continue;
                if (event.type === "delta") {
                    raw += event.text;
                    handlers.onText?.(raw);
                } else if (event.type === "command") {
                    commands.push(event.command);
                    handlers.onCommands?.([...commands]);
                } else if (event.type === "done") {
                    const finalCommands = event.commands?.length ? event.commands : commands;
                    if (finalCommands.length) handlers.onCommands?.(finalCommands);
                    const outcome = finishOutcome(event.text || raw, finalCommands);
                    if (outcome.text) handlers.onText?.(outcome.text);
                    return outcome;
                } else if (event.type === "error") {
                    throw new Error(event.error);
                }
            }
        }
    } finally {
        reader.releaseLock();
    }
    return finishOutcome(raw, commands);
}

/** Test helper: encode a sequence of events as an SSE body. */
export function sseBodyFromEvents(
    events: Parameters<typeof encodeSse>[0][]
): string {
    return events.map(encodeSse).join("");
}
