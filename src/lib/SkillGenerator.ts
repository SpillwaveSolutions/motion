import { callLLM, type ModelProvider } from './cliWrappers';

export class SkillGenerator {
    private provider: ModelProvider;
    private model?: string;

    constructor(provider: ModelProvider = 'gemini', model?: string) {
        this.provider = provider;
        this.model = model;
    }

    /**
     * Synthesizes a complete SKILL.md file from aggregated summaries.
     * Ensures compliance with Stage 1 Minting specs.
     */
    async generateSkill(topic: string, summaries: string[]): Promise<string> {
        const prompt = `
Generate a complete, spec-compliant SKILL.md file for the topic: "${topic}".
Use the following aggregated summaries to extract the "intent" and "core concepts".

The SKILL.md should follow this format:
# Skill Name: [Descriptive Name]
## Intent
[A clear description of what this skill achieves]
## Core Concepts
[Detailed explanation of the core concepts based on the summaries]
## Usage
[Examples or instructions on how to use the knowledge]

SUMMARIES:
${summaries.join('\n---\n')}
`;

        const response = await callLLM(this.provider, {
            model: this.model,
            prompt,
            systemPrompt: "You are a technical writer specializing in creating skill documentation for AI agents."
        });

        return response.content;
    }
}
