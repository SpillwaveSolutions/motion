import type { Editor } from "@tiptap/react";

export interface InsertableBlock {
    label: string;
    nodeType: string;
}

export const INSERT_COMMANDS: InsertableBlock[] = [
    { label: "Mermaid", nodeType: "mermaid" },
    { label: "Dataset", nodeType: "dataset" },
    { label: "Query", nodeType: "query" },
    { label: "AI Diagram", nodeType: "diagramGen" },
    { label: "AI Image", nodeType: "imageGen" },
];

// Atom nodes inserted at a position with no following block (e.g. end of
// document) leave a NodeSelection on themselves rather than a text cursor --
// the next insertContent call then replaces the selected node instead of
// adding a new one. Always pairing the insert with a trailing paragraph
// guarantees a text cursor lands after it, every time.
export function insertBlock(
    editor: Editor,
    nodeType: string,
    range?: { from: number; to: number }
) {
    const chain = editor.chain().focus();
    if (range) {
        chain.deleteRange(range);
    }
    chain.insertContent([{ type: nodeType }, { type: "paragraph" }]).run();
}
