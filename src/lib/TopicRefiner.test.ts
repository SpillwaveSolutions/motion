import { test, expect, describe, spyOn } from "bun:test";
import { TopicRefiner } from "./TopicRefiner";
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
