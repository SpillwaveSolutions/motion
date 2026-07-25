import { test, expect, describe, spyOn } from "bun:test";
import { TopicRefiner } from "./TopicRefiner";
import { SkillGenerator } from "./SkillGenerator";
import { TOCGenerator } from "./TOCGenerator";
import * as cliWrappers from "./cliWrappers";

describe("TopicRefiner", () => {
    test("analyzeTopic should parse valid JSON from LLM", async () => {
        const mockResponse = {
            suggestedLabels: ["AI", "Machine Learning"],
            shouldSplit: false,
            reasoning: "Consistent content."
        };

        const mockCallLLM = spyOn(cliWrappers, "callLLM").mockResolvedValue({
            content: JSON.stringify(mockResponse),
            rawOutput: JSON.stringify(mockResponse)
        });

        const refiner = new TopicRefiner("gemini");
        const result = await refiner.analyzeTopic(["Summary 1", "Summary 2"]);

        expect(result.suggestedLabels).toContain("AI");
        expect(result.shouldSplit).toBe(false);
        expect(mockCallLLM).toHaveBeenCalled();

        mockCallLLM.mockRestore();
    });

    test("analyzeTopic should handle malformed JSON", async () => {
        const mockCallLLM = spyOn(cliWrappers, "callLLM").mockResolvedValue({
            content: "Invalid JSON response",
            rawOutput: "Invalid JSON response"
        });

        const refiner = new TopicRefiner("gemini");
        const result = await refiner.analyzeTopic(["Summary 1"]);

        expect(result.shouldSplit).toBe(false);
        expect(result.reasoning).toBe("Error parsing LLM response.");

        mockCallLLM.mockRestore();
    });
});

describe("SkillGenerator", () => {
    test("generateSkill should return LLM content", async () => {
        const mockCallLLM = spyOn(cliWrappers, "callLLM").mockResolvedValue({
            content: "# Skill Test content",
            rawOutput: "# Skill Test content"
        });

        const generator = new SkillGenerator("gemini");
        const result = await generator.generateSkill("Test Topic", ["Summary"]);

        expect(result).toBe("# Skill Test content");
        expect(mockCallLLM).toHaveBeenCalled();

        mockCallLLM.mockRestore();
    });
});

describe("TOCGenerator", () => {
    test("enrichTOC should return LLM content", async () => {
        const mockCallLLM = spyOn(cliWrappers, "callLLM").mockResolvedValue({
            content: "Enriched TOC content",
            rawOutput: "Enriched TOC content"
        });

        const generator = new TOCGenerator("gemini");
        const result = await generator.enrichTOC("# TOC", { "Topic": ["Summary"] });

        expect(result).toBe("Enriched TOC content");
        expect(mockCallLLM).toHaveBeenCalled();

        mockCallLLM.mockRestore();
    });
});
