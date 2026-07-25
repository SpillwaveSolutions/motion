import { callLLM, type ModelProvider } from './cliWrappers';

export interface TopicAnalysis {
    suggestedLabels: string[];
    shouldSplit: boolean;
    reasoning: string;
}

function isTopicAnalysis(value: unknown): value is TopicAnalysis {
    if (typeof value !== "object" || value === null) {
        return false;
    }
    const obj = value as Record<string, unknown>;
    return (
        Array.isArray(obj.suggestedLabels) &&
        obj.suggestedLabels.every((label) => typeof label === "string") &&
        typeof obj.shouldSplit === "boolean" &&
        typeof obj.reasoning === "string"
    );
}

export class TopicRefiner {
    private provider: ModelProvider;
    private model?: string;

    constructor(provider: ModelProvider = 'gemini', model?: string) {
        this.provider = provider;
        this.model = model;
    }

    /**
     * Analyzes a set of summaries to re-evaluate topic labels and detect divergence.
     */
    async analyzeTopic(summaries: string[]): Promise<TopicAnalysis> {
        const prompt = `
Analyze the following set of content summaries belonging to a single topic.
1. Suggest 2-3 accurate topic labels.
2. Determine if the content has diverged enough to warrant splitting into multiple topics.
3. Provide reasoning for your decision.

Return the result in JSON format:
{
  "suggestedLabels": ["label1", "label2"],
  "shouldSplit": boolean,
  "reasoning": "string"
}

SUMMARIES:
${summaries.join('\n---\n')}
`;

        const response = await callLLM(this.provider, {
            model: this.model,
            prompt,
            systemPrompt: "You are a taxonomy expert specializing in technical documentation organization."
        });

        try {
            // Attempt to parse JSON from the LLM response
            const jsonContent = response.content.replace(/```json|```/g, '').trim();
            const parsed: unknown = JSON.parse(jsonContent);
            if (!isTopicAnalysis(parsed)) {
                console.error("Topic analysis JSON has unexpected shape:", parsed);
                return {
                    suggestedLabels: [],
                    shouldSplit: false,
                    reasoning: "Error: LLM response JSON did not match expected schema."
                };
            }
            return parsed;
        } catch (error) {
            console.error("Failed to parse topic analysis JSON:", error);
            return {
                suggestedLabels: [],
                shouldSplit: false,
                reasoning: "Error parsing LLM response."
            };
        }
    }
}
