/**
 * Shared TS AI service. Runs in a real Bun process (the dev server today,
 * a sidecar later). Never import this from React — it talks to the Anthropic
 * SDK and, as a fallback, cliWrappers.callLLM / Bun.spawn.
 *
 * Prompt cache: cache_control on the system prompt and the packed document
 * context so Try again does not re-pay for the note body.
 *
 * Tool use: the four DocCommands are advertised to the SDK. The host previews
 * the planned list; we do not apply them here.
 */

import { callLLM } from "../cliWrappers";
import {
    CLI_DOCCOMMANDS_TRAILER,
    DOC_COMMAND_TOOLS,
    commandFromToolUse,
    extractDocCommandsFence,
    type DocCommand,
} from "./commands";
import { unwrapReply } from "./prompt";
import { encodeSse, type AiStreamEvent, type AiStreamRequest } from "./protocol";

export const DEFAULT_AI_MODEL = "claude-sonnet-4-5";

export type AiBackend = "anthropic" | "cli";

export type AnthropicChunk =
    | { kind: "text"; text: string }
    | { kind: "command"; command: DocCommand };

export type AnthropicStreamer = (
    req: AiStreamRequest,
    apiKey: string,
    signal?: AbortSignal
) => AsyncIterable<AnthropicChunk>;

export type CliCaller = typeof callLLM;

export interface AiServiceDeps {
    apiKey?: string;
    model?: string;
    streamAnthropic?: AnthropicStreamer;
    callLLM?: CliCaller;
}

export function resolveAiBackend(apiKey: string | undefined): AiBackend {
    return apiKey && apiKey.trim() ? "anthropic" : "cli";
}

function finishTurn(text: string, commands: DocCommand[]): AiStreamEvent {
    const reply = unwrapReply(text);
    if (commands.length > 0) {
        return { type: "done", text: reply, commands };
    }
    if (!reply.trim()) {
        return { type: "error", error: "The model returned an empty reply." };
    }
    return { type: "done", text: reply };
}

export async function* streamAi(
    req: AiStreamRequest,
    deps: AiServiceDeps = {},
    signal?: AbortSignal
): AsyncGenerator<AiStreamEvent> {
    const instruction = req.instruction.trim();
    if (!instruction) {
        yield { type: "error", error: "Ask AI needs an instruction." };
        return;
    }
    if (signal?.aborted) {
        yield { type: "error", error: "Ask AI was cancelled." };
        return;
    }

    const apiKey = (deps.apiKey ?? "").trim();
    try {
        if (resolveAiBackend(apiKey) === "anthropic") {
            const streamer = deps.streamAnthropic ?? defaultAnthropicStream;
            let full = "";
            const commands: DocCommand[] = [];
            for await (const chunk of streamer(req, apiKey, signal)) {
                if (signal?.aborted) {
                    yield { type: "error", error: "Ask AI was cancelled." };
                    return;
                }
                if (chunk.kind === "command") {
                    commands.push(chunk.command);
                    yield { type: "command", command: chunk.command };
                    continue;
                }
                if (!chunk.text) continue;
                full += chunk.text;
                yield { type: "delta", text: chunk.text };
            }
            yield finishTurn(full, commands);
            return;
        }

        const caller = deps.callLLM ?? callLLM;
        const response = await caller("claude", {
            prompt: `${req.context}\n\nInstruction:\n${instruction}\n\n${CLI_DOCCOMMANDS_TRAILER}`,
            systemPrompt: req.systemPrompt,
            model: req.model ?? deps.model,
        });
        if (signal?.aborted) {
            yield { type: "error", error: "Ask AI was cancelled." };
            return;
        }
        const raw = response.content ?? "";
        const commands = extractDocCommandsFence(raw) ?? [];
        if (commands.length > 0) {
            for (const command of commands) {
                yield { type: "command", command };
            }
            yield { type: "done", text: "", commands };
            return;
        }
        const reply = unwrapReply(raw);
        if (!reply.trim()) {
            yield { type: "error", error: "The model returned an empty reply." };
            return;
        }
        yield { type: "delta", text: reply };
        yield { type: "done", text: reply };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (signal?.aborted || /abort/i.test(message)) {
            yield { type: "error", error: "Ask AI was cancelled." };
            return;
        }
        yield { type: "error", error: message };
    }
}

export function streamAiToSseResponse(
    req: AiStreamRequest,
    deps: AiServiceDeps = {},
    signal?: AbortSignal
): Response {
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
        async start(controller) {
            try {
                for await (const event of streamAi(req, deps, signal)) {
                    controller.enqueue(encoder.encode(encodeSse(event)));
                    if (event.type === "done" || event.type === "error") break;
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                controller.enqueue(encoder.encode(encodeSse({ type: "error", error: message })));
            } finally {
                try {
                    controller.close();
                } catch {
                    /* already closed */
                }
            }
        },
    });
    return new Response(readable, {
        status: 200,
        headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        },
    });
}

async function* defaultAnthropicStream(
    req: AiStreamRequest,
    apiKey: string,
    signal?: AbortSignal
): AsyncIterable<AnthropicChunk> {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey });
    const model = req.model || process.env["MOTION_AI_MODEL"] || DEFAULT_AI_MODEL;
    const stream = client.messages.stream(
        {
            model,
            max_tokens: 8192,
            tools: [...DOC_COMMAND_TOOLS],
            tool_choice: { type: "auto" },
            system: [
                {
                    type: "text",
                    text: req.systemPrompt,
                    cache_control: { type: "ephemeral" },
                },
            ],
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: req.context,
                            cache_control: { type: "ephemeral" },
                        },
                        {
                            type: "text",
                            text: `Instruction:\n${req.instruction}`,
                        },
                    ],
                },
            ],
        },
        signal ? { signal } : undefined
    );

    for await (const event of stream) {
        if (signal?.aborted) {
            stream.abort();
            break;
        }
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            yield { kind: "text", text: event.delta.text };
        }
    }

    if (signal?.aborted) return;
    try {
        const final = await stream.finalMessage();
        for (const block of final.content ?? []) {
            if (block.type !== "tool_use") continue;
            const parsed = commandFromToolUse(block.name, block.input);
            if ("error" in parsed) continue;
            yield { kind: "command", command: parsed };
        }
    } catch {
        /* aborted or no final message */
    }
}
