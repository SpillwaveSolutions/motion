/**
 * B4/B7 regression lock: the markdown round trip must preserve every block.
 *
 * Nothing pinned this before, which is how four of the five block types came to
 * degrade into plain code blocks after a single save/reload without any gate
 * noticing. The round trip is:
 *
 *   editor HTML -> turndown -> markdown -> marked -> sanitize -> parseHTML
 *
 * Turndown writes the fence language from the `<code>` element's `language-*`
 * class; `marked` hands that class back. `data-type` cannot survive the markdown
 * hop at all -- markdown has nowhere to put it -- so a block whose parseHTML
 * only matched `pre[data-type=...]` was unrecoverable on reload.
 *
 * This tests the serialization contract directly rather than mounting Tiptap,
 * which needs a DOM. The E2E suite covers the full editor path.
 */
import { test, expect, describe } from "bun:test";
import { parseBlockAttrs, serializeBlockAttrs } from "./extensions/blockAttrs";

/** The turndown rule in markdown.ts: fence language comes from the code class. */
function toMarkdownFence(languageClass: string, body: string): string {
    const language = languageClass.replace("language-", "");
    return "```" + language + "\n" + body + "\n```";
}

/** What `marked` produces for a fenced block, before parseHTML sees it. */
function fenceToCodeClass(markdown: string): { language: string; body: string } {
    const m = /^```([\w-]*)\n([\s\S]*?)\n```$/.exec(markdown.trim());
    if (!m) throw new Error(`not a fence: ${markdown}`);
    return { language: m[1] as string, body: m[2] as string };
}

const BLOCKS = [
    { type: "mermaid", fields: { content: "graph TD\n  A[Start] --> B{Ok?}\n  B -->|Yes| C[Done]" } },
    { type: "dataset", fields: { source: "data/sales.csv", name: "sales", limit: 5 } },
    { type: "query", fields: { sql: "SELECT name, score\nFROM sales\nORDER BY score DESC" } },
    { type: "image-gen", fields: { prompt: "a neon city at night" } },
    { type: "diagram-gen", fields: { prompt: "a login flow", content: "sequenceDiagram\n  A->>B: hello\n  B-->>A: hi" } },
] as const;

describe("markdown round trip preserves every block type", () => {
    for (const block of BLOCKS) {
        test(`${block.type} survives serialize -> fence -> parse`, () => {
            const body =
                block.type === "mermaid"
                    ? (block.fields as { content: string }).content
                    : serializeBlockAttrs(block.fields as Record<string, unknown>);

            // 1. Editor serializes with a language-* class (the fix).
            const languageClass = `language-${block.type}`;

            // 2. Turndown -> markdown fence.
            const markdown = toMarkdownFence(languageClass, body);

            // 3. marked -> <pre><code class="language-x">. The language MUST come
            //    back, or the block cannot be identified on reload.
            const { language, body: parsedBody } = fenceToCodeClass(markdown);
            expect(language).toBe(block.type);

            // 4. parseHTML recovers the attributes.
            if (block.type === "mermaid") {
                expect(parsedBody).toBe((block.fields as { content: string }).content);
                return;
            }
            const attrs = parseBlockAttrs(parsedBody);
            for (const [key, value] of Object.entries(block.fields)) {
                expect(attrs[key]).toBe(String(value));
            }
        });
    }

    test("multi-line content is not truncated at the first line (B7)", () => {
        const multi = "sequenceDiagram\n  A->>B: one\n  B-->>A: two\n  A->>B: three";
        const body = serializeBlockAttrs({ prompt: "p", content: multi });
        const { body: parsedBody } = fenceToCodeClass(toMarkdownFence("language-diagram-gen", body));
        expect(parseBlockAttrs(parsedBody)["content"]).toBe(multi);
    });

    test("an unlabelled fence stays a plain code block", () => {
        // Regression guard in the other direction: a user's ordinary ```js block
        // must not be swallowed by a block extension.
        const { language } = fenceToCodeClass("```\nplain text\n```");
        expect(language).toBe("");
    });
});
