import { describe, expect, test } from "bun:test";
import { bodyMarkdown, joinFrontmatter, splitFrontmatter } from "./frontmatter";

describe("frontmatter", () => {
    test("splitFrontmatter returns null when there is no fence", () => {
        const md = "# Title\n\nHello\n";
        expect(splitFrontmatter(md)).toEqual({ frontmatter: null, body: md });
    });

    test("splitFrontmatter peels a standard YAML block", () => {
        const md = `---
title: Demo
part: 3
---

# Heading

Body text.
`;
        const { frontmatter, body } = splitFrontmatter(md);
        expect(frontmatter).toBe("title: Demo\npart: 3");
        expect(body).toBe("# Heading\n\nBody text.\n");
    });

    test("splitFrontmatter does not treat a mid-doc horizontal rule as front matter", () => {
        const md = "Intro\n\n---\n\nMore\n";
        expect(splitFrontmatter(md).frontmatter).toBeNull();
        expect(splitFrontmatter(md).body).toBe(md);
    });

    test("splitFrontmatter rejects an unclosed opening fence", () => {
        const md = "---\ntitle: no close\n\n# Body\n";
        expect(splitFrontmatter(md).frontmatter).toBeNull();
    });

    test("joinFrontmatter round-trips", () => {
        const original = `---
primary_keyword: "LangChain"
---

# Two Harnesses

Paragraph.
`;
        const { frontmatter, body } = splitFrontmatter(original);
        const again = joinFrontmatter(frontmatter, body);
        expect(splitFrontmatter(again)).toEqual({ frontmatter, body });
        expect(again).toContain('primary_keyword: "LangChain"');
        expect(again).toContain("# Two Harnesses");
    });

    test("joinFrontmatter with null leaves body alone", () => {
        expect(joinFrontmatter(null, "# Hi\n")).toBe("# Hi\n");
    });

    test("bodyMarkdown strips for WYSIWYG", () => {
        expect(bodyMarkdown("---\nx: 1\n---\n\n# T\n")).toBe("# T\n");
        expect(bodyMarkdown("# T\n")).toBe("# T\n");
    });

    test("body edit does not drop front matter when rejoined", () => {
        const fm = 'title: "Article"\nseo_keywords: ["a", "b"]';
        const full = joinFrontmatter(fm, "# Old\n\n");
        const { frontmatter } = splitFrontmatter(full);
        const next = joinFrontmatter(frontmatter, "# New Title\n\nEdited body.\n");
        expect(next.startsWith("---\n")).toBe(true);
        expect(next).toContain('title: "Article"');
        expect(next).toContain("# New Title");
        expect(next).not.toContain("# Old");
    });
});
