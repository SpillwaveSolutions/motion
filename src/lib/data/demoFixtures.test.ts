import { describe, expect, test } from "bun:test";
import {
    DEMO_DATA_FIXTURES,
    asErrorMessage,
    basenameOf,
    readDatasetContent,
} from "./demoFixtures";

describe("demoFixtures", () => {
    test("basenameOf strips directories on both separators", () => {
        expect(basenameOf("sample-data.csv")).toBe("sample-data.csv");
        expect(basenameOf("data/sample-data.csv")).toBe("sample-data.csv");
        expect(basenameOf("C:\\notes\\sample-events.jsonl")).toBe("sample-events.jsonl");
    });

    test("readDatasetContent prefers a successful workspace read", async () => {
        const { content, fromFixture } = await readDatasetContent(
            "sample-data.csv",
            async () => "from-workspace"
        );
        expect(fromFixture).toBe(false);
        expect(content).toBe("from-workspace");
    });

    test("readDatasetContent falls back to the welcome fixture when storage fails", async () => {
        const { content, fromFixture } = await readDatasetContent(
            "sample-data.csv",
            async () => {
                throw new Error("No workspace opened. Open a folder first.");
            }
        );
        expect(fromFixture).toBe(true);
        expect(content).toBe(DEMO_DATA_FIXTURES["sample-data.csv"]!);
        expect(content).toContain("Alice");
        expect(content).toContain("Architect");
    });

    test("readDatasetContent falls back for nested/demo basenames", async () => {
        const { fromFixture, content } = await readDatasetContent(
            "public/demo/sample-events.jsonl",
            async () => {
                throw new Error("not found");
            }
        );
        expect(fromFixture).toBe(true);
        expect(content).toContain("login");
        expect(content).toContain("Alice");
    });

    test("readDatasetContent rethrows when the path is not a known fixture", async () => {
        await expect(
            readDatasetContent("sales.csv", async () => {
                throw new Error("No such file");
            })
        ).rejects.toThrow(/No such file/);
    });

    test("asErrorMessage surfaces Tauri string rejects", () => {
        expect(asErrorMessage("No workspace opened", "Failed to load dataset")).toBe(
            "No workspace opened"
        );
        expect(asErrorMessage(new Error("boom"), "Failed to load dataset")).toBe("boom");
        expect(asErrorMessage({}, "Failed to load dataset")).toBe("Failed to load dataset");
    });
});
