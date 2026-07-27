import { test, expect, describe } from "bun:test";
import { shouldSyncMarkdownIntoEditor } from "./index";

describe("shouldSyncMarkdownIntoEditor", () => {
    test("syncs when leaving markdown for wysiwyg", () => {
        expect(shouldSyncMarkdownIntoEditor("markdown", "wysiwyg")).toBe(true);
    });

    test("syncs when leaving markdown for split", () => {
        expect(shouldSyncMarkdownIntoEditor("markdown", "split")).toBe(true);
    });

    test("does not sync when staying in markdown", () => {
        expect(shouldSyncMarkdownIntoEditor("markdown", "markdown")).toBe(false);
    });

    test("does not sync between wysiwyg and split (onUpdate already keeps rawMarkdown current)", () => {
        expect(shouldSyncMarkdownIntoEditor("wysiwyg", "split")).toBe(false);
        expect(shouldSyncMarkdownIntoEditor("split", "wysiwyg")).toBe(false);
    });

    test("does not sync on initial mount (no previous mode)", () => {
        expect(shouldSyncMarkdownIntoEditor(null, "markdown")).toBe(false);
        expect(shouldSyncMarkdownIntoEditor(null, "wysiwyg")).toBe(false);
    });

    test("does not sync when entering markdown mode", () => {
        expect(shouldSyncMarkdownIntoEditor("wysiwyg", "markdown")).toBe(false);
    });
});
