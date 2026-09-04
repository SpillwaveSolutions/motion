import { describe, expect, test } from "bun:test";
import { isWindowDragTarget, type DragNode } from "./windowDrag";

function node(
    tagName: string,
    attrs: Record<string, string> = {},
    parent: DragNode | null = null
): DragNode {
    const el: DragNode = {
        tagName,
        parentElement: parent,
        getAttribute(name: string) {
            return attrs[name] ?? null;
        },
    };
    return el;
}

describe("isWindowDragTarget", () => {
    test("logo and the header itself are grab targets", () => {
        const header = node("HEADER");
        const logo = node("DIV", { class: "logo" }, header);
        expect(isWindowDragTarget(logo, header)).toBe(true);
        expect(isWindowDragTarget(header, header)).toBe(true);
    });

    test("the drag gutter is a grab target", () => {
        const header = node("HEADER");
        const gutter = node("DIV", { "data-tauri-drag-region": "" }, header);
        expect(isWindowDragTarget(gutter, header)).toBe(true);
    });

    test("buttons, links, and inputs are not", () => {
        const header = node("HEADER");
        expect(isWindowDragTarget(node("BUTTON", {}, header), header)).toBe(false);
        expect(isWindowDragTarget(node("A", {}, header), header)).toBe(false);
        expect(isWindowDragTarget(node("INPUT", {}, header), header)).toBe(false);
        expect(isWindowDragTarget(node("TEXTAREA", {}, header), header)).toBe(false);
        expect(isWindowDragTarget(node("SELECT", {}, header), header)).toBe(false);
        expect(isWindowDragTarget(node("LABEL", {}, header), header)).toBe(false);
    });

    test("a child of a button is not, even if the child is a plain div", () => {
        const header = node("HEADER");
        const button = node("BUTTON", {}, header);
        const icon = node("DIV", {}, button);
        expect(isWindowDragTarget(icon, header)).toBe(false);
    });

    test("a no-drag subtree swallows the drag even for a plain div", () => {
        const header = node("HEADER");
        const actions = node("DIV", { "data-tauri-drag-region": "false" }, header);
        const inner = node("DIV", {}, actions);
        expect(isWindowDragTarget(inner, header)).toBe(false);
    });

    test("interactive roles are not grab targets", () => {
        const header = node("HEADER");
        expect(isWindowDragTarget(node("DIV", { role: "button" }, header), header)).toBe(false);
        expect(isWindowDragTarget(node("DIV", { role: "textbox" }, header), header)).toBe(false);
    });

    test("contenteditable is not a grab target", () => {
        const header = node("HEADER");
        expect(isWindowDragTarget(node("DIV", { contenteditable: "true" }, header), header)).toBe(
            false
        );
        expect(isWindowDragTarget(node("DIV", { contenteditable: "false" }, header), header)).toBe(
            true
        );
    });

    test("a target outside the header is not", () => {
        const header = node("HEADER");
        const elsewhere = node("DIV");
        expect(isWindowDragTarget(elsewhere, header)).toBe(false);
        expect(isWindowDragTarget(null, header)).toBe(false);
        expect(isWindowDragTarget(header, null)).toBe(false);
    });
});
