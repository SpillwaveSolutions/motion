import { expect, test } from "bun:test";
import { classifyPathArg } from "./cliPathArg";

// Stand-in for node's path.resolve against cwd=/cwd. Deliberately injected:
// the classifier must be decidable without touching a real filesystem.
const deps = {
    resolve: (p: string) =>
        p.startsWith("/") ? p : p === "." ? "/cwd" : `/cwd/${p}`,
    isDirectory: (p: string) => p === "/cwd/docs" || p === "/cwd",
};

test("a directory is a workspace", () => {
    expect(classifyPathArg("docs", deps)).toEqual({ kind: "dir", path: "/cwd/docs" });
});

test("no argument means the current directory", () => {
    expect(classifyPathArg(undefined, deps)).toEqual({ kind: "dir", path: "/cwd" });
    expect(classifyPathArg(".", deps)).toEqual({ kind: "dir", path: "/cwd" });
});

test("a trailing slash still resolves to the directory", () => {
    expect(classifyPathArg("docs/", deps)).toEqual({ kind: "dir", path: "/cwd/docs" });
});

test("an existing .md is a file to open", () => {
    expect(classifyPathArg("docs/a.md", deps)).toEqual({
        kind: "file",
        path: "/cwd/docs/a.md",
        dir: "/cwd/docs",
    });
});

test("a missing .md is still a file to open (created by the caller)", () => {
    expect(classifyPathArg("docs/new.md", deps)).toEqual({
        kind: "file",
        path: "/cwd/docs/new.md",
        dir: "/cwd/docs",
    });
});

test("an absolute .md keeps its own parent as the workspace", () => {
    expect(classifyPathArg("/elsewhere/notes/idea.md", deps)).toEqual({
        kind: "file",
        path: "/elsewhere/notes/idea.md",
        dir: "/elsewhere/notes",
    });
});

test(".MD is accepted — the extension test is case-insensitive", () => {
    expect(classifyPathArg("docs/a.MD", deps).kind).toBe("file");
});

test("a non-markdown path that is not a directory is an error", () => {
    const r = classifyPathArg("docs/data.csv", deps);
    expect(r.kind).toBe("error");
});

test(".markdown is NOT accepted — the sidebar only lists .md", () => {
    expect(classifyPathArg("docs/a.markdown", deps).kind).toBe("error");
});

test("a typo'd directory name errors rather than becoming a note", () => {
    expect(classifyPathArg("docz", deps).kind).toBe("error");
});
