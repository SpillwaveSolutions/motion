import { describe, expect, test } from "bun:test";
import {
    SIDEBAR_MAX,
    SIDEBAR_MIN,
    SPLIT_MAX,
    SPLIT_MIN,
    clampSidebarWidth,
    clampSplitRatio,
    sidebarWidthFromKey,
    sidebarWidthFromPointer,
    splitRatioFromKey,
    splitRatioFromPointer,
} from "./layout";

describe("clampSidebarWidth", () => {
    test("passes through in range and rounds", () => {
        expect(clampSidebarWidth(280)).toBe(280);
        expect(clampSidebarWidth(199.6)).toBe(200);
    });

    test("clamps to 180–480 so a drag cannot hide the tree or the editor", () => {
        expect(clampSidebarWidth(10)).toBe(SIDEBAR_MIN);
        expect(clampSidebarWidth(900)).toBe(SIDEBAR_MAX);
        expect(clampSidebarWidth(Number.NaN)).toBe(SIDEBAR_MIN);
    });
});

describe("clampSplitRatio", () => {
    test("passes through in range", () => {
        expect(clampSplitRatio(0.5)).toBe(0.5);
        expect(clampSplitRatio(0.333)).toBe(0.333);
    });

    test("clamps to 25–75%", () => {
        expect(clampSplitRatio(0)).toBe(SPLIT_MIN);
        expect(clampSplitRatio(1)).toBe(SPLIT_MAX);
        expect(clampSplitRatio(Number.NaN)).toBe(SPLIT_MIN);
    });
});

describe("pointer math", () => {
    test("sidebar follows the pointer and stops at the clamp", () => {
        expect(sidebarWidthFromPointer(280, 40)).toBe(320);
        expect(sidebarWidthFromPointer(280, -200)).toBe(SIDEBAR_MIN);
        expect(sidebarWidthFromPointer(280, 400)).toBe(SIDEBAR_MAX);
    });

    test("split ratio is dx over container width", () => {
        expect(splitRatioFromPointer(0.5, 100, 400)).toBe(0.75);
        expect(splitRatioFromPointer(0.5, -100, 400)).toBe(0.25);
        expect(splitRatioFromPointer(0.5, 50, 0)).toBe(0.5);
        expect(splitRatioFromPointer(0.5, 50, -1)).toBe(0.5);
    });
});

describe("keyboard", () => {
    test("sidebar arrows, Home, End", () => {
        expect(sidebarWidthFromKey(280, "ArrowLeft")).toBe(264);
        expect(sidebarWidthFromKey(280, "ArrowRight")).toBe(296);
        expect(sidebarWidthFromKey(280, "Home")).toBe(SIDEBAR_MIN);
        expect(sidebarWidthFromKey(280, "End")).toBe(SIDEBAR_MAX);
        expect(sidebarWidthFromKey(280, "a")).toBe(null);
    });

    test("split arrows, Home, End", () => {
        expect(splitRatioFromKey(0.5, "ArrowLeft")).toBe(0.48);
        expect(splitRatioFromKey(0.5, "ArrowRight")).toBe(0.52);
        expect(splitRatioFromKey(0.5, "Home")).toBe(SPLIT_MIN);
        expect(splitRatioFromKey(0.5, "End")).toBe(SPLIT_MAX);
        expect(splitRatioFromKey(0.5, "a")).toBe(null);
    });
});
