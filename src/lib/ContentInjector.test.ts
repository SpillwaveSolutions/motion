import { test, expect, describe, spyOn } from "bun:test";
import { ContentInjector } from "./ContentInjector";
import * as cliWrappers from "./cliWrappers";

describe("ContentInjector", () => {
    test("verifyCodeBlocks should detect unbalanced triple backticks", () => {
        const injector = new ContentInjector();

        expect(injector.verifyCodeBlocks("Valid ```code``` blocks")).toBe(true);
        expect(injector.verifyCodeBlocks("Invalid ```code blocks")).toBe(false);
        expect(injector.verifyCodeBlocks("Unbalanced ```code``` blocks ```more")).toBe(false);
        // Four fence markers → even count → balanced (both "valid" and "invalid" are closed)
        expect(injector.verifyCodeBlocks("Multiple ```valid``` and ```invalid``` blocks")).toBe(true);
        // Truly unbalanced multi-block case (three fence markers)
        expect(injector.verifyCodeBlocks("Multiple ```valid``` and ```invalid blocks")).toBe(false);
    });

    test("refineChunk should call LLM and return refined content", async () => {
        const mockCallLLM = spyOn(cliWrappers, "callLLM").mockResolvedValue({
            content: "Refined Content",
            rawOutput: "Refined Content"
        });

        const injector = new ContentInjector("gemini");
        const result = await injector.refineChunk("Raw Content", "Small Context");

        expect(result.content).toBe("Refined Content");
        expect(result.summary).toBe("Refined Content"); // Because mockCallLLM returns the same for summary call
        expect(mockCallLLM).toHaveBeenCalled();

        mockCallLLM.mockRestore();
    });
});
