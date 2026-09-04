import { test, expect, describe, spyOn } from "bun:test";
import { ReadmeGenerator } from "./ReadmeGenerator";
import * as llmClient from "./llmClient";

describe("ReadmeGenerator", () => {
    test("generateReadme returns the LLM content", async () => {
        const mockCallLLM = spyOn(llmClient, "callLLMFromUI").mockResolvedValue({
            content: "# Architecture\n\nNotes on the system.\n",
            rawOutput: "# Architecture\n\nNotes on the system.\n",
        });

        const generator = new ReadmeGenerator("claude");
        const result = await generator.generateReadme("Architecture", ["Testing"], ["Summary"]);

        expect(result).toContain("# Architecture");
        expect(mockCallLLM).toHaveBeenCalled();
        const prompt = mockCallLLM.mock.calls[0]?.[1]?.prompt ?? "";
        expect(prompt).toContain("folder README");
        expect(prompt).toContain("Testing");

        mockCallLLM.mockRestore();
    });
});
