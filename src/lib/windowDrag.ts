import { isTauri } from "@tauri-apps/api/core";

/**
 * Which header mousedowns should move the native window.
 *
 * Tauri 2.9.5's injected drag.js reads `data-tauri-drag-region` from the
 * **event target only** — it does not walk ancestors. A mousedown on the
 * logo (a child of the header) therefore never starts a drag even when the
 * header itself carries the attribute. We own the walk and call
 * `startDragging()` ourselves. See docs/plans/2026-09-03-editor-surface-zoom-layout-icons.md.
 *
 * Duck-typed so the predicate is unit-testable without a DOM (bun test has
 * no `document`). A real Element satisfies the shape.
 */

const NO_DRAG_TAGS = new Set(["BUTTON", "A", "INPUT", "TEXTAREA", "SELECT", "LABEL", "OPTION"]);

const INTERACTIVE_ROLES = new Set([
    "button",
    "link",
    "menuitem",
    "menuitemcheckbox",
    "menuitemradio",
    "textbox",
    "searchbox",
    "combobox",
    "listbox",
    "option",
    "slider",
    "spinbutton",
    "switch",
    "tab",
    "checkbox",
    "radio",
    "menu",
]);

export interface DragNode {
    tagName: string;
    getAttribute(name: string): string | null;
    parentElement: DragNode | null;
}

function asDragNode(node: unknown): DragNode | null {
    if (!node || typeof node !== "object") return null;
    const n = node as Partial<DragNode>;
    if (typeof n.tagName !== "string" || typeof n.getAttribute !== "function") return null;
    return n as DragNode;
}

function headerContains(header: DragNode, target: DragNode): boolean {
    let el: DragNode | null = target;
    while (el) {
        if (el === header) return true;
        el = el.parentElement;
    }
    return false;
}

function isContentEditable(el: DragNode): boolean {
    const value = el.getAttribute("contenteditable");
    return value !== null && value !== "false";
}

/**
 * True when a mousedown on `target` inside `header` should start a window drag.
 *
 * Returns false for buttons, links, form fields, labels, contenteditable,
 * interactive ARIA roles, and any subtree marked `data-tauri-drag-region="false"`.
 */
export function isWindowDragTarget(target: unknown, header: unknown): boolean {
    const t = asDragNode(target);
    const h = asDragNode(header);
    if (!t || !h) return false;
    if (!headerContains(h, t)) return false;

    let el: DragNode | null = t;
    while (el) {
        if (el.getAttribute("data-tauri-drag-region") === "false") return false;
        if (NO_DRAG_TAGS.has(el.tagName)) return false;
        if (isContentEditable(el)) return false;
        const role = el.getAttribute("role");
        if (role && INTERACTIVE_ROLES.has(role)) return false;
        if (el === h) break;
        el = el.parentElement;
    }
    return true;
}

/**
 * Report a denied window call once, loudly enough to be found.
 *
 * The empty catch that used to sit here hid an access control list rejection
 * through three releases: the capability file granted only `core:default`,
 * which does not include `core:window:allow-start-dragging`, so every drag was
 * rejected and silently discarded. This path only runs under Tauri, and the E2E
 * console gate runs in browser mode, so warning here costs nothing and would
 * have saved 0.6.2, 0.6.3 and 0.6.4.
 */
let warned = false;
function reportWindowCallFailure(what: string, error: unknown): void {
    if (warned) return;
    warned = true;
    console.warn(
        `Motion: window.${what}() was rejected. Check src-tauri/capabilities/default.json ` +
            `grants core:window:allow-${what === "startDragging" ? "start-dragging" : "toggle-maximize"}.`,
        error
    );
}

export async function startWindowDrag(): Promise<void> {
    if (!isTauri()) return;
    try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        await getCurrentWindow().startDragging();
    } catch (error) {
        reportWindowCallFailure("startDragging", error);
    }
}

export async function toggleWindowMaximize(): Promise<void> {
    if (!isTauri()) return;
    try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        await getCurrentWindow().toggleMaximize();
    } catch (error) {
        reportWindowCallFailure("toggleMaximize", error);
    }
}
