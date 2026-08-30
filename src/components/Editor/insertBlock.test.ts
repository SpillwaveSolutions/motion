import { describe, expect, test } from "bun:test";
import { filterSlashCommands, INSERT_COMMANDS, SLASH_COMMANDS } from "./insertBlock";

describe("SLASH_COMMANDS", () => {
    test("Ask AI is first, and the toolbar insert list stays insert-only", () => {
        expect(SLASH_COMMANDS[0]).toEqual({ kind: "ai", label: "Ask AI", id: "ask-ai" });
        expect(INSERT_COMMANDS.map((c) => c.label)).toEqual([
            "Mermaid",
            "Dataset",
            "Query",
            "AI Diagram",
            "AI Image",
        ]);
    });

    test("/ai ranks Ask AI first, then the other AI-matching labels", () => {
        const filtered = filterSlashCommands("ai");
        expect(filtered[0]?.kind).toBe("ai");
        expect(filtered[0]?.label).toBe("Ask AI");
        expect(filtered.map((c) => c.label)).toContain("AI Diagram");
        expect(filtered.map((c) => c.label)).toContain("AI Image");
        // Enter on /ai must not pick Mermaid even though "ai" sits inside the word.
        expect(filtered.findIndex((c) => c.label === "Mermaid")).toBeGreaterThan(0);
    });

    test("/mer still uniquely matches Mermaid", () => {
        const filtered = filterSlashCommands("mer");
        expect(filtered).toHaveLength(1);
        expect(filtered[0]).toMatchObject({ kind: "insert", label: "Mermaid" });
    });

    test("an empty query shows the full list", () => {
        expect(filterSlashCommands("")).toEqual(SLASH_COMMANDS);
        expect(filterSlashCommands("   ")).toEqual(SLASH_COMMANDS);
    });
});
