import { describe, expect, test } from "bun:test";
import { AiSessionLog, resetSessionsForTests, sessionForDoc, summarizeReply } from "./session";

describe("AiSessionLog", () => {
    test("rolls off old ops past the cap", () => {
        const log = new AiSessionLog(3);
        for (let i = 0; i < 5; i++) {
            log.push({
                instruction: `i${i}`,
                selection: null,
                resultSummary: `r${i}`,
                ts: i,
            });
        }
        expect(log.list().map((op) => op.instruction)).toEqual(["i2", "i3", "i4"]);
    });
});

describe("sessionForDoc", () => {
    test("isolates logs by path", () => {
        resetSessionsForTests();
        sessionForDoc("a.md").push({
            instruction: "a",
            selection: null,
            resultSummary: "A",
            ts: 1,
        });
        sessionForDoc("b.md").push({
            instruction: "b",
            selection: null,
            resultSummary: "B",
            ts: 1,
        });
        expect(sessionForDoc("a.md").list()).toHaveLength(1);
        expect(sessionForDoc("a.md").list()[0]?.instruction).toBe("a");
        expect(sessionForDoc("b.md").list()[0]?.instruction).toBe("b");
        expect(sessionForDoc("a.md")).toBe(sessionForDoc("a.md"));
        resetSessionsForTests();
    });
});

describe("summarizeReply", () => {
    test("collapses whitespace and caps length", () => {
        expect(summarizeReply("hello   world")).toBe("hello world");
        const long = "x".repeat(300);
        const summary = summarizeReply(long, 20);
        expect(summary.length).toBe(20);
        expect(summary.endsWith("…")).toBe(true);
    });
});
