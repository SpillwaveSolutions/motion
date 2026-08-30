import { describe, expect, test } from "bun:test";
import { askAiStatesEqual, isAskAiPanelOpen, type AskAiState } from "./AskAi";

describe("askAiStatesEqual", () => {
    test("two idle states are equal so selection updates do not loop", () => {
        expect(askAiStatesEqual({ phase: "idle" }, { phase: "idle" })).toBe(true);
    });

    test("bubble equality is range + rounded pixels", () => {
        const a: AskAiState = {
            phase: "bubble",
            range: { from: 2, to: 8 },
            selectedText: "hello",
            top: 40.2,
            left: 10.4,
        };
        const b: AskAiState = { ...a, top: 40.4, left: 10.1 };
        expect(askAiStatesEqual(a, b)).toBe(true);
        expect(askAiStatesEqual(a, { ...a, range: { from: 2, to: 9 } })).toBe(false);
    });

    test("instruction edits are not equal", () => {
        const a: AskAiState = {
            phase: "prompt",
            scope: "selection",
            range: { from: 1, to: 2 },
            selectedText: "x",
            instruction: "a",
        };
        expect(askAiStatesEqual(a, { ...a, instruction: "b" })).toBe(false);
        expect(askAiStatesEqual(a, { ...a })).toBe(true);
    });
});

describe("isAskAiPanelOpen", () => {
    test("idle and bubble are closed; the rest are open", () => {
        expect(isAskAiPanelOpen({ phase: "idle" })).toBe(false);
        expect(
            isAskAiPanelOpen({
                phase: "bubble",
                range: { from: 1, to: 2 },
                selectedText: "x",
                top: 0,
                left: 0,
            })
        ).toBe(false);
        expect(
            isAskAiPanelOpen({
                phase: "prompt",
                scope: "cursor",
                range: { from: 1, to: 1 },
                selectedText: "",
                instruction: "",
            })
        ).toBe(true);
    });
});
