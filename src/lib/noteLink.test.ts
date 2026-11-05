import { describe, expect, test } from "bun:test";
import { imageMimeType, imagePathCandidates, isNoteLinkUri, resolveNoteLink } from "./noteLink";

const root = "/tmp/ws";
const files = [
    "/tmp/ws/welcome.md",
    "/tmp/ws/getting-started.md",
    "/tmp/ws/nested/deeper.md",
    "/tmp/ws/nested/README.md",
    "/tmp/ws/My Note.md",
    "/tmp/ws/a/readme.md",
    "/tmp/ws/b/readme.md",
];

function open(href: string, currentFile: string | null) {
    return resolveNoteLink(href, { currentFile, workspaceRoot: root, files });
}

describe("resolveNoteLink", () => {
    test("opens a sibling relative link", () => {
        expect(open("getting-started.md", "/tmp/ws/welcome.md")).toEqual({
            action: "open",
            path: "/tmp/ws/getting-started.md",
        });
        expect(open("./getting-started.md", "/tmp/ws/welcome.md")).toEqual({
            action: "open",
            path: "/tmp/ws/getting-started.md",
        });
    });

    test("opens a nested link and a link back up", () => {
        expect(open("nested/deeper.md", "/tmp/ws/welcome.md")).toEqual({
            action: "open",
            path: "/tmp/ws/nested/deeper.md",
        });
        expect(open("../welcome.md", "/tmp/ws/nested/deeper.md")).toEqual({
            action: "open",
            path: "/tmp/ws/welcome.md",
        });
    });

    test("falls back to the workspace root when the note-relative path misses", () => {
        expect(open("welcome.md", "/tmp/ws/nested/deeper.md")).toEqual({
            action: "open",
            path: "/tmp/ws/welcome.md",
        });
    });

    test("opens absolute and file URLs inside the folder", () => {
        expect(open("/tmp/ws/welcome.md", "/tmp/ws/nested/deeper.md")).toEqual({
            action: "open",
            path: "/tmp/ws/welcome.md",
        });
        expect(open("file:///tmp/ws/nested/deeper.md", "/tmp/ws/welcome.md")).toEqual({
            action: "open",
            path: "/tmp/ws/nested/deeper.md",
        });
    });

    test("ignores a heading hash but still opens the file", () => {
        expect(open("getting-started.md#install", "/tmp/ws/welcome.md")).toEqual({
            action: "open",
            path: "/tmp/ws/getting-started.md",
        });
        expect(open("#install", "/tmp/ws/welcome.md")).toEqual({ action: "ignore" });
    });

    test("appends .md and opens a folder README", () => {
        expect(open("getting-started", "/tmp/ws/welcome.md")).toEqual({
            action: "open",
            path: "/tmp/ws/getting-started.md",
        });
        expect(open("nested/", "/tmp/ws/welcome.md")).toEqual({
            action: "open",
            path: "/tmp/ws/nested/README.md",
        });
    });

    test("matches a unique basename and decodes spaces, but not an ambiguous name", () => {
        expect(open("My%20Note.md", "/tmp/ws/welcome.md")).toEqual({
            action: "open",
            path: "/tmp/ws/My Note.md",
        });
        expect(open("readme.md", "/tmp/ws/welcome.md")).toEqual({ action: "missing" });
        expect(open("a/readme.md", "/tmp/ws/welcome.md")).toEqual({
            action: "open",
            path: "/tmp/ws/a/readme.md",
        });
    });

    test("matches case-insensitively when there is one file", () => {
        expect(open("WELCOME.MD", "/tmp/ws/nested/deeper.md")).toEqual({
            action: "open",
            path: "/tmp/ws/welcome.md",
        });
    });

    test("web, mail, and script URLs are not notes", () => {
        expect(open("https://example.com/welcome.md", "/tmp/ws/welcome.md")).toEqual({
            action: "external",
            url: "https://example.com/welcome.md",
        });
        expect(open("mailto:ada@example.com", "/tmp/ws/welcome.md")).toEqual({
            action: "external",
            url: "mailto:ada@example.com",
        });
        expect(open("javascript:alert(1)", "/tmp/ws/welcome.md")).toEqual({ action: "ignore" });
    });

    test("a local miss stays a miss", () => {
        expect(open("does-not-exist.md", "/tmp/ws/welcome.md")).toEqual({ action: "missing" });
        expect(open("", "/tmp/ws/welcome.md")).toEqual({ action: "ignore" });
    });

    test("an absolute markdown path outside the folder asks to switch workspace", () => {
        expect(open("file:///Users/rick/notes/topic.md", "/tmp/ws/welcome.md")).toEqual({
            action: "switch",
            file: "/Users/rick/notes/topic.md",
            workspace: "/Users/rick/notes",
        });
    });

    test("returns the listing's own path string", () => {
        const winFiles = ["C:\\notes\\a.md"];
        expect(
            resolveNoteLink("file:///C:/notes/a.md", {
                currentFile: "C:\\notes\\a.md",
                workspaceRoot: "C:\\notes",
                files: winFiles,
            }),
        ).toEqual({ action: "open", path: "C:\\notes\\a.md" });
    });

    test("keeps directory links that TipTap's default check would drop", () => {
        expect(isNoteLinkUri("nested/deeper.md")).toBe(true);
        expect(isNoteLinkUri("./getting-started.md")).toBe(true);
        expect(isNoteLinkUri("file:///tmp/ws/welcome.md")).toBe(true);
        expect(isNoteLinkUri("https://example.com")).toBe(true);
        expect(isNoteLinkUri("javascript:alert(1)")).toBe(false);
        expect(isNoteLinkUri("data:text/html,hi")).toBe(false);
    });
});

