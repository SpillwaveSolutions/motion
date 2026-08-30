import { describe, expect, test } from "bun:test";
import { clampPos, planWysiwygApply, visibleApplyModes } from "./apply";

describe("visibleApplyModes", () => {
    test("document (Refine) is replace only", () => {
        expect(visibleApplyModes("document")).toEqual(["replace"]);
    });

    test("cursor (/ai) is insert-below only", () => {
        expect(visibleApplyModes("cursor")).toEqual(["insert-below"]);
    });

    test("selection offers both", () => {
        expect(visibleApplyModes("selection")).toEqual(["replace", "insert-below"]);
    });
});

describe("planWysiwygApply", () => {
    test("document always setContents", () => {
        expect(planWysiwygApply("document", "replace", { from: 2, to: 10 })).toEqual({
            kind: "setContent",
        });
    });

    test("selection replace uses the stored range", () => {
        expect(planWysiwygApply("selection", "replace", { from: 4, to: 9 })).toEqual({
            kind: "replaceRange",
            from: 4,
            to: 9,
        });
    });

    test("insert-below inserts at range.to", () => {
        expect(planWysiwygApply("selection", "insert-below", { from: 4, to: 9 })).toEqual({
            kind: "insertAt",
            pos: 9,
        });
        expect(planWysiwygApply("cursor", "insert-below", { from: 3, to: 3 })).toEqual({
            kind: "insertAt",
            pos: 3,
        });
    });
});

describe("clampPos", () => {
    test("stays inside the document", () => {
        expect(clampPos(0, 10)).toBe(1);
        expect(clampPos(99, 10)).toBe(10);
        expect(clampPos(5, 10)).toBe(5);
        expect(clampPos(1, 0)).toBe(0);
    });
});
