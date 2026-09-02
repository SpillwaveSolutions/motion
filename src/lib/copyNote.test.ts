import { test, expect, describe } from "bun:test";
import { buildCopyPayload, wrapHtmlFragment, writeCopyPayload } from "./copyNote";

const passthrough = (html: string) => html;

describe("wrapHtmlFragment", () => {
    test("wraps a fragment as a utf-8 HTML document", () => {
        const out = wrapHtmlFragment("<h1>Hi</h1>");
        expect(out).toContain("<!DOCTYPE html>");
        expect(out).toContain("<meta charset=\"utf-8\">");
        expect(out).toContain("<h1>Hi</h1>");
    });
});

describe("buildCopyPayload", () => {
    test("plain is the original markdown; html is the rendered heading", async () => {
        const md = "# Welcome\n\nA paragraph.";
        const payload = await buildCopyPayload(md, passthrough);
        expect(payload.text).toBe(md);
        expect(payload.html).toContain("<h1");
        expect(payload.html).toContain("Welcome");
        expect(payload.html).toContain("<p>");
        expect(payload.html).not.toContain("# Welcome");
    });

    test("a GFM table becomes a real table in the HTML side", async () => {
        const md = "| Name | Role |\n| --- | --- |\n| Alice | Architect |";
        const payload = await buildCopyPayload(md, passthrough);
        expect(payload.text).toContain("| Alice | Architect |");
        expect(payload.html).toContain("<table");
        expect(payload.html).toContain("Alice");
    });

    test("runs the sanitizer on the HTML side, not the markdown", async () => {
        const payload = await buildCopyPayload("Hello <em>x</em>", (html) =>
            html.replace(/<em>/g, "").replace(/<\/em>/g, "")
        );
        expect(payload.text).toContain("<em>x</em>");
        expect(payload.html).not.toContain("<em>");
        expect(payload.html).toContain("Hello");
    });
});

class FakeClipboardItem {
    private parts: Record<string, Blob | Promise<Blob>>;
    constructor(parts: Record<string, Blob | Promise<Blob>>) {
        this.parts = parts;
    }
    get types() {
        return Object.keys(this.parts);
    }
    async getType(type: string) {
        return await this.parts[type];
    }
}

describe("writeCopyPayload", () => {
    test("writes text/plain and text/html when ClipboardItem is available", async () => {
        const prev = (globalThis as unknown as { ClipboardItem?: unknown }).ClipboardItem;
        (globalThis as unknown as { ClipboardItem: unknown }).ClipboardItem = FakeClipboardItem;
        try {
            const written: Array<{ bodies: Record<string, string> }> = [];
            const clipboard = {
                write: async (items: ClipboardItem[]) => {
                    const bodies: Record<string, string> = {};
                    for (const item of items) {
                        for (const type of item.types) {
                            bodies[type] = await (await item.getType(type)).text();
                        }
                    }
                    written.push({ bodies });
                },
                writeText: async () => {
                    throw new Error("writeText should not be used when write succeeds");
                },
            };
            await writeCopyPayload({ text: "# Hi", html: "<h1>Hi</h1>" }, clipboard);
            expect(written).toHaveLength(1);
            const bodies = written[0]?.bodies ?? {};
            expect(bodies["text/plain"]).toBe("# Hi");
            expect(bodies["text/html"]).toBe("<h1>Hi</h1>");
        } finally {
            (globalThis as unknown as { ClipboardItem?: unknown }).ClipboardItem = prev;
        }
    });

    test("falls back to writeText when write rejects", async () => {
        const prev = (globalThis as unknown as { ClipboardItem?: unknown }).ClipboardItem;
        (globalThis as unknown as { ClipboardItem: unknown }).ClipboardItem = FakeClipboardItem;
        try {
            let plain = "";
            const clipboard = {
                write: async () => {
                    throw new Error("not allowed");
                },
                writeText: async (data: string) => {
                    plain = data;
                },
            };
            await writeCopyPayload({ text: "# Hi", html: "<h1>Hi</h1>" }, clipboard);
            expect(plain).toBe("# Hi");
        } finally {
            (globalThis as unknown as { ClipboardItem?: unknown }).ClipboardItem = prev;
        }
    });
});
