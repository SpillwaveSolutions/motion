import { describe, expect, test } from "bun:test";
import { resolveAiBackend, streamAi } from "./service";
import type { AiStreamRequest } from "./protocol";

const REQ: AiStreamRequest = {
    systemPrompt: "sys",
    context: "Document title: Note\n\nText after the target:\nbody",
    instruction: "Rewrite",
};

describe("resolveAiBackend", () => {
    test("SDK when a key is present, CLI otherwise", () => {
        expect(resolveAiBackend("sk-ant-test")).toBe("anthropic");
        expect(resolveAiBackend("")).toBe("cli");
        expect(resolveAiBackend(undefined)).toBe("cli");
        expect(resolveAiBackend("  ")).toBe("cli");
    });
});

describe("streamAi", () => {
    test("streams SDK chunks then done, unwrapping a wrapping fence", async () => {
        const events = [];
        for await (const ev of streamAi(REQ, {
            apiKey: "sk-test",
            async *streamAnthropic() {
                yield { kind: "text", text: "```markdown\n" };
                yield { kind: "text", text: "Hello " };
                yield { kind: "text", text: "world.\n```" };
            },
        })) {
            events.push(ev);
        }
        expect(events.filter((e) => e.type === "delta")).toHaveLength(3);
        expect(events.at(-1)).toEqual({ type: "done", text: "Hello world." });
    });

    test("SDK tool calls become command events plus done.commands", async () => {
        const command = {
            op: "replace_range" as const,
            old_text: "body",
            new_text: "edited",
        };
        const events = [];
        for await (const ev of streamAi(REQ, {
            apiKey: "sk-test",
            async *streamAnthropic() {
                yield { kind: "command", command };
            },
        })) {
            events.push(ev);
        }
        expect(events).toEqual([
            { type: "command", command },
            { type: "done", text: "", commands: [command] },
        ]);
    });

    test("CLI fallback is one delta plus done", async () => {
        const events = [];
        for await (const ev of streamAi(REQ, {
            apiKey: "",
            callLLM: async () => ({ content: "CLI reply", rawOutput: "CLI reply" }),
        })) {
            events.push(ev);
        }
        expect(events).toEqual([
            { type: "delta", text: "CLI reply" },
            { type: "done", text: "CLI reply" },
        ]);
    });

    test("CLI doccommands fence becomes command events", async () => {
        const fence = [
            "```doccommands",
            '[{"op":"table_add_row","table":1,"cells":["Grace","Architect"]}]',
            "```",
        ].join("\n");
        const events = [];
        for await (const ev of streamAi(REQ, {
            apiKey: "",
            callLLM: async () => ({ content: fence, rawOutput: fence }),
        })) {
            events.push(ev);
        }
        expect(events[0]).toEqual({
            type: "command",
            command: { op: "table_add_row", table: 1, cells: ["Grace", "Architect"] },
        });
        expect(events.at(-1)).toMatchObject({ type: "done", commands: [expect.objectContaining({ op: "table_add_row" })] });
    });

    test("blank instruction is an error event, not a throw", async () => {
        const events = [];
        for await (const ev of streamAi({ ...REQ, instruction: "  " }, { apiKey: "sk" })) {
            events.push(ev);
        }
        expect(events).toEqual([{ type: "error", error: "Ask AI needs an instruction." }]);
    });

    test("CLI throw becomes an error event", async () => {
        const events = [];
        for await (const ev of streamAi(REQ, {
            apiKey: "",
            callLLM: async () => {
                throw new Error("claude CLI not found");
            },
        })) {
            events.push(ev);
        }
        expect(events).toEqual([{ type: "error", error: "claude CLI not found" }]);
    });

    test("empty model reply is an error", async () => {
        const events = [];
        for await (const ev of streamAi(REQ, {
            apiKey: "",
            callLLM: async () => ({ content: "```\n\n```", rawOutput: "" }),
        })) {
            events.push(ev);
        }
        expect(events[0]).toEqual({ type: "error", error: "The model returned an empty reply." });
    });
});
