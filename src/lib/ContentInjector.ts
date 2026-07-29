import { callLLMFromUI } from './llmClient';
import type { ModelProvider } from './cliWrappers';

export interface RefinedChunk {
    content: string;
    summary: string;
    metadata: Record<string, any>;
}

export class ContentInjector {
    private provider: ModelProvider;
    private model?: string;

    constructor(provider: ModelProvider = 'claude', model?: string) {
        this.provider = provider;
        this.model = model;
    }

    /**
     * Refines a content chunk by ensuring code block integrity, adding context, and fixing formatting.
     */
    async refineChunk(content: string, context: string): Promise<RefinedChunk> {
        const prompt = `
Refine the following content chunk. 
1. Ensure all code blocks are complete and correctly formatted.
2. Maintain the original meaning but improve clarity and flow.
3. Integrate the provided context if relevant.
4. Return only the refined markdown content.

CONTEXT:
${context}

CHUNK:
${content}
`;

        const response = await callLLMFromUI(this.provider, {
            model: this.model,
            prompt,
            systemPrompt: "You are a technical editor focusing on code integrity and clarity."
        });

        const summary = await this.generateSummary(response.content);

        return {
            content: response.content,
            summary,
            metadata: {
                provider: this.provider,
                model: this.model || 'default',
                timestamp: new Date().toISOString()
            }
        };
    }

    /**
     * Generates a concise bullet-point summary of the content for use in TOCs and SKILL.md.
     */
    async generateSummary(content: string): Promise<string> {
        const prompt = `
Generate a concise bullet-point summary for the following technical content.
Focus on the "intent" and "core concepts" covered.
Keep it to 2-4 high-impact bullet points.

CONTENT:
${content}
`;

        const response = await callLLMFromUI(this.provider, {
            model: this.model,
            prompt,
            systemPrompt: "You are a helpful assistant that generates technical summaries for documentation."
        });

        return response.content;
    }

    /**
     * Simple check to verify code block integrity (matching triple backticks).
     */
    verifyCodeBlocks(content: string): boolean {
        const matches = content.match(/```/g);
        const count = matches ? matches.length : 0;
        return count % 2 === 0;
    }
}
