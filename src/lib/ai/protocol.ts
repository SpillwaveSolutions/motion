/**
 * Wire format for POST /api/ai/stream.
 *
 * Always HTTP 200. Failures are `{type:"error"}` events so the Playwright
 * >=400 gate does not fire. The browser client parses this; the Bun service
 * emits it. No Bun, no SDK — safe on the client import graph.
 */

export type AiStreamDelta = { type: "delta"; text: string };
export type AiStreamDone = { type: "done"; text: string };
export type AiStreamError = { type: "error"; error: string };
export type AiStreamEvent = AiStreamDelta | AiStreamDone | AiStreamError;

export type AiStreamRequest = {
    systemPrompt: string;
    context: string;
    instruction: string;
    model?: string;
};

export function encodeSse(event: AiStreamEvent): string {
    return `data: ${JSON.stringify(event)}\n\n`;
}

export function parseSseBlock(block: string): AiStreamEvent | null {
    const data = block
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n")
        .trim();
    if (!data || data === "[DONE]") return null;
    try {
        const parsed = JSON.parse(data) as { type?: unknown };
        if (parsed?.type === "delta" && typeof (parsed as AiStreamDelta).text === "string") {
            return parsed as AiStreamDelta;
        }
        if (parsed?.type === "done" && typeof (parsed as AiStreamDone).text === "string") {
            return parsed as AiStreamDone;
        }
        if (parsed?.type === "error" && typeof (parsed as AiStreamError).error === "string") {
            return parsed as AiStreamError;
        }
        return null;
    } catch {
        return null;
    }
}

export const AI_STREAM_PATH = "/api/ai/stream";
