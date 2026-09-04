import { callLLMFromUI } from "./llmClient";
import type { ModelProvider } from "./cliWrappers";

/**
 * Writes the short folder README that Synthesize drops next to TOC.md.
 * This is not a Claude Code skill and not SKILL.md.
 */
export class ReadmeGenerator {
    private provider: ModelProvider;
    private model?: string;

    constructor(provider: ModelProvider = "claude", model?: string) {
        this.provider = provider;
        this.model = model;
    }

    /**
     * A brief README (~150 words): heading, one-paragraph purpose, themes
     * from the topic labels. No YAML frontmatter, no "skill" framing.
     */
    async generateReadme(topic: string, labels: string[], summaries: string[]): Promise<string> {
        const themes = labels.length ? labels.join(", ") : topic;
        const prompt = `
Write a brief folder README (about 150 words) for a notes folder whose primary topic is "${topic}".

Use this shape, nothing else:
# <short heading>
<one paragraph of purpose: what someone will find in this folder>
## Themes
- <bullet for each theme>

Themes to cover: ${themes}

Do not use YAML frontmatter. Do not mention AI, skills, or that the file was generated.
Do not invent files that are not implied by the summaries.

SUMMARIES:
${summaries.join("\n---\n")}
`;

        const response = await callLLMFromUI(this.provider, {
            model: this.model,
            prompt,
            systemPrompt:
                "You write short, plain README files that tell a person what a folder of notes is for.",
        });

        return response.content;
    }
}
