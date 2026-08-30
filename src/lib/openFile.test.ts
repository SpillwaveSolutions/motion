import { describe, expect, test } from "bun:test";
import { parseOpenQuery, resolveOpenQuery } from "./openFile";

describe("parseOpenQuery", () => {
    test("reads ?open=", () => {
        expect(parseOpenQuery("?open=welcome.md")).toBe("welcome.md");
        expect(parseOpenQuery("open=welcome.md")).toBe("welcome.md");
    });

    test("decodes nested paths", () => {
        expect(parseOpenQuery("?open=nested%2Fdeeper.md")).toBe("nested/deeper.md");
    });

    test("empty or missing is null", () => {
        expect(parseOpenQuery("")).toBeNull();
        expect(parseOpenQuery("?view=split")).toBeNull();
        expect(parseOpenQuery("?open=")).toBeNull();
    });
});

describe("resolveOpenQuery", () => {
    const root = "/tmp/ws";
    const files = [
        "/tmp/ws/welcome.md",
        "/tmp/ws/getting-started.md",
        "/tmp/ws/nested/deeper.md",
    ];

    test("matches a basename", () => {
        expect(resolveOpenQuery("welcome.md", files, root)).toBe("/tmp/ws/welcome.md");
    });

    test("matches a relative path", () => {
        expect(resolveOpenQuery("nested/deeper.md", files, root)).toBe("/tmp/ws/nested/deeper.md");
    });

    test("matches an absolute path", () => {
        expect(resolveOpenQuery("/tmp/ws/welcome.md", files, root)).toBe("/tmp/ws/welcome.md");
    });

    test("unknown file is null", () => {
        expect(resolveOpenQuery("missing.md", files, root)).toBeNull();
    });
});
