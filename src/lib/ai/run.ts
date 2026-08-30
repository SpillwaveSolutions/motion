import { callLLMFromUI } from "../llmClient";
import { buildAiContext, type AiContextInput } from "./context";
import { packPrompt, unwrapReply } from "./prompt";

export type RunAskAiInput = Omit<AiContextInput, "budget"> & {
    instruction: string;
    budget?: number;
};

/**
 * One pipeline: pack context, one LLM call, unwrap a wrapping fence.
 * Transport is still callLLMFromUI (CLI). Streaming lands in a later task.
 */
export async function runAskAi(input: RunAskAiInput): Promise<string> {
    const instruction = input.instruction.trim();
    if (!instruction) {
        throw new Error("Ask AI needs an instruction.");
    }
    const ctx = buildAiContext({
        title: input.title,
        before: input.before,
        selection: input.selection,
        after: input.after,
        priorOps: input.priorOps,
        budget: input.budget,
    });
    const packed = packPrompt(ctx, instruction);
    const response = await callLLMFromUI("claude", packed);
    const reply = unwrapReply(response.content ?? "");
    if (!reply.trim()) {
        throw new Error("The model returned an empty reply.");
    }
    return reply;
}
