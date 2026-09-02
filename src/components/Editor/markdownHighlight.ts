/**
 * Markdown source highlighting.
 *
 * Uses the same `lowlight` instance language pack already in the client bundle
 * for Tiptap code blocks. Browser-safe: no Bun, no DOM.
 */
import { common, createLowlight } from "lowlight";
import type { ReactNode } from "react";
import { createElement, Fragment } from "react";

const lowlight = createLowlight(common);

export type HastNode = {
    type: string;
    tagName?: string;
    value?: string;
    properties?: { className?: string | string[] };
    children?: HastNode[];
};

export function highlightMarkdownTree(source: string): HastNode {
    return lowlight.highlight("markdown", source) as HastNode;
}

function className(node: HastNode): string {
    const raw = node.properties?.className;
    if (!raw) return "";
    return Array.isArray(raw) ? raw.join(" ") : raw;
}

export function collectHighlightClasses(source: string): string[] {
    const out = new Set<string>();
    const walk = (node: HastNode) => {
        const cls = className(node);
        if (cls) {
            for (const token of cls.split(/\s+/)) {
                if (token) out.add(token);
            }
        }
        for (const child of node.children ?? []) walk(child);
    };
    walk(highlightMarkdownTree(source));
    return [...out];
}

export function renderHast(node: HastNode, key?: string | number): ReactNode {
    if (node.type === "text") return node.value ?? "";
    const children = (node.children ?? []).map((child, i) => renderHast(child, i));
    if (node.type === "element") {
        const cls = className(node);
        if (cls) {
            return createElement("span", { key, className: cls }, ...children);
        }
        return createElement(Fragment, { key }, ...children);
    }
    return createElement(Fragment, { key }, ...children);
}

export function renderMarkdownHighlight(source: string): ReactNode {
    return renderHast(highlightMarkdownTree(source));
}
