import { expect, test } from "bun:test";
import { noteStem, renameDestPath, sameNotePath } from "./renameNote";

test("stem drops a markdown extension and keeps the rest", () => {
    expect(noteStem("welcome.md")).toBe("welcome");
    expect(noteStem("README.markdown")).toBe("README");
    expect(noteStem("noext")).toBe("noext");
});

test("a typed stem stays in the same folder and gains .md", () => {
    expect(renameDestPath("/ws/docs/untitled-1.md", "standup")).toBe("/ws/docs/standup.md");
    expect(renameDestPath("/ws/docs/untitled-1.md", "standup.md")).toBe("/ws/docs/standup.md");
});

test("Windows separators stay Windows", () => {
    expect(renameDestPath("C:\\ws\\docs\\a.md", "b")).toBe("C:\\ws\\docs\\b.md");
});

test("path separators in the typed name cannot escape the folder", () => {
    expect(renameDestPath("/ws/docs/a.md", "../outside")).toBe("/ws/docs/-outside.md");
    expect(renameDestPath("/ws/docs/a.md", "foo/bar")).toBe("/ws/docs/foo-bar.md");
});

test("empty or dot-only names are refused", () => {
    expect(renameDestPath("/ws/a.md", "   ")).toBeNull();
    expect(renameDestPath("/ws/a.md", "...")).toBeNull();
    expect(renameDestPath("/ws/a.md", "/")).toBeNull();
});

test("sameNotePath treats slash styles as equal", () => {
    expect(sameNotePath("/ws/a.md", "/ws/a.md")).toBe(true);
    expect(sameNotePath("C:\\ws\\a.md", "C:/ws/a.md")).toBe(true);
    expect(sameNotePath("/ws/a.md", "/ws/b.md")).toBe(false);
});
