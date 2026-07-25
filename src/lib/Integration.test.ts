import { test, expect, describe, spyOn } from "bun:test";
import { ContentInjector } from "./ContentInjector";
import { TopicRefiner } from "./TopicRefiner";
import * as cliWrappers from "./cliWrappers";

describe("End-to-End Integration Mock", () => {
    test("full enrichment pipeline flow with mocked LLM", async () => {
        const mockCallLLM = spyOn(cliWrappers, "callLLM").mockImplementation(
            async (_provider, options) => {
                const prompt = options.prompt.toLowerCase();
                if (prompt.includes("return the result in json format") || prompt.includes("suggestedlabels")) {
                    return {
                        content: JSON.stringify({
                            suggestedLabels: ["architecture", "storage"],
                            shouldSplit: false,
                            reasoning: "Summaries share a coherent theme.",
                        }),
                        rawOutput: "",
                    };
                }
                if (prompt.includes("bullet-point summary") || prompt.includes("generate a concise")) {
                    return { content: "- Core concept covered", rawOutput: "" };
                }
                return { content: "Refined technical content with ```ts\nconst x = 1;\n```", rawOutput: "" };
            }
        );

        const injector = new ContentInjector("gemini");
        const refined = await injector.refineChunk("Raw draft", "Context about Motion");
        expect(refined.content).toContain("Refined");
        expect(refined.summary.length).toBeGreaterThan(0);
        expect(injector.verifyCodeBlocks(refined.content)).toBe(true);

        const refiner = new TopicRefiner("gemini");
        const analysis = await refiner.analyzeTopic([refined.summary]);
        expect(analysis.suggestedLabels).toEqual(["architecture", "storage"]);
        expect(analysis.shouldSplit).toBe(false);
        expect(typeof analysis.reasoning).toBe("string");

        mockCallLLM.mockRestore();
    });

    test("TopicRefiner rejects wrong-shaped JSON", async () => {
        const mockCallLLM = spyOn(cliWrappers, "callLLM").mockResolvedValue({
            content: JSON.stringify({ labels: ["oops"], split: true }),
            rawOutput: "",
        });

        const refiner = new TopicRefiner("gemini");
        const analysis = await refiner.analyzeTopic(["summary A"]);
        expect(analysis.suggestedLabels).toEqual([]);
        expect(analysis.shouldSplit).toBe(false);
        expect(analysis.reasoning).toContain("schema");

        mockCallLLM.mockRestore();
    });
});

describe("SQL safety helpers", () => {
    test("validateSelectSql allows SELECT and rejects multi-statement / DDL", async () => {
        const { validateSelectSql, clampLimit, validateIdentifier } = await import("./data/sqlSafety");

        expect(validateSelectSql("SELECT * FROM team LIMIT 5")).toBe("SELECT * FROM team LIMIT 5");
        expect(validateSelectSql("  select id from t;  ")).toBe("select id from t");
        expect(() => validateSelectSql("DROP TABLE team")).toThrow();
        expect(() => validateSelectSql("SELECT 1; DROP TABLE team")).toThrow();
        expect(() => validateSelectSql("INSERT INTO t VALUES (1)")).toThrow();

        expect(clampLimit("3")).toBe(3);
        expect(clampLimit(-1)).toBe(5);
        expect(clampLimit("999999")).toBe(10_000);
        expect(clampLimit("nope")).toBe(5);

        expect(validateIdentifier("team_events")).toBe("team_events");
        expect(() => validateIdentifier('team"; DROP TABLE x; --')).toThrow();
    });
});
