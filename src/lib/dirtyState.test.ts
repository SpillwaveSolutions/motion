import { expect, test } from "bun:test";
import { isDirty } from "./dirtyState";

test("a freshly loaded document is clean", () => {
    expect(isDirty("# Note\n", "# Note\n")).toBe(false);
});

test("editing makes it dirty", () => {
    expect(isDirty("# Note edited\n", "# Note\n")).toBe(true);
});

test("saving makes it clean again", () => {
    const afterSave = "# Note edited\n";
    expect(isDirty(afterSave, afterSave)).toBe(false);
});

test("reverting an edit by hand makes it clean again", () => {
    expect(isDirty("# Note\n", "# Note\n")).toBe(false);
});

test("nothing loaded is never dirty — the welcome placeholder is not the user's", () => {
    expect(isDirty("", null)).toBe(false);
    expect(isDirty("anything at all", null)).toBe(false);
});

test("an empty note the user emptied is still dirty", () => {
    expect(isDirty("", "# Note\n")).toBe(true);
});

test("whitespace counts — a stray trailing newline is a real unsaved change", () => {
    expect(isDirty("# Note\n\n", "# Note\n")).toBe(true);
});
