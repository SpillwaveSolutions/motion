import { describe, expect, test } from "bun:test";
import { buildAiContext } from "./context";
import { cannedForScope, packPrompt, packPromptParts, unwrapReply } from "./prompt";

describe("unwrapReply", () => {
    test("returns plain text unchanged", () => {
        expect(unwrapReply("hello")).toBe("hello");
        expect(unwrapReply("  hello\n")).toBe("hello");
    });

    test("unwraps a reply that is only a markdown fence", () => {
        expect(unwrapReply("```markdown\nHello\n```")).toBe("Hello");
        expect(unwrapReply("```md\nHello\n```")).toBe("Hello");
        expect(unwrapReply("```\nHello\n```")).toBe("Hello");
    });

    test("does not unwrap a fence that is only part of the reply", () => {
        const body = "Intro\n```\ncode\n```";
        expect(unwrapReply(body)).toBe(body);
    });

    test("does not unwrap a non-markdown language fence", () => {
        const body = "```ts\nconst x = 1;\n```";
        expect(unwrapReply(body)).toBe(body);
    });
});

describe("cannedForScope", () => {
    test("selection chips do not include Continue or Refine", () => {
        const ids = cannedForScope("selection").map((c) => c.id);
        expect(ids).toContain("rewrite");
        expect(ids).toContain("tighten");
        expect(ids).not.toContain("continue");
        expect(ids).not.toContain("refine");
    });

    test("cursor chips include Continue", () => {
        const ids = cannedForScope("cursor").map((c) => c.id);
        expect(ids).toContain("continue");
        expect(ids).toContain("expand");
        expect(ids).not.toContain("rewrite");
    });

    test("document chips include Refine", () => {
        const ids = cannedForScope("document").map((c) => c.id);
        expect(ids).toContain("refine");
        expect(ids).toContain("grammar");
        expect(ids).not.toContain("continue");
    });
});

describe("packPrompt", () => {
    test("includes title, instruction, selection, and prior ops", () => {
        const ctx = buildAiContext({
            title: "Spec",
            before: "alpha",
            selection: "beta",
            after: "gamma",
            priorOps: [{ instruction: "tighten", resultSummary: "shorter beta" }],
        });
        const packed = packPrompt(ctx, "Rewrite it");
        expect(packed.systemPrompt).toContain("technical editor");
        expect(packed.prompt).toContain("Document title: Spec");
        expect(packed.prompt).toContain("Selected text (the target):\nbeta");
        expect(packed.prompt).toContain("Text before the target:\nalpha");
        expect(packed.prompt).toContain("Text after the target:\ngamma");
        expect(packed.prompt).toContain("Instruction:\nRewrite it");
        expect(packed.prompt).toContain("tighten");
        expect(packed.prompt).toContain("shorter beta");
    });

    test("says when nothing is selected", () => {
        const ctx = buildAiContext({
            title: "Spec",
            before: "alpha",
            selection: null,
            after: "gamma",
            priorOps: [],
        });
        const packed = packPrompt(ctx, "Continue");
        expect(packed.prompt).toContain("No text is selected");
    });
});

describe("packPromptParts", () => {
    test("context is cacheable: no instruction, instruction is separate", () => {
        const ctx = buildAiContext({
            title: "Spec",
            before: "alpha",
            selection: "beta",
            after: "gamma",
            priorOps: [],
        });
        const parts = packPromptParts(ctx, "Rewrite it");
        expect(parts.context).toContain("Document title: Spec");
        expect(parts.context).toContain("beta");
        expect(parts.context).not.toMatch(/Instruction:/);
        expect(parts.instruction).toBe("Rewrite it");
        expect(parts.prompt.startsWith(parts.context)).toBe(true);
        expect(parts.prompt).toContain("Instruction:\nRewrite it");
    });
});
