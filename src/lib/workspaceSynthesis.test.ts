import { test, expect, describe, spyOn } from "bun:test";
import * as llmClient from "./llmClient";
import {
    synthesizeWorkspace,
    buildBaseToc,
    TOC_FILENAME,
    SKILL_FILENAME,
    MAX_NOTES,
} from "./workspaceSynthesis";

/** A workspace in memory, so the orchestration is testable without a disk. */
function fakeWorkspace(files: Record<string, string>) {
    const written: Record<string, string> = {};
    return {
        written,
        deps: {
            listFiles: async () => Object.keys(files).map((f) => `/ws/${f}`),
            readFile: async (p: string) => files[p.replace("/ws/", "")] ?? "",
            writeFile: async (p: string, c: string) => {
                written[p] = c;
            },
            toRelative: (p: string) => p.replace("/ws/", ""),
            joinWorkspace: (f: string) => `/ws/${f}`,
        },
    };
}

/** Answers shaped by the prompt, so each stage is distinguishable. */
function stubLLM() {
    return spyOn(llmClient, "callLLMFromUI").mockImplementation(async (_p, opts) => {
        const prompt = opts.prompt;
        if (prompt.includes("summary")) return { content: "- a point", rawOutput: "" };
        if (prompt.includes("JSON")) {
            return {
                content: JSON.stringify({
                    suggestedLabels: ["Architecture", "Testing"],
                    shouldSplit: false,
                    reasoning: "coherent",
                }),
                rawOutput: "",
            };
        }
        if (prompt.includes("Table of Contents") || prompt.includes("TOC")) {
            return { content: "# Enriched TOC\n\n- note.md", rawOutput: "" };
        }
        return { content: "# SKILL\n\nGenerated skill body.", rawOutput: "" };
    });
}

describe("buildBaseToc", () => {
    test("lists each note with its summary bullets", () => {
        const toc = buildBaseToc([
            { path: "a.md", summary: "- first\n- second" },
            { path: "nested/b.md", summary: "third" },
        ]);
        expect(toc).toContain("[a.md](a.md)");
        expect(toc).toContain("- first");
        // A summary line without a leading dash still renders as a bullet.
        expect(toc).toContain("- third");
        expect(toc).toContain("[b.md](nested/b.md)");
    });
});

describe("synthesizeWorkspace", () => {
    test("summarizes, clusters, and writes both documents", async () => {
        const llm = stubLLM();
        const ws = fakeWorkspace({ "one.md": "# One\ncontent", "two.md": "# Two\ncontent" });

        const result = await synthesizeWorkspace(ws.deps);

        expect(result.noteCount).toBe(2);
        expect(result.topic.suggestedLabels).toContain("Architecture");
        expect(ws.written[`/ws/${TOC_FILENAME}`]).toContain("Enriched TOC");
        expect(ws.written[`/ws/${SKILL_FILENAME}`]).toContain("SKILL");
        expect(llm).toHaveBeenCalled();
    });

    /**
     * Without this, a second run summarizes the TOC it wrote on the first, and
     * the topic labels drift toward describing the index instead of the notes.
     */
    test("never reads its own generated output back as input", async () => {
        stubLLM();
        const ws = fakeWorkspace({
            "note.md": "# Note",
            [TOC_FILENAME]: "# Old TOC",
            [SKILL_FILENAME]: "# Old skill",
        });

        const result = await synthesizeWorkspace(ws.deps);
        expect(result.noteCount).toBe(1);
    });

    test("skips empty notes rather than summarizing whitespace", async () => {
        stubLLM();
        const ws = fakeWorkspace({ "real.md": "# Real", "blank.md": "   \n" });
        expect((await synthesizeWorkspace(ws.deps)).noteCount).toBe(1);
    });

    test("refuses an empty workspace with a readable message", async () => {
        stubLLM();
        const ws = fakeWorkspace({});
        expect(synthesizeWorkspace(ws.deps)).rejects.toThrow(/no markdown files/i);
    });

    test("caps the number of notes and reports what it dropped", async () => {
        stubLLM();
        const files: Record<string, string> = {};
        for (let i = 0; i < MAX_NOTES + 5; i++) files[`n${i}.md`] = `# Note ${i}`;
        const ws = fakeWorkspace(files);

        const messages: string[] = [];
        const result = await synthesizeWorkspace({
            ...ws.deps,
            onProgress: (m) => messages.push(m),
        });

        expect(result.noteCount).toBe(MAX_NOTES);
        expect(result.skipped).toBe(5);
        // A silent cap reads as "covered everything" when it did not.
        expect(messages.some((m) => m.includes(String(MAX_NOTES)))).toBe(true);
    });
});
