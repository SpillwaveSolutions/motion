import { describe, expect, spyOn, test } from "bun:test";
import * as llmClient from "../llmClient";
import { runAskAi } from "./run";

describe("runAskAi", () => {
    test("packs context, calls the LLM, and unwraps a wrapping fence", async () => {
        const spy = spyOn(llmClient, "callLLMFromUI").mockResolvedValue({
            content: "```markdown\nRewritten line.\n```",
            rawOutput: "```markdown\nRewritten line.\n```",
        });

        const reply = await runAskAi({
            title: "Note",
            before: "Hello ",
            selection: "world",
            after: ".",
            priorOps: [],
            instruction: "Rewrite",
        });

        expect(reply).toBe("Rewritten line.");
        expect(spy).toHaveBeenCalledTimes(1);
        const arg = spy.mock.calls[0]?.[1] as { prompt?: string; systemPrompt?: string };
        expect(arg.prompt).toContain("Document title: Note");
        expect(arg.prompt).toContain("Instruction:\nRewrite");
        expect(arg.prompt).toContain("world");
        spy.mockRestore();
    });

    test("rejects a blank instruction before calling the LLM", async () => {
        const spy = spyOn(llmClient, "callLLMFromUI").mockResolvedValue({
            content: "nope",
            rawOutput: "nope",
        });
        await expect(
            runAskAi({
                title: "Note",
                before: "",
                selection: null,
                after: "body",
                priorOps: [],
                instruction: "   ",
            })
        ).rejects.toThrow(/instruction/i);
        expect(spy).not.toHaveBeenCalled();
        spy.mockRestore();
    });

    test("rejects an empty model reply", async () => {
        const spy = spyOn(llmClient, "callLLMFromUI").mockResolvedValue({
            content: "```\n\n```",
            rawOutput: "",
        });
        await expect(
            runAskAi({
                title: "Note",
                before: "",
                selection: null,
                after: "body",
                priorOps: [],
                instruction: "Refine",
            })
        ).rejects.toThrow(/empty/i);
        spy.mockRestore();
    });
});
