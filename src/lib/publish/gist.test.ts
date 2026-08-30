import { describe, expect, test } from "bun:test";
import { buildGistPayload, parseGistResponse, publishGist } from "./gist";

describe("buildGistPayload", () => {
    test("secret gist with a safe filename", () => {
        expect(buildGistPayload({ filename: "plan.md", content: "# Hi" })).toEqual({
            description: "",
            public: false,
            files: { "plan.md": { content: "# Hi" } },
        });
    });

    test("strips path separators from the filename", () => {
        const body = buildGistPayload({ filename: "nested/deeper.md", content: "x" });
        expect(Object.keys(body.files)).toEqual(["nested-deeper.md"]);
    });
});

describe("parseGistResponse", () => {
    test("success returns html_url", () => {
        expect(parseGistResponse(201, { html_url: "https://gist.github.com/abc" })).toEqual({
            ok: true,
            url: "https://gist.github.com/abc",
        });
    });

    test("error envelope keeps the GitHub message", () => {
        expect(parseGistResponse(401, { message: "Bad credentials" })).toEqual({
            ok: false,
            error: "Bad credentials",
        });
    });
});

describe("publishGist", () => {
    test("missing token does not fetch", async () => {
        const result = await publishGist({
            token: "  ",
            filename: "a.md",
            content: "x",
            fetch: async () => {
                throw new Error("should not fetch");
            },
        });
        expect(result).toEqual({ ok: false, error: "missing-token" });
    });

    test("posts the payload to api.github.com/gists", async () => {
        const calls: { url: string; init: RequestInit }[] = [];
        const fetchImpl = async (url: RequestInfo | URL, init?: RequestInit) => {
            calls.push({ url: String(url), init: init ?? {} });
            return new Response(JSON.stringify({ html_url: "https://gist.github.com/x" }), {
                status: 201,
            });
        };
        const result = await publishGist({
            token: "ghp_test",
            filename: "note.md",
            content: "hello",
            fetch: fetchImpl,
        });
        expect(result.ok).toBe(true);
        expect(calls[0]?.url).toBe("https://api.github.com/gists");
        const headers = calls[0]?.init.headers as Record<string, string>;
        expect(headers.Authorization).toBe("Bearer ghp_test");
    });
});
