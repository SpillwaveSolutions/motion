import { describe, expect, test } from "bun:test";
import {
    loadPersistedWorkspace,
    memoryKv,
    persistWorkspace,
    WORKSPACE_FILE_KEY,
    WORKSPACE_ROOT_KEY,
} from "./workspaceMemory";

describe("workspaceMemory", () => {
    test("round-trips a folder and file", () => {
        const kv = memoryKv();
        persistWorkspace("/notes", "/notes/a.md", kv);
        expect(loadPersistedWorkspace(kv)).toEqual({
            root: "/notes",
            file: "/notes/a.md",
        });
    });

    test("clearing the folder also drops the stored keys", () => {
        const kv = memoryKv({
            [WORKSPACE_ROOT_KEY]: "/old",
            [WORKSPACE_FILE_KEY]: "/old/x.md",
        });
        persistWorkspace(null, null, kv);
        expect(loadPersistedWorkspace(kv)).toEqual({ root: null, file: null });
    });

    test("a missing store is a silent no-op", () => {
        persistWorkspace("/notes", "/notes/a.md", null);
        expect(loadPersistedWorkspace(null)).toEqual({ root: null, file: null });
    });
});
