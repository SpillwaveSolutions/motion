import { describe, expect, test } from "bun:test";
import { loadPublishSettings, memoryKv, savePublishSettings } from "./settings";

describe("publish settings", () => {
    test("round-trips tokens", () => {
        const kv = memoryKv();
        savePublishSettings(
            { githubToken: "ghp_x", notionToken: "ntn_y", notionParentPageId: "page" },
            kv,
        );
        expect(loadPublishSettings(kv)).toEqual({
            githubToken: "ghp_x",
            notionToken: "ntn_y",
            notionParentPageId: "page",
        });
    });

    test("empty values clear stored keys", () => {
        const kv = memoryKv();
        savePublishSettings(
            { githubToken: "ghp_x", notionToken: "ntn_y", notionParentPageId: "page" },
            kv,
        );
        savePublishSettings(
            { githubToken: "", notionToken: "", notionParentPageId: "" },
            kv,
        );
        expect(loadPublishSettings(kv)).toEqual({
            githubToken: "",
            notionToken: "",
            notionParentPageId: "",
        });
    });
});
