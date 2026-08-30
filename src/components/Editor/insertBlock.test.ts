import { describe, expect, test } from "bun:test";
import { filterSlashCommands, INSERT_COMMANDS, SLASH_COMMANDS } from "./insertBlock";

describe("SLASH_COMMANDS", () => {
    test("Ask AI is first, Table is next, and the toolbar insert list stays insert-only", () => {
        expect(SLASH_COMMANDS[0]).toEqual({ kind: "ai", label: "Ask AI", id: "ask-ai" });
        expect(SLASH_COMMANDS[1]).toEqual({ kind: "insert", label: "Table", nodeType: "table" });
        expect(INSERT_COMMANDS.map((c) => c.label)).toEqual([
            "Table",
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
        expect(filtered.map((c) => c.label)).not.toContain("Table");
    });

    test("/tab uniquely matches Table", () => {
        const filtered = filterSlashCommands("tab");
        expect(filtered).toHaveLength(1);
        expect(filtered[0]).toMatchObject({ kind: "insert", label: "Table", nodeType: "table" });
    });

    test("/mer still uniquely matches Mermaid", () => {
        const filtered = filterSlashCommands("mer");
        expect(filtered).toHaveLength(1);
        expect(filtered[0]).toMatchObject({ kind: "insert", label: "Mermaid" });
    });

    test("an empty query shows the full list", () => {
        expect(filterSlashCommands("")).toEqual(SLASH_COMMANDS);
        expect(filterSlashCommands("   ")).toEqual(SLASH_COMMANDS);
        expect(SLASH_COMMANDS).toHaveLength(7);
    });
});
