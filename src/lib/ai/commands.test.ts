import { describe, expect, test } from "bun:test";
import {
    CLI_DOCCOMMANDS_TRAILER,
    DOC_COMMAND_OPS,
    DOC_COMMAND_TOOLS,
    commandFromToolUse,
    dispatchDocCommands,
    extractDocCommandsFence,
    parseDocCommand,
    parseDocCommands,
    splitPipeRow,
    summarizeCommand,
} from "./commands";

const NOTE = [
    "# Scratch: commands",
    "",
    "The quick brown fox jumps over the lazy dog.",
    "",
    "| Name | Role |",
    "| --- | --- |",
    "| Ada | Engineer |",
].join("\n");

describe("registry", () => {
    test("four ops and matching tool names", () => {
        expect(DOC_COMMAND_OPS).toEqual([
            "replace_range",
            "insert_after_block",
            "table_add_row",
            "table_update_cell",
        ]);
        expect(DOC_COMMAND_TOOLS.map((t) => t.name)).toEqual([...DOC_COMMAND_OPS]);
        expect(CLI_DOCCOMMANDS_TRAILER).toContain("```doccommands");
    });
});

describe("parseDocCommand", () => {
    test("accepts the four shapes", () => {
        expect(parseDocCommand({ op: "replace_range", old_text: "a", new_text: "b" })).toEqual({
            op: "replace_range",
            old_text: "a",
            new_text: "b",
        });
        expect(parseDocCommand({ op: "insert_after_block", after: "# H", markdown: "x" })).toEqual({
            op: "insert_after_block",
            after: "# H",
            markdown: "x",
        });
        expect(parseDocCommand({ op: "table_add_row", table: 1, cells: ["a", "b"] })).toEqual({
            op: "table_add_row",
            table: 1,
            cells: ["a", "b"],
        });
        expect(
            parseDocCommand({ op: "table_update_cell", table: 1, row: 0, col: 1, text: "Title" })
        ).toEqual({ op: "table_update_cell", table: 1, row: 0, col: 1, text: "Title" });
    });

    test("rejects unknown ops and missing fields", () => {
        expect(parseDocCommand({ op: "drop_table" })).toEqual({
            error: "Unknown command op: drop_table.",
        });
        expect(parseDocCommand({ op: "replace_range", old_text: "a" })).toEqual({
            error: "replace_range needs old_text and new_text.",
        });
    });

    test("commandFromToolUse fills op from the tool name", () => {
        expect(commandFromToolUse("table_add_row", { table: 1, cells: ["Grace"] })).toEqual({
            op: "table_add_row",
            table: 1,
            cells: ["Grace"],
        });
    });
});

describe("extractDocCommandsFence", () => {
    test("reads a doccommands fence", () => {
        const text = [
            "```doccommands",
            '[{"op":"replace_range","old_text":"fox","new_text":"cat"}]',
            "```",
        ].join("\n");
        expect(extractDocCommandsFence(text)).toEqual([
            { op: "replace_range", old_text: "fox", new_text: "cat" },
        ]);
    });

    test("reads a bare JSON array", () => {
        expect(extractDocCommandsFence('[{"op":"insert_after_block","after":"# H","markdown":"x"}]')).toEqual([
            { op: "insert_after_block", after: "# H", markdown: "x" },
        ]);
    });

    test("ignores ordinary markdown", () => {
        expect(extractDocCommandsFence("Hello **world**")).toBeNull();
        expect(extractDocCommandsFence("```markdown\nHi\n```")).toBeNull();
    });
});

describe("splitPipeRow", () => {
    test("splits and keeps escaped pipes", () => {
        expect(splitPipeRow("| Ada | Engineer |")).toEqual(["Ada", "Engineer"]);
        expect(splitPipeRow("| a\\|b | c |")).toEqual(["a\\|b", "c"]);
    });
});

