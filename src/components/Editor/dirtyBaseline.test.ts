import { test, expect, describe } from "bun:test";
import {
    applySerializedMarkdown,
    beginHydration,
    endHydration,
    isDirtyMarkdown,
} from "./dirtyBaseline";

describe("applySerializedMarkdown", () => {
    test("hydration adopts serializer output as the clean baseline", () => {
        const next = applySerializedMarkdown(
            beginHydration("# Tight\n\n|A|B|\n"),
            "# Tight\n\n| A | B |\n"
        );
        expect(next.dirty).toBe(false);
        expect(next.snapshot).toBe("# Tight\n\n| A | B |\n");
        expect(next.hydrating).toBe(true);
    });

    test("a later hydration tick that only pads pipes stays clean", () => {
        const mid = applySerializedMarkdown(
            beginHydration("|A|B|"),
            "| A | B |"
        );
        const settled = applySerializedMarkdown(
            { snapshot: mid.snapshot, hydrating: true },
            "| A | B |"
        );
        expect(settled.dirty).toBe(false);
        expect(settled.snapshot).toBe("| A | B |");
    });

    test("after hydration, a real edit is dirty", () => {
        const clean = endHydration("# Hello\n");
        const next = applySerializedMarkdown(clean, "# Hello\n\nedited\n");
        expect(next.dirty).toBe(true);
        expect(next.snapshot).toBe("# Hello\n");
        expect(next.hydrating).toBe(false);
    });

    test("after hydration, an identical re-serialize is not dirty", () => {
        const clean = endHydration("| A | B |\n");
        const next = applySerializedMarkdown(clean, "| A | B |\n");
        expect(next.dirty).toBe(false);
    });
});

describe("isDirtyMarkdown", () => {
    test("compares exact bytes — no silent trim", () => {
        expect(isDirtyMarkdown("a\n", "a\n")).toBe(false);
        expect(isDirtyMarkdown("a\n", "a")).toBe(true);
        expect(isDirtyMarkdown("a ", "a")).toBe(true);
    });
});
