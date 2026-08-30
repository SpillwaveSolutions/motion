import type { Editor } from "@tiptap/react";
import { TABLE_INSERT } from "./extensions/tableKit";

export interface InsertableBlock {
    label: string;
    nodeType: string;
}

export type InsertSlashCommand = {
    kind: "insert";
    label: string;
    nodeType: string;
};

export type AiSlashCommand = {
    kind: "ai";
    label: string;
    id: "ask-ai";
};

export type SlashCommand = InsertSlashCommand | AiSlashCommand;

// Ask AI is first so typing /ai lands on it. /tab uniquely matches Table;
// /mer still uniquely matches Mermaid.
export const SLASH_COMMANDS: SlashCommand[] = [
    { kind: "ai", label: "Ask AI", id: "ask-ai" },
    { kind: "insert", label: "Table", nodeType: "table" },
    { kind: "insert", label: "Mermaid", nodeType: "mermaid" },
    { kind: "insert", label: "Dataset", nodeType: "dataset" },
    { kind: "insert", label: "Query", nodeType: "query" },
    { kind: "insert", label: "AI Diagram", nodeType: "diagramGen" },
    { kind: "insert", label: "AI Image", nodeType: "imageGen" },
];

export const INSERT_COMMANDS: InsertableBlock[] = SLASH_COMMANDS.filter(
    (c): c is InsertSlashCommand => c.kind === "insert"
).map(({ label, nodeType }) => ({ label, nodeType }));

export function filterSlashCommands(query: string): SlashCommand[] {
    const q = query.trim().toLowerCase();
    if (!q) return SLASH_COMMANDS;
    return SLASH_COMMANDS.filter((c) => c.label.toLowerCase().includes(q));
}

export function slashCommandKey(cmd: SlashCommand): string {
    return cmd.kind === "ai" ? cmd.id : cmd.nodeType;
}

/**
 * The shape of a ProseMirror ResolvedPos this module needs. Structural so the
 * position logic is unit-testable without standing up an editor.
 */
export interface ResolvedPosLike {
    depth: number;
    node(depth: number): { type: { name: string } };
    after(depth: number): number;
}

/**
 * Position just after the table the caret sits in, or null when it is not in
 * one.
 *
 * Table cells are `block+`, so inserting a table while the caret is in a cell
 * nests one table inside another -- which GFM cannot represent, so the note
 * cannot round-trip. Walking outwards (shallowest depth first) returns the
 * OUTERMOST table, so an already-nested document still escapes completely.
 */
export function enclosingTableEnd($from: ResolvedPosLike): number | null {
    for (let depth = 1; depth <= $from.depth; depth++) {
        if ($from.node(depth).type.name === "table") return $from.after(depth);
    }
    return null;
}

/**
 * Re-base a document position for a deletion queued earlier in the same chain.
 *
 * The slash path deletes the typed "/tab" before inserting, and that text sits
 * inside the cell -- i.e. before the table's end position. Both commands run in
 * one transaction, so the position handed to the later command must already be
 * in post-deletion coordinates.
 */
export function shiftForDeletedRange(pos: number, range?: { from: number; to: number }): number {
    if (!range || range.to > pos) return pos;
    return pos - (range.to - range.from);
}

// Atom nodes inserted at a position with no following block (e.g. end of
// document) leave a NodeSelection on themselves rather than a text cursor --
// the next insertContent call then replaces the selected node instead of
// adding a new one. Always pairing the insert with a trailing paragraph
// guarantees a text cursor lands after it, every time.
//
// Tables are not atoms: insertTable drops the caret in the first header cell.
export function insertBlock(
    editor: Editor,
    nodeType: string,
    range?: { from: number; to: number }
) {
    const chain = editor.chain().focus();
    if (range) {
        chain.deleteRange(range);
    }
    if (nodeType === "table") {
        const end = enclosingTableEnd(editor.state.selection.$from);
        if (end !== null) {
            // Escape the current table first. The empty paragraph is not a
            // wart: two GFM tables with no block between them re-parse as one
            // table, so the separator is what keeps the round-trip honest.
            chain.insertContentAt(shiftForDeletedRange(end, range), { type: "paragraph" });
        }
        chain.insertTable({ ...TABLE_INSERT }).run();
        return;
    }
    chain.insertContent([{ type: nodeType }, { type: "paragraph" }]).run();
}
