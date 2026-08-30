/**
 * Packed document context for an Ask AI / Refine call.
 *
 * Pure: title + surrounding text + selection + prior accepted ops, truncated
 * to a character budget. No Tiptap, no I/O.
 */

export const DEFAULT_BUDGET = 12_000;

export interface AiPriorOp {
    instruction: string;
    resultSummary: string;
}

export interface AiContextInput {
    title: string;
    before: string;
    selection: string | null;
    after: string;
    priorOps: readonly AiPriorOp[];
    budget?: number;
}

export interface AiContext {
    title: string;
    before: string;
    selection: string | null;
    after: string;
    priorOps: AiPriorOp[];
    truncated: boolean;
}

const PRIOR_OP_CAP = 6;
const PRIOR_INSTRUCTION_CAP = 200;
const PRIOR_SUMMARY_CAP = 240;

export function titleFromPath(path: string | null | undefined): string {
    if (!path) return "untitled";
    const base = path.split("/").pop() ?? path;
    const stripped = base.replace(/\.(mdx?|markdown|mdown|mkd)$/i, "");
    return stripped || "untitled";
}

function truncateEnd(text: string, n: number): { text: string; truncated: boolean } {
    if (n <= 0) return { text: "", truncated: text.length > 0 };
    if (text.length <= n) return { text, truncated: false };
    if (n === 1) return { text: "…", truncated: true };
    return { text: text.slice(0, n - 1) + "…", truncated: true };
}

function truncateStart(text: string, n: number): { text: string; truncated: boolean } {
    if (n <= 0) return { text: "", truncated: text.length > 0 };
    if (text.length <= n) return { text, truncated: false };
    if (n === 1) return { text: "…", truncated: true };
    return { text: "…" + text.slice(text.length - (n - 1)), truncated: true };
}

export function buildAiContext(input: AiContextInput): AiContext {
    const budget = input.budget ?? DEFAULT_BUDGET;
    const title = input.title.trim() || "untitled";
    const priorOps = input.priorOps.slice(-PRIOR_OP_CAP).map((op) => ({
        instruction: op.instruction.slice(0, PRIOR_INSTRUCTION_CAP),
        resultSummary: op.resultSummary.slice(0, PRIOR_SUMMARY_CAP),
    }));
    const priorChars = priorOps.reduce(
        (n, op) => n + op.instruction.length + op.resultSummary.length,
        0
    );

    const rawSelection = input.selection && input.selection.length > 0 ? input.selection : null;
    const selectionBudget = Math.floor(budget / 2);
    let truncated = false;
    let selection = rawSelection;
    if (rawSelection && rawSelection.length > selectionBudget) {
        const cut = truncateEnd(rawSelection, selectionBudget);
        selection = cut.text;
        truncated = cut.truncated;
    }

    const remaining = Math.max(0, budget - title.length - (selection?.length ?? 0) - priorChars);
    const beforeBudget = Math.floor(remaining / 2);
    const beforeCut = truncateStart(input.before, beforeBudget);
    const afterCut = truncateEnd(input.after, remaining - beforeCut.text.length);
    truncated = truncated || beforeCut.truncated || afterCut.truncated;

    return {
        title,
        before: beforeCut.text,
        selection,
        after: afterCut.text,
        priorOps,
        truncated,
    };
}