describe("dispatchDocCommands", () => {
    test("replace_range swaps a unique span", () => {
        const planned = dispatchDocCommands(NOTE, [
            { op: "replace_range", old_text: "quick brown fox", new_text: "quicker fox" },
        ]);
        expect(planned.ok).toBe(true);
        if (!planned.ok) return;
        expect(planned.markdown).toContain("The quicker fox jumps");
        expect(planned.markdown).not.toContain("quick brown fox");
        expect(planned.edits[0]?.summary).toContain("Replace");
    });

    test("replace_range errors when missing or duplicated", () => {
        const missing = dispatchDocCommands(NOTE, [
            { op: "replace_range", old_text: "nope", new_text: "x" },
        ]);
        expect(missing.ok).toBe(false);
        if (missing.ok) return;
        expect(missing.error).toMatch(/not found/);

        const dup = dispatchDocCommands("aaa aaa", [
            { op: "replace_range", old_text: "aaa", new_text: "b" },
        ]);
        expect(dup.ok).toBe(false);
        if (dup.ok) return;
        expect(dup.error).toMatch(/2 places/);
    });

    test("insert_after_block after a heading", () => {
        const planned = dispatchDocCommands(NOTE, [
            { op: "insert_after_block", after: "# Scratch: commands", markdown: "A new paragraph." },
        ]);
        expect(planned.ok).toBe(true);
        if (!planned.ok) return;
        expect(planned.markdown).toContain("# Scratch: commands\n\nA new paragraph.\n\nThe quick");
    });

    test("insert_after_block after the table", () => {
        const planned = dispatchDocCommands(NOTE, [
            { op: "insert_after_block", after: "| Ada | Engineer |", markdown: "Done." },
        ]);
        expect(planned.ok).toBe(true);
        if (!planned.ok) return;
        expect(planned.markdown.trim().endsWith("Done.")).toBe(true);
        expect(planned.markdown).toContain("| Ada | Engineer |");
    });

    test("table_add_row appends and pads", () => {
        const planned = dispatchDocCommands(NOTE, [
            { op: "table_add_row", table: 1, cells: ["Grace"] },
        ]);
        expect(planned.ok).toBe(true);
        if (!planned.ok) return;
        expect(planned.markdown).toContain("| Grace |  |");
        expect(planned.markdown).toContain("| Ada | Engineer |");
    });

    test("table_add_row after the header", () => {
        const planned = dispatchDocCommands(NOTE, [
            { op: "table_add_row", table: 1, cells: ["Grace", "Architect"], after_row: 0 },
        ]);
        expect(planned.ok).toBe(true);
        if (!planned.ok) return;
        const lines = planned.markdown.split("\n");
        const headerAt = lines.findIndex((l) => l.includes("| Name | Role |"));
        expect(lines[headerAt + 2]).toContain("| Grace | Architect |");
        expect(lines[headerAt + 3]).toContain("| Ada | Engineer |");
    });

    test("table_update_cell sets header and body", () => {
        const planned = dispatchDocCommands(NOTE, [
            { op: "table_update_cell", table: 1, row: 0, col: 1, text: "Title" },
            { op: "table_update_cell", table: 1, row: 1, col: 0, text: "Ada Lovelace" },
        ]);
        expect(planned.ok).toBe(true);
        if (!planned.ok) return;
        expect(planned.markdown).toContain("| Name | Title |");
        expect(planned.markdown).toContain("| Ada Lovelace | Engineer |");
    });

    test("table ops error on a missing table or out-of-range cell", () => {
        const missing = dispatchDocCommands(NOTE, [
            { op: "table_add_row", table: 2, cells: ["x"] },
        ]);
        expect(missing.ok).toBe(false);
        if (missing.ok) return;
        expect(missing.error).toMatch(/no table 2/);

        const oob = dispatchDocCommands(NOTE, [
            { op: "table_update_cell", table: 1, row: 9, col: 0, text: "x" },
        ]);
        expect(oob.ok).toBe(false);
        if (oob.ok) return;
        expect(oob.error).toMatch(/row 9 is out of range/);
    });

    test("a batch applies in order against the updated document", () => {
        const planned = dispatchDocCommands(NOTE, [
            { op: "replace_range", old_text: "lazy dog", new_text: "sleeping dog" },
            { op: "table_add_row", table: 1, cells: ["Grace", "Architect"] },
        ]);
        expect(planned.ok).toBe(true);
        if (!planned.ok) return;
        expect(planned.markdown).toContain("sleeping dog");
        expect(planned.markdown).toContain("| Grace | Architect |");
        expect(planned.edits).toHaveLength(2);
    });

    test("empty batch is an error", () => {
        expect(dispatchDocCommands(NOTE, []).ok).toBe(false);
    });
});

describe("summarizeCommand", () => {
    test("clips long spans", () => {
        const summary = summarizeCommand({
            op: "replace_range",
            old_text: "a".repeat(80),
            new_text: "b",
        });
        expect(summary.startsWith('Replace "')).toBe(true);
        expect(summary).toContain("…");
        expect(summary.length).toBeLessThan(120);
    });
});

describe("parseDocCommands", () => {
    test("parses an array or a single object", () => {
        const many = parseDocCommands([
            { op: "replace_range", old_text: "a", new_text: "b" },
            { op: "table_add_row", table: 1, cells: [] },
        ]);
        expect(Array.isArray(many) && many).toHaveLength(2);
        const one = parseDocCommands({ op: "replace_range", old_text: "a", new_text: "b" });
        expect(Array.isArray(one) && one).toHaveLength(1);
    });
});
