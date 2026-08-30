import type { AiContext } from "./context";
import type { AiScope } from "./apply";

export interface CannedPrompt {
    id: string;
    label: string;
    instruction: string;
    scopes: readonly AiScope[];
}

export const REFINE_INSTRUCTION =
    "Refine this document. Ensure all code blocks are complete and correctly formatted. Maintain the original meaning but improve clarity and flow. Return only the refined markdown.";

export const CANNED_PROMPTS: readonly CannedPrompt[] = [
    {
        id: "rewrite",
        label: "Rewrite",
        instruction: "Rewrite the selected text more clearly, preserving meaning and technical terms.",
        scopes: ["selection"],
    },
    {
        id: "tighten",
        label: "Tighten",
        instruction: "Make the selected text more concise without losing meaning.",
        scopes: ["selection"],
    },
    {
        id: "expand",
        label: "Expand",
        instruction: "Expand the target with useful detail in the same voice.",
        scopes: ["selection", "cursor"],
    },
    {
        id: "grammar",
        label: "Fix grammar",
        instruction: "Fix grammar and spelling. Do not change meaning or tone.",
        scopes: ["selection", "document"],
    },
    {
        id: "continue",
        label: "Continue",
        instruction: "Continue writing from the cursor in the same voice and tense.",
        scopes: ["cursor"],
    },
    {
        id: "refine",
        label: "Refine",
        instruction: REFINE_INSTRUCTION,
        scopes: ["document"],
    },
];

export function cannedForScope(scope: AiScope): CannedPrompt[] {
    return CANNED_PROMPTS.filter((c) => c.scopes.includes(scope));
}

/**
 * If the model wrapped the entire reply in a markdown fence, unwrap it.
 * Leaves fenced blocks that are part of a larger reply (or a non-md language
 * the user actually asked for) alone.
 */
export function unwrapReply(text: string): string {
    const trimmed = text.replace(/^\uFEFF/, "").trim();
    const match = /^```(?:markdown|md|mdx)?\s*\n([\s\S]*?)\n```$/i.exec(trimmed);
    if (!match) return trimmed;
    return (match[1] ?? "").replace(/\s+$/, "");
}

export const SYSTEM_PROMPT =
    "You are a technical editor for a local markdown IDE. Return only markdown. Do not wrap the entire reply in a code fence unless the user asked for a code block.";

/**
 * Split the packed prompt so the SDK can put a prompt-cache breakpoint on
 * the document context (stable across Try again) and leave the instruction
 * uncached.
 */
export function packPromptParts(
    ctx: AiContext,
    instruction: string
): { systemPrompt: string; context: string; instruction: string; prompt: string } {
    const parts: string[] = [`Document title: ${ctx.title}`];

    if (ctx.priorOps.length > 0) {
        parts.push("Recent accepted AI edits in this document:");
        for (const op of ctx.priorOps) {
            parts.push(`- Instruction: ${op.instruction}\n  Result: ${op.resultSummary}`);
        }
    }

    if (ctx.before) {
        parts.push(`Text before the target:\n${ctx.before}`);
    }

    if (ctx.selection) {
        parts.push(`Selected text (the target):\n${ctx.selection}`);
    } else {
        parts.push(
            "No text is selected. Operate at the cursor (between the before and after text)."
        );
    }

    if (ctx.after) {
        parts.push(`Text after the target:\n${ctx.after}`);
    }

    if (ctx.truncated) {
        parts.push("(Surrounding text was truncated to fit the context budget.)");
    }

    const trimmed = instruction.trim();
    const context = parts.join("\n\n");
    const prompt = `${context}\n\nInstruction:\n${trimmed}\n\nReturn only the markdown for the result. No preamble.`;
    return {
        systemPrompt: SYSTEM_PROMPT,
        context,
        instruction: trimmed,
        prompt,
    };
}

export function packPrompt(
    ctx: AiContext,
    instruction: string
): { prompt: string; systemPrompt: string } {
    const packed = packPromptParts(ctx, instruction);
    return { systemPrompt: packed.systemPrompt, prompt: packed.prompt };
}
