import { describe, expect, test } from "bun:test";
import { joinFrontmatter, splitFrontmatter } from "./frontmatter";

describe("splitFrontmatter", () => {
    test("splits the YAML block from the body", () => {
        expect(splitFrontmatter("---\ntitle: T\ndate: 2026-10-28\n---\n\n# Body\n")).toEqual({
            frontmatter: "title: T\ndate: 2026-10-28",
            body: "# Body\n",
        });
    });

    test("accepts a `...` closing fence, an empty block, CRLF, and a BOM", () => {
        expect(splitFrontmatter("---\na: 1\n...\nBody").frontmatter).toBe("a: 1");
        expect(splitFrontmatter("---\n---\nBody")).toEqual({ frontmatter: "", body: "Body" });
        expect(splitFrontmatter("---\r\na: 1\r\n---\r\n\r\nBody")).toEqual({ frontmatter: "a: 1", body: "Body" });
        expect(splitFrontmatter("﻿---\na: 1\n---\nBody").frontmatter).toBe("a: 1");
    });

    test("a rule that is not on line 1, or has no closing fence, is not front matter", () => {
        for (const md of ["Intro\n\n---\n\na: 1\n---\n", "---\n\nJust a rule.\n", "# Title\n"]) {
            expect(splitFrontmatter(md)).toEqual({ frontmatter: null, body: md });
        }
    });
});

describe("joinFrontmatter", () => {
    test("null front matter returns the body unchanged", () => {
        expect(joinFrontmatter(null, "# Body\n")).toBe("# Body\n");
    });

    test("puts the block back with one blank line before the body", () => {
        expect(joinFrontmatter("title: T", "# Body\n")).toBe("---\ntitle: T\n---\n\n# Body\n");
        expect(joinFrontmatter("", "Body")).toBe("---\n---\n\nBody");
        expect(joinFrontmatter("title: T", "")).toBe("---\ntitle: T\n---\n");
    });

    test("split then join gives back a normal note unchanged", () => {
        const md = "---\ntitle: T\nprevious: docs/old.md\n---\n\n# Body\n\nText.\n";
        const { frontmatter, body } = splitFrontmatter(md);
        expect(joinFrontmatter(frontmatter, body)).toBe(md);
    });
});