describe("imagePathCandidates", () => {
    const ctx = { currentFile: "/ws/articles/l6/article.md", workspaceRoot: "/ws" };

    test("a relative src resolves from the note's folder, then the workspace root", () => {
        expect(imagePathCandidates("images/01.png", ctx)).toEqual([
            "/ws/articles/l6/images/01.png",
            "/ws/images/01.png",
        ]);
        expect(imagePathCandidates("./images/01.png", ctx)?.[0]).toBe("/ws/articles/l6/images/01.png");
        expect(imagePathCandidates("../shared/logo.svg", ctx)?.[0]).toBe("/ws/articles/shared/logo.svg");
    });

    test("decodes %20, and drops a query or a hash", () => {
        expect(imagePathCandidates("my%20pics/a%20b.png?v=2#x", ctx)?.[0]).toBe("/ws/articles/l6/my pics/a b.png");
    });

    test("an absolute path or a file URL is used as is", () => {
        expect(imagePathCandidates("/elsewhere/pic.png", ctx)).toEqual(["/elsewhere/pic.png"]);
        expect(imagePathCandidates("file:///Users/me/pic%201.png", ctx)).toEqual(["/Users/me/pic 1.png"]);
    });

    test("a note at the workspace root gives one candidate", () => {
        expect(imagePathCandidates("pic.png", { currentFile: "/ws/note.md", workspaceRoot: "/ws" })).toEqual([
            "/ws/pic.png",
        ]);
    });

    test("web, data, and blob URLs load directly, and script URLs load nothing", () => {
        for (const src of ["https://x.test/a.png", "//cdn.test/a.png", "data:image/png;base64,AA", "blob:abc"]) {
            expect(imagePathCandidates(src, ctx)).toBeNull();
        }
        expect(imagePathCandidates("javascript:alert(1)", ctx)).toEqual([]);
        expect(imagePathCandidates("  ", ctx)).toEqual([]);
    });

    test("a path with no image extension loads nothing", () => {
        expect(imagePathCandidates("x", ctx)).toEqual([]);
        expect(imagePathCandidates("notes/secret.md", ctx)).toEqual([]);
    });
});

describe("imageMimeType", () => {
    test("maps image extensions, case-insensitive", () => {
        expect(imageMimeType("a/B.PNG")).toBe("image/png");
        expect(imageMimeType("x.jpg")).toBe("image/jpeg");
        expect(imageMimeType("x.svg")).toBe("image/svg+xml");
        expect(imageMimeType("x.bin")).toBe("application/octet-stream");
    });
});
