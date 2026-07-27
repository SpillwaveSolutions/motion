import { test, expect, describe } from "bun:test";
import { stripCodeFence } from "./DiagramGenExtension";

describe("stripCodeFence", () => {
    test("strips a ```mermaid fenced block", () => {
        expect(stripCodeFence("```mermaid\ngraph TD\n  A --> B\n```")).toBe("graph TD\n  A --> B");
    });

    test("strips a plain ``` fenced block", () => {
        expect(stripCodeFence("```\ngraph TD\n  A --> B\n```")).toBe("graph TD\n  A --> B");
    });

    test("leaves unfenced content unchanged", () => {
        expect(stripCodeFence("graph TD\n  A --> B")).toBe("graph TD\n  A --> B");
    });

    test("trims surrounding whitespace either way", () => {
        expect(stripCodeFence("  \n```mermaid\ngraph TD\n```\n  ")).toBe("graph TD");
    });
});
