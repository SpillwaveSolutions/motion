import { describe, expect, test } from "bun:test";
import {
    enclosingTableEnd,
    filterSlashCommands,
    INSERT_COMMANDS,
    shiftForDeletedRange,
    SLASH_COMMANDS,
    type ResolvedPosLike,
} from "./insertBlock";

/**
 * A stand-in for ProseMirror's ResolvedPos: `names` is the node at each depth
 * from the doc (0) down to the caret, and `ends[d]` is the position after the
 * node at depth d.
 */
function resolvedPos(names: string[], ends: Record<number, number> = {}): ResolvedPosLike {
    return {
        depth: names.length - 1,
        node: (depth: number) => ({ type: { name: names[depth] ?? "unknown" } }),
        after: (depth: number) => ends[depth] ?? -1,
    };
}

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

describe("enclosingTableEnd", () => {
    test("a caret in a paragraph is not in a table", () => {
        expect(enclosingTableEnd(resolvedPos(["doc", "paragraph"]))).toBeNull();
    });

    test("a caret in a cell reports the position after the table", () => {
        const $from = resolvedPos(["doc", "table", "tableRow", "tableCell", "paragraph"], {
            1: 42,
        });
        expect(enclosingTableEnd($from)).toBe(42);
    });

    test("a nested table escapes to the OUTERMOST table, not the inner one", () => {
        // doc > table > row > cell > table > row > cell > paragraph
        const $from = resolvedPos(
            [
                "doc",
                "table",
                "tableRow",
                "tableCell",
                "table",
                "tableRow",
                "tableCell",
                "paragraph",
            ],
            { 1: 100, 4: 60 },
        );
        expect(enclosingTableEnd($from)).toBe(100);
    });

    test("a table inside a blockquote is still found", () => {
        const $from = resolvedPos(["doc", "blockquote", "table", "tableRow", "tableCell"], {
            2: 17,
        });
        expect(enclosingTableEnd($from)).toBe(17);
    });
});

describe("shiftForDeletedRange", () => {
    test("no range leaves the position alone", () => {
        expect(shiftForDeletedRange(42)).toBe(42);
    });

    test("a deletion before the position shifts it back by the deleted length", () => {
        // "/tab" typed in a cell, deleted before the table-end insert runs.
        expect(shiftForDeletedRange(42, { from: 10, to: 14 })).toBe(38);
    });

    test("a deletion after the position leaves it alone", () => {
        expect(shiftForDeletedRange(42, { from: 50, to: 54 })).toBe(42);
    });

    test("a deletion ending exactly at the position still shifts it", () => {
        expect(shiftForDeletedRange(42, { from: 38, to: 42 })).toBe(38);
    });
});
