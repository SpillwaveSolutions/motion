import { describe, expect, test } from "bun:test";
import { buildAiContext, titleFromPath } from "./context";

describe("titleFromPath", () => {
    test("strips the markdown extension and directory", () => {
        expect(titleFromPath("notes/hello.md")).toBe("hello");
        expect(titleFromPath("notes/Hello World.mdx")).toBe("Hello World");
        expect(titleFromPath(null)).toBe("untitled");
        expect(titleFromPath("")).toBe("untitled");
    });
});

describe("buildAiContext", () => {
    test("keeps small documents intact", () => {
        const ctx = buildAiContext({
            title: "Note",
            before: "Hello ",
            selection: "world",
            after: "!",
            priorOps: [],
        });
        expect(ctx.title).toBe("Note");
        expect(ctx.before).toBe("Hello ");
        expect(ctx.selection).toBe("world");
        expect(ctx.after).toBe("!");
        expect(ctx.truncated).toBe(false);
        expect(ctx.priorOps).toEqual([]);
    });

    test("truncates before from the start so text near the selection survives", () => {
        const ctx = buildAiContext({
            title: "t",
            before: "AAAA" + "B".repeat(40),
            selection: "SEL",
            after: "C".repeat(40) + "DDDD",
            priorOps: [],
            budget: 40,
        });
        expect(ctx.truncated).toBe(true);
        expect(ctx.before.startsWith("…")).toBe(true);
        expect(ctx.before.endsWith("B")).toBe(true);
        expect(ctx.after.endsWith("…")).toBe(true);
        expect(ctx.after.startsWith("C")).toBe(true);
        expect(ctx.selection).toBe("SEL");
        expect(ctx.title).toBe("t");
    });

    test("caps a huge selection rather than dropping surrounding text entirely", () => {
        const ctx = buildAiContext({
            title: "t",
            before: "before",
            selection: "S".repeat(5000),
            after: "after",
            priorOps: [],
            budget: 100,
        });
        expect(ctx.truncated).toBe(true);
        expect((ctx.selection ?? "").length).toBeLessThanOrEqual(50);
        expect((ctx.selection ?? "").endsWith("…")).toBe(true);
    });

    test("keeps only the most recent prior ops and shortens them", () => {
        const priorOps = Array.from({ length: 10 }, (_, i) => ({
            instruction: `do ${i} ` + "x".repeat(300),
            resultSummary: `out ${i} ` + "y".repeat(300),
        }));
        const ctx = buildAiContext({
            title: "t",
            before: "",
            selection: null,
            after: "body",
            priorOps,
            budget: 8000,
        });
        expect(ctx.priorOps).toHaveLength(6);
        expect(ctx.priorOps[0]?.instruction.startsWith("do 4")).toBe(true);
        expect(ctx.priorOps.every((op) => op.instruction.length <= 200)).toBe(true);
        expect(ctx.priorOps.every((op) => op.resultSummary.length <= 240)).toBe(true);
    });

    test("falls back to untitled when the title is blank", () => {
        const ctx = buildAiContext({
            title: "   ",
            before: "",
            selection: null,
            after: "x",
            priorOps: [],
        });
        expect(ctx.title).toBe("untitled");
    });
});
