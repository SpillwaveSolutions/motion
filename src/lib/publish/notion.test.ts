import { describe, expect, test } from "bun:test";
import {
    chunkBlocks,
    markdownToNotionBlocks,
    parseNotionPageId,
    parseNotionResponse,
    publishNotion,
} from "./notion";

describe("parseNotionPageId", () => {
    test("accepts a dashed UUID", () => {
        expect(parseNotionPageId("01234567-89ab-cdef-0123-456789abcdef")).toBe(
            "01234567-89ab-cdef-0123-456789abcdef",
        );
    });

    test("pulls a 32-hex id out of a Notion URL", () => {
        expect(
            parseNotionPageId("https://www.notion.so/My-Page-0123456789abcdef0123456789abcdef"),
        ).toBe("01234567-89ab-cdef-0123-456789abcdef");
    });

    test("rejects junk", () => {
        expect(() => parseNotionPageId("not-a-page")).toThrow(/Not a Notion page/);
    });
});

describe("markdownToNotionBlocks", () => {
    test("maps headings, paragraphs, lists, quotes, and code", () => {
        const md = [
            "# Title",
            "",
            "A paragraph.",
            "",
            "- one",
            "- two",
            "1. first",
            "> quoted",
            "```js",
            "console.log(1)",
            "```",
            "```mermaid",
            "graph TD; A-->B",
            "```",
        ].join("\n");
        const blocks = markdownToNotionBlocks(md);
        expect(blocks.map((b) => b.type)).toEqual([
            "heading_1",
            "paragraph",
            "bulleted_list_item",
            "bulleted_list_item",
            "numbered_list_item",
            "quote",
            "code",
            "code",
        ]);
        const mermaid = blocks[7] as unknown as { code: { language: string } };
        expect(mermaid.code.language).toBe("plain text");
    });
});

describe("chunkBlocks", () => {
    test("splits on the Notion 100-block ceiling", () => {
        const blocks = Array.from({ length: 101 }, (_, i) => i);
        const chunks = chunkBlocks(blocks, 100);
        expect(chunks).toHaveLength(2);
        expect(chunks[0]).toHaveLength(100);
        expect(chunks[1]).toEqual([100]);
    });

    test("empty input is one empty chunk", () => {
        expect(chunkBlocks([], 100)).toEqual([[]]);
    });
});

describe("parseNotionResponse", () => {
    test("success", () => {
        expect(parseNotionResponse(200, { url: "https://notion.so/x" })).toEqual({
            ok: true,
            url: "https://notion.so/x",
        });
    });

    test("error", () => {
        expect(parseNotionResponse(401, { message: "Unauthorized" })).toEqual({
            ok: false,
            error: "Unauthorized",
        });
    });
});

describe("publishNotion", () => {
    test("missing token does not fetch", async () => {
        const result = await publishNotion({
            token: " ",
            parentPageId: "01234567-89ab-cdef-0123-456789abcdef",
            title: "Note",
            chunks: [[]],
            fetch: async () => {
                throw new Error("should not fetch");
            },
        });
        expect(result).toEqual({ ok: false, error: "missing-token" });
    });

    test("creates then appends leftover chunks", async () => {
        const calls: { url: string; method: string }[] = [];
        const fetchImpl = async (url: RequestInfo | URL, init?: RequestInit) => {
            calls.push({ url: String(url), method: (init?.method as string) ?? "GET" });
            if (String(url).endsWith("/v1/pages")) {
                return new Response(
                    JSON.stringify({ id: "page-1", url: "https://notion.so/page-1" }),
                    { status: 200 },
                );
            }
            return new Response(JSON.stringify({ object: "list" }), { status: 200 });
        };
        const chunks = chunkBlocks(markdownToNotionBlocks("# T\n\npara\n"), 1);
        const result = await publishNotion({
            token: "ntn_test",
            parentPageId: "01234567-89ab-cdef-0123-456789abcdef",
            title: "Note",
            chunks,
            fetch: fetchImpl,
        });
        expect(result).toEqual({ ok: true, url: "https://notion.so/page-1" });
        expect(calls[0]).toEqual({ url: "https://api.notion.com/v1/pages", method: "POST" });
        expect(calls.slice(1).every((c) => c.method === "PATCH")).toBe(true);
    });
});
