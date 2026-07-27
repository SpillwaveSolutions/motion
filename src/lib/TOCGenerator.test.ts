import { test, expect, describe, spyOn } from "bun:test";
import { TOCGenerator } from "./TOCGenerator";
import * as cliWrappers from "./cliWrappers";

describe("TOCGenerator", () => {
    test("enrichTOC should return LLM content", async () => {
        const mockCallLLM = spyOn(cliWrappers, "callLLM").mockResolvedValue({
            content: "Enriched TOC content",
            rawOutput: "Enriched TOC content"
        });

        const generator = new TOCGenerator("claude");
        const result = await generator.enrichTOC("# TOC", { "Topic": ["Summary"] });

        expect(result).toBe("Enriched TOC content");
        expect(mockCallLLM).toHaveBeenCalled();

        mockCallLLM.mockRestore();
    });
});
