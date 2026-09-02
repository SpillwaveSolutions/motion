import { test, expect, describe } from "bun:test";
import {
    basename,
    explainDatasetError,
    explainMissingDataset,
    explainQueryError,
    isDemoDataFile,
    workspaceHasDataFile,
} from "./datasetErrors";

describe("isDemoDataFile", () => {
    test("matches the welcome fixtures by basename", () => {
        expect(isDemoDataFile("sample-data.csv")).toBe(true);
        expect(isDemoDataFile("sample-events.jsonl")).toBe(true);
        expect(isDemoDataFile("notes/sample-data.csv")).toBe(true);
    });

    test("does not match other CSVs", () => {
        expect(isDemoDataFile("does-not-exist.csv")).toBe(false);
        expect(isDemoDataFile("my-sample-data.csv")).toBe(false);
    });
});

describe("workspaceHasDataFile", () => {
    test("matches a relative path exactly", () => {
        expect(workspaceHasDataFile(["sample-data.csv", "events.jsonl"], "sample-data.csv")).toBe(
            true
        );
    });

    test("matches a listed nested file by basename", () => {
        expect(workspaceHasDataFile(["data/sample-data.csv"], "sample-data.csv")).toBe(true);
    });

    test("matches an absolute listing against a relative document source", () => {
        expect(
            workspaceHasDataFile(["/tmp/motion-e2e-AcWQXZ/sample-data.csv"], "sample-data.csv")
        ).toBe(true);
        expect(
            workspaceHasDataFile(["C:\\Users\\me\\project\\sample-events.jsonl"], "sample-events.jsonl")
        ).toBe(true);
    });

    test("does not match a prefix sibling", () => {
        expect(workspaceHasDataFile(["my-sample-data.csv"], "sample-data.csv")).toBe(false);
    });

    test("missing source is missing", () => {
        expect(workspaceHasDataFile(["sample-data.csv"], "does-not-exist.csv")).toBe(false);
        expect(workspaceHasDataFile([], "sample-data.csv")).toBe(false);
    });
});

describe("explainMissingDataset", () => {
    test("demo files get the demo-folder hint", () => {
        expect(explainMissingDataset("sample-data.csv")).toMatch(/Demo data is not in this workspace/);
        expect(explainMissingDataset("sample-events.jsonl")).toMatch(/demo folder/i);
    });

    test("any other missing file names the path", () => {
        expect(explainMissingDataset("does-not-exist.csv")).toBe(
            "Not in this workspace: does-not-exist.csv"
        );
    });
});

describe("explainDatasetError", () => {
    test("HTTP / not-found errors become the missing-file copy", () => {
        expect(
            explainDatasetError("sample-data.csv", new Error('Failed to read "sample-data.csv": No such file'))
        ).toMatch(/Demo data is not in this workspace/);
        expect(
            explainDatasetError("does-not-exist.csv", new Error("No such file: does-not-exist.csv"))
        ).toBe("Not in this workspace: does-not-exist.csv");
    });

    test("unrelated errors pass through", () => {
        expect(explainDatasetError("x.csv", new Error("DuckDB exploded"))).toBe("DuckDB exploded");
    });
});

describe("explainQueryError", () => {
    test("rewrites a DuckDB catalog miss", () => {
        const out = explainQueryError(
            new Error("Catalog Error: Table with name team does not exist")
        );
        expect(out).toMatch(/Table "team" isn't registered/);
        expect(out).not.toMatch(/Catalog Error/);
    });

    test("other SQL errors pass through", () => {
        expect(explainQueryError(new Error("Parser Error: syntax"))).toBe("Parser Error: syntax");
    });
});

describe("basename", () => {
    test("strips directories on both separators", () => {
        expect(basename("a/b/c.csv")).toBe("c.csv");
        expect(basename("a\\b\\c.csv")).toBe("c.csv");
    });
});
