import { describe, expect, test } from "bun:test";
import { encodeSse, parseSseBlock } from "./protocol";

describe("SSE protocol", () => {
    test("round-trips a delta", () => {
        const encoded = encodeSse({ type: "delta", text: "Hello" });
        expect(encoded.endsWith("\n\n")).toBe(true);
        expect(parseSseBlock(encoded.trim())).toEqual({ type: "delta", text: "Hello" });
    });

    test("parses done and error", () => {
        expect(parseSseBlock('data: {"type":"done","text":"full"}')).toEqual({
            type: "done",
            text: "full",
        });
        expect(parseSseBlock('data: {"type":"error","error":"claude CLI not found"}')).toEqual({
            type: "error",
            error: "claude CLI not found",
        });
    });

    test("parses command events and done.commands", () => {
        const command = { op: "replace_range" as const, old_text: "a", new_text: "b" };
        expect(parseSseBlock(encodeSse({ type: "command", command }).trim())).toEqual({
            type: "command",
            command,
        });
        expect(
            parseSseBlock(
                encodeSse({ type: "done", text: "", commands: [command] }).trim()
            )
        ).toEqual({ type: "done", text: "", commands: [command] });
    });

    test("ignores [DONE] and junk", () => {
        expect(parseSseBlock("data: [DONE]")).toBeNull();
        expect(parseSseBlock("event: ping")).toBeNull();
        expect(parseSseBlock("data: {not json")).toBeNull();
        expect(parseSseBlock('data: {"type":"other"}')).toBeNull();
        expect(parseSseBlock('data: {"type":"command","command":{"op":"nope"}}')).toBeNull();
    });
});
