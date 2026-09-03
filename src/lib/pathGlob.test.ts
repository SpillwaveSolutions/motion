import { describe, expect, test } from "bun:test";
import {
    filterPathsByGlob,
    globToRegExp,
    looksLikeGlob,
    matchGlob,
} from "./pathGlob";

describe("pathGlob", () => {
    test("looksLikeGlob detects specials and slashes", () => {
        expect(looksLikeGlob("")).toBe(false);
        expect(looksLikeGlob("welcome")).toBe(false);
        expect(looksLikeGlob("knowledge/**")).toBe(true);
        expect(looksLikeGlob("**/index.md")).toBe(true);
        expect(looksLikeGlob("nested/")).toBe(true);
        expect(looksLikeGlob("*.md")).toBe(true);
    });

    test("matchGlob ** and *", () => {
        expect(matchGlob("knowledge/a.md", "knowledge/**")).toBe(true);
        expect(matchGlob("knowledge/sub/b.md", "knowledge/**")).toBe(true);
        expect(matchGlob("agents/x.md", "knowledge/**")).toBe(false);
        expect(matchGlob("nested/deeper.md", "**/deeper.md")).toBe(true);
        expect(matchGlob("deeper.md", "**/deeper.md")).toBe(true);
        expect(matchGlob("nested/deeper.md", "nested/*")).toBe(true);
        expect(matchGlob("nested/sub/x.md", "nested/*")).toBe(false);
        expect(matchGlob("index.md", "**/index.md")).toBe(true);
    });

    test("empty pattern matches all", () => {
        expect(matchGlob("any/path.md", "")).toBe(true);
        expect(globToRegExp("**").test("a/b.md")).toBe(true);
    });

    test("filterPathsByGlob plain name uses basename", () => {
        const paths = ["/ws/welcome.md", "/ws/nested/deeper.md"];
        expect(filterPathsByGlob(paths, "/ws", "welcome")).toEqual(["/ws/welcome.md"]);
    });

    test("filterPathsByGlob applies path glob", () => {
        const paths = [
            "/ws/welcome.md",
            "/ws/nested/deeper.md",
            "/ws/nested/other.md",
            "/ws/alpha/z.md",
        ];
        expect(filterPathsByGlob(paths, "/ws", "nested/**").sort()).toEqual([
            "/ws/nested/deeper.md",
            "/ws/nested/other.md",
        ]);
        expect(filterPathsByGlob(paths, "/ws", "**/deeper.md")).toEqual([
            "/ws/nested/deeper.md",
        ]);
    });

    test("empty glob returns all paths", () => {
        const paths = ["/ws/a.md", "/ws/b.md"];
        expect(filterPathsByGlob(paths, "/ws", "  ")).toEqual(paths);
    });
});
