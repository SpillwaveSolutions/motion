import { describe, expect, test } from "bun:test";
import {
    extractTitleFromMarkdown,
    isUntitledPath,
    joinWorkspace,
    normalizeFilename,
    slugifyTitle,
    suggestedFilename,
    wouldOverwrite,
} from "./noteNaming";

describe("noteNaming", () => {
    test("extractTitleFromMarkdown reads the first heading", () => {
        expect(extractTitleFromMarkdown("# New Note\n\nbody")).toBe("New Note");
        expect(extractTitleFromMarkdown("intro\n## Q3 Plan\n")).toBe("Q3 Plan");
        expect(extractTitleFromMarkdown("no heading")).toBeNull();
    });

    test("extractTitleFromMarkdown skips YAML front matter", () => {
        const md = `---
title: meta-title
---

# Real Title

body
`;
        expect(extractTitleFromMarkdown(md)).toBe("Real Title");
    });

    test("slugifyTitle matches the product rule: New Note → new-note", () => {
        expect(slugifyTitle("New Note")).toBe("new-note");
        expect(slugifyTitle("new-note")).toBe("new-note");
        expect(slugifyTitle("  Hello, World!  ")).toBe("hello-world");
    });

    test("suggestedFilename adds .md from the title", () => {
        expect(suggestedFilename("# New Note\n\n")).toBe("new-note.md");
        expect(suggestedFilename("plain")).toBe("untitled.md");
    });

    test("normalizeFilename strips path bits and ensures .md", () => {
        expect(normalizeFilename("Report")).toBe("Report.md");
        expect(normalizeFilename("Report.md")).toBe("Report.md");
        expect(normalizeFilename("foo/bar.md")).toBe("foo-bar.md");
    });

    test("isUntitledPath recognizes placeholders", () => {
        expect(isUntitledPath(null)).toBe(true);
        expect(isUntitledPath("/ws/untitled-2026-01-01.md")).toBe(true);
        expect(isUntitledPath("/ws/new-note.md")).toBe(false);
    });

    test("wouldOverwrite warns only when clobbering another file", () => {
        const files = ["/ws/a.md", "/ws/new-note.md"];
        expect(wouldOverwrite(files, "/ws/new-note.md", null)).toBe(true);
        expect(wouldOverwrite(files, "/ws/new-note.md", "/ws/new-note.md")).toBe(false);
        expect(wouldOverwrite(files, "/ws/fresh.md", null)).toBe(false);
        expect(wouldOverwrite(files, "/ws/a.md", "/ws/untitled-1.md")).toBe(true);
    });

    test("joinWorkspace respects separators", () => {
        expect(joinWorkspace("/tmp/ws", "new-note")).toBe("/tmp/ws/new-note.md");
        expect(joinWorkspace("C:\\ws", "x.md")).toMatch(/x\.md$/);
    });
});
