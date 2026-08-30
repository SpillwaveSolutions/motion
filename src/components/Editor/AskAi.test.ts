import { describe, expect, test } from "bun:test";
import { applyEditsLabel, askAiStatesEqual, isAskAiPanelOpen, type AskAiState } from "./AskAi";

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

    test("command lists are part of equality", () => {
        const a: AskAiState = {
            phase: "preview",
            scope: "document",
            range: null,
            selectedText: "",
            instruction: "add a row",
            commands: [{ op: "table_add_row", table: 1, cells: ["Grace"] }],
        };
        expect(askAiStatesEqual(a, { ...a })).toBe(true);
        expect(
            askAiStatesEqual(a, {
                ...a,
                commands: [{ op: "table_add_row", table: 1, cells: ["Ada"] }],
            })
        ).toBe(false);
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

describe("applyEditsLabel", () => {
    test("singular and plural", () => {
        expect(applyEditsLabel(1)).toBe("Apply 1 edit");
        expect(applyEditsLabel(3)).toBe("Apply 3 edits");
    });
});

