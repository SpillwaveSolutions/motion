import { test, expect, describe } from "bun:test";
import { collectHighlightClasses, highlightMarkdownTree } from "./markdownHighlight";

describe("highlightMarkdownTree", () => {
    test("marks ATX headings as hljs-section", () => {
        expect(collectHighlightClasses("# Hello")).toContain("hljs-section");
    });

    test("marks emphasis, strong, inline code, and links", () => {
        const classes = collectHighlightClasses(
            "A **bold** and *em* and `code` and [text](https://example.com)."
        );
        expect(classes).toContain("hljs-strong");
        expect(classes).toContain("hljs-emphasis");
        expect(classes).toContain("hljs-code");
        expect(classes).toContain("hljs-link");
    });

    test("marks list bullets and fenced code", () => {
        const classes = collectHighlightClasses("- item\n\n```js\nconst x = 1;\n```\n");
        expect(classes).toContain("hljs-bullet");
        expect(classes).toContain("hljs-code");
    });

    test("does not interpret markup inside a script-looking span as HTML", () => {
        const tree = highlightMarkdownTree("<script>alert(1)</script>");
        const asJson = JSON.stringify(tree);
        expect(asJson).toContain("script");
        expect(tree.type).toBe("root");
        const walk = (node: { type: string; tagName?: string; children?: unknown[] }): string[] => {
            const tags = node.tagName ? [node.tagName] : [];
            for (const child of (node.children ?? []) as typeof node[]) {
                tags.push(...walk(child));
            }
            return tags;
        };
        expect(walk(tree).every((t) => t === "span")).toBe(true);
    });
});
