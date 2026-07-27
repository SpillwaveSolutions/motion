import { test, expect, describe, spyOn } from "bun:test";
import { SkillGenerator } from "./SkillGenerator";
import * as cliWrappers from "./cliWrappers";

describe("SkillGenerator", () => {
    test("generateSkill should return LLM content", async () => {
        const mockCallLLM = spyOn(cliWrappers, "callLLM").mockResolvedValue({
            content: "# Skill Test content",
            rawOutput: "# Skill Test content"
        });

        const generator = new SkillGenerator("claude");
        const result = await generator.generateSkill("Test Topic", ["Summary"]);

        expect(result).toBe("# Skill Test content");
        expect(mockCallLLM).toHaveBeenCalled();

        mockCallLLM.mockRestore();
    });
});
