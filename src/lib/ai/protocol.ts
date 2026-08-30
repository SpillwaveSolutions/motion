/**
 * Wire format for POST /api/ai/stream.
 *
 * Always HTTP 200. Failures are `{type:"error"}` events so the Playwright
 * >=400 gate does not fire. The browser client parses this; the Bun service
 * emits it. No Bun, no SDK — safe on the client import graph.
 */

import { isDocCommandOp, type DocCommand } from "./commands";

export type AiStreamDelta = { type: "delta"; text: string };
export type AiStreamCommand = { type: "command"; command: DocCommand };
export type AiStreamDone = { type: "done"; text: string; commands?: DocCommand[] };
export type AiStreamError = { type: "error"; error: string };
export type AiStreamEvent = AiStreamDelta | AiStreamCommand | AiStreamDone | AiStreamError;

export type AiStreamRequest = {
    systemPrompt: string;
    context: string;
    instruction: string;
    model?: string;
};

function isDocCommand(value: unknown): value is DocCommand {
    if (!value || typeof value !== "object") return false;
    const op = (value as { op?: unknown }).op;
    return isDocCommandOp(op);
}

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
            const commands = Array.isArray((parsed as AiStreamDone).commands)
                ? (parsed as AiStreamDone).commands!.filter(isDocCommand)
                : undefined;
            return commands?.length
                ? { type: "done", text: (parsed as AiStreamDone).text, commands }
                : { type: "done", text: (parsed as AiStreamDone).text };
        }
        if (parsed?.type === "error" && typeof (parsed as AiStreamError).error === "string") {
            return parsed as AiStreamError;
        }
        if (parsed?.type === "command" && isDocCommand((parsed as AiStreamCommand).command)) {
            return parsed as AiStreamCommand;
        }
        return null;
    } catch {
        return null;
    }
}

export const AI_STREAM_PATH = "/api/ai/stream";
