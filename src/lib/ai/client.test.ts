import { describe, expect, spyOn, test } from "bun:test";
import { prepareAskAiRequest, sseBodyFromEvents, streamAskAiFromUI } from "./client";
import { AI_STREAM_PATH } from "./protocol";

const INPUT = {
    title: "Note",
    before: "Hello ",
    selection: "world",
    after: ".",
    priorOps: [],
    instruction: "Rewrite",
};

describe("prepareAskAiRequest", () => {
    test("splits cacheable context from the instruction", () => {
        const packed = prepareAskAiRequest(INPUT);
        expect(packed.context).toContain("Document title: Note");
        expect(packed.context).toContain("world");
        expect(packed.context).not.toContain("Instruction:\nRewrite");
        expect(packed.instruction).toBe("Rewrite");
        expect(packed.prompt).toContain("Instruction:\nRewrite");
    });

    test("rejects a blank instruction", () => {
        expect(() => prepareAskAiRequest({ ...INPUT, instruction: "  " })).toThrow(/instruction/i);
    });
});

describe("streamAskAiFromUI", () => {
    test("reads SSE deltas and returns the done text", async () => {
        const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
            new Response(
                sseBodyFromEvents([
                    { type: "delta", text: "Hel" },
                    { type: "delta", text: "lo" },
                    { type: "done", text: "Hello" },
                ]),
                { status: 200, headers: { "Content-Type": "text/event-stream" } }
            )
        );
        const seen: string[] = [];
        const reply = await streamAskAiFromUI(INPUT, { onText: (t) => seen.push(t) });
        expect(reply).toBe("Hello");
        expect(seen).toEqual(["Hel", "Hello", "Hello"]);
        expect(fetchSpy).toHaveBeenCalledTimes(1);
        const call = fetchSpy.mock.calls[0];
        expect(call?.[0]).toBe(AI_STREAM_PATH);
        fetchSpy.mockRestore();
    });

    test("unwraps a wrapping fence on done", async () => {
        const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
            new Response(
                sseBodyFromEvents([
                    { type: "delta", text: "```markdown\nHi\n```" },
                    { type: "done", text: "```markdown\nHi\n```" },
                ]),
                { status: 200, headers: { "Content-Type": "text/event-stream" } }
            )
        );
        const reply = await streamAskAiFromUI(INPUT);
        expect(reply).toBe("Hi");
        fetchSpy.mockRestore();
    });

    test("error events throw without a 4xx", async () => {
        const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
            new Response(sseBodyFromEvents([{ type: "error", error: "claude CLI not found" }]), {
                status: 200,
                headers: { "Content-Type": "text/event-stream" },
            })
        );
        await expect(streamAskAiFromUI(INPUT)).rejects.toThrow(/claude CLI not found/);
        fetchSpy.mockRestore();
    });
});
