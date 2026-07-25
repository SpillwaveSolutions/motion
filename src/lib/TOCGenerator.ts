import { callLLM, type ModelProvider } from './cliWrappers';

export class TOCGenerator {
    private provider: ModelProvider;
    private model?: string;

    constructor(provider: ModelProvider = 'gemini', model?: string) {
        this.provider = provider;
        this.model = model;
    }

    /**
     * Enriches a TOC.md file with detailed, LLM-generated annotations for each topic.
     */
    async enrichTOC(tocContent: string, summaries: Record<string, string[]>): Promise<string> {
        const summaryText = Object.entries(summaries)
            .map(([topic, topics]) => `TOPIC: ${topic}\nSUMMARIES:\n${topics.join('\n')}`)
            .join('\n\n---\n\n');

        const prompt = `
Enrich the following Table of Contents (TOC) with detailed annotations and summaries based on the provided content summaries.
Maintain the existing structure but add descriptive text for each section and sub-section.

ORIGINAL TOC:
${tocContent}

SUMMARIES:
${summaryText}
`;

        const response = await callLLM(this.provider, {
            model: this.model,
            prompt,
            systemPrompt: "You are a professional technical documentarian known for creating clear and helpful Tables of Contents."
        });

        return response.content;
    }
}
