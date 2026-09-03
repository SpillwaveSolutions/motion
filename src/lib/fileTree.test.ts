import { describe, expect, test } from "bun:test";
import {
    ancestorDirRels,
    buildFileTree,
    dirsToRevealPaths,
    filterPathsByName,
    flattenTreeFiles,
    sortPaths,
    toRel,
} from "./fileTree";

const root = "/ws";

describe("fileTree", () => {
    test("toRel strips the workspace prefix", () => {
        expect(toRel("/ws", "/ws/a.md")).toBe("a.md");
        expect(toRel("/ws", "/ws/nested/b.md")).toBe("nested/b.md");
    });

    test("buildFileTree nests directories and files", () => {
        const paths = [
            "/ws/root.md",
            "/ws/nested/deeper.md",
            "/ws/nested/other.md",
            "/ws/alpha/z.md",
        ];
        const tree = buildFileTree(paths, root);
        expect(flattenTreeFiles(tree).sort()).toEqual([...paths].sort());

        const names = tree.map((n) => n.name);
        // dirs first, alphabetically, then root files
        expect(names).toContain("alpha");
        expect(names).toContain("nested");
        expect(names).toContain("root.md");

        const nested = tree.find((n) => n.kind === "dir" && n.name === "nested");
        expect(nested?.kind).toBe("dir");
        if (nested?.kind === "dir") {
            expect(nested.children.map((c) => c.name).sort()).toEqual([
                "deeper.md",
                "other.md",
            ]);
        }
    });

    test("filterPathsByName is basename substring match", () => {
        const paths = ["/ws/Welcome.md", "/ws/nested/deeper.md"];
        expect(filterPathsByName(paths, "come").map((p) => p.split("/").pop())).toEqual([
            "Welcome.md",
        ]);
        expect(filterPathsByName(paths, "")).toEqual(paths);
    });

    test("ancestorDirRels walks parents for nested files", () => {
        expect(ancestorDirRels("root.md")).toEqual([]);
        expect(ancestorDirRels("nested/deeper.md")).toEqual(["nested"]);
        expect(ancestorDirRels("a/b/c.md")).toEqual(["a", "a/b"]);
    });

    test("dirsToRevealPaths collects folders that hide matches", () => {
        const dirs = dirsToRevealPaths(
            ["/ws/nested/deeper.md", "/ws/alpha/z.md", "/ws/root.md"],
            root
        );
        expect(dirs.sort()).toEqual(["alpha", "nested"]);
    });

    test("sortPaths name and recent", () => {
        const paths = ["/ws/b.md", "/ws/a.md", "/ws/c.md"];
        expect(sortPaths(paths, "name-asc").map((p) => p.split("/").pop())).toEqual([
            "a.md",
            "b.md",
            "c.md",
        ]);
        expect(sortPaths(paths, "name-desc").map((p) => p.split("/").pop())).toEqual([
            "c.md",
            "b.md",
            "a.md",
        ]);
        const recent = new Map<string, number>([
            ["/ws/c.md", 100],
            ["/ws/a.md", 50],
        ]);
        expect(sortPaths(paths, "recent", recent).map((p) => p.split("/").pop())).toEqual([
            "c.md",
            "a.md",
            "b.md",
        ]);
    });
});
