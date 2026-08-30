/**
 * Shared TS AI service. Runs in a real Bun process (the dev server today,
 * a sidecar later). Never import this from React — it talks to the Anthropic
 * SDK and, as a fallback, cliWrappers.callLLM / Bun.spawn.
 *
 * Prompt cache: cache_control on the system prompt and the packed document
 * context so Try again does not re-pay for the note body.
 */

import { callLLM } from "../cliWrappers";
import { unwrapReply } from "./prompt";
import { encodeSse, type AiStreamEvent, type AiStreamRequest } from "./protocol";

export const DEFAULT_AI_MODEL = "claude-sonnet-4-5";

export type AiBackend = "anthropic" | "cli";

export type AnthropicStreamer = (
    req: AiStreamRequest,
    apiKey: string,
    signal?: AbortSignal
) => AsyncIterable<string>;

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
            for await (const chunk of streamer(req, apiKey, signal)) {
                if (signal?.aborted) {
                    yield { type: "error", error: "Ask AI was cancelled." };
                    return;
                }
                if (!chunk) continue;
                full += chunk;
                yield { type: "delta", text: chunk };
            }
            const reply = unwrapReply(full);
            if (!reply.trim()) {
                yield { type: "error", error: "The model returned an empty reply." };
                return;
            }
            yield { type: "done", text: reply };
            return;
        }

        const caller = deps.callLLM ?? callLLM;
        const response = await caller("claude", {
            prompt: `${req.context}\n\nInstruction:\n${instruction}\n\nReturn only the markdown for the result. No preamble.`,
            systemPrompt: req.systemPrompt,
            model: req.model ?? deps.model,
        });
        if (signal?.aborted) {
            yield { type: "error", error: "Ask AI was cancelled." };
            return;
        }
        const reply = unwrapReply(response.content ?? "");
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
): AsyncIterable<string> {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey });
    const model = req.model || process.env["MOTION_AI_MODEL"] || DEFAULT_AI_MODEL;
    const stream = client.messages.stream(
        {
            model,
            max_tokens: 8192,
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
                            text: `Instruction:\n${req.instruction}\n\nReturn only the markdown for the result. No preamble.`,
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
            yield event.delta.text;
        }
    }
}
