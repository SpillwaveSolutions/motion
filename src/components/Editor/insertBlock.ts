import type { Editor } from "@tiptap/react";

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

// Ask AI is first so typing /ai lands on it. /mer still uniquely matches Mermaid.
export const SLASH_COMMANDS: SlashCommand[] = [
    { kind: "ai", label: "Ask AI", id: "ask-ai" },
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
