/**
 * Workspace-level synthesis: read every note, cluster them by topic, and write
 * a generated TOC.md and a short README back into the workspace.
 *
 * Filesystem access is injected rather than imported so the orchestration can be
 * tested without a real workspace, and so the same code serves both runtimes.
 */
import { ContentInjector } from "./ContentInjector";
import { TopicRefiner, type TopicAnalysis } from "./TopicRefiner";
import { TOCGenerator } from "./TOCGenerator";
import { ReadmeGenerator } from "./ReadmeGenerator";
import type { ModelProvider } from "./cliWrappers";

export const TOC_FILENAME = "TOC.md";
export const README_FILENAME = "README.md";
export const README_FALLBACK_FILENAME = "README.motion.md";
/** Legacy artifact from pre-0.6.4. Still excluded so a second run does not summarize it. */
export const SKILL_FILENAME = "SKILL.md";

/** Marker at the top of a README we wrote. Only this kind is overwritten. */
export const GENERATED_MARKER = "<!-- generated-by: motion-synthesize -->";

/**
 * ponytail: hard cap on notes per run. Each note costs one LLM round trip, so an
 * unbounded workspace is an unbounded bill and a very long wait. Raise it, or
 * add batching, when someone actually has a workspace this big.
 */
export const MAX_NOTES = 40;

/** Files this process writes, and must therefore never read back as input. */
const GENERATED = new Set([
    TOC_FILENAME,
    README_FILENAME,
    README_FALLBACK_FILENAME,
    SKILL_FILENAME,
]);

export interface SynthesisDeps {
    listFiles: () => Promise<string[]>;
    readFile: (path: string) => Promise<string>;
    writeFile: (path: string, content: string) => Promise<void>;
    /** Workspace-relative path for display in the generated documents. */
    toRelative: (path: string) => string;
    /** Where to write TOC.md / README.md. */
    joinWorkspace: (filename: string) => string;
    onProgress?: (message: string) => void;
    provider?: ModelProvider;
}

export interface SynthesisResult {
    noteCount: number;
    skipped: number;
    topic: TopicAnalysis;
    tocPath: string;
    readmePath: string;
    readmeFilename: string;
    readmeCollided: boolean;
}

const basename = (p: string): string => p.split(/[/\\]/).pop() ?? p;

export function isGeneratedReadme(content: string): boolean {
    return content.includes(GENERATED_MARKER);
}

/**
 * Pick README.md unless a hand-written README.md is already there.
 * Never silently overwrite a README a person wrote.
 */
export function pickReadmeFilename(existingReadme: string | null | undefined): {
    filename: string;
    collided: boolean;
} {
    if (existingReadme == null || existingReadme === "" || isGeneratedReadme(existingReadme)) {
        return { filename: README_FILENAME, collided: false };
    }
    return { filename: README_FALLBACK_FILENAME, collided: true };
}

export function wrapGeneratedReadme(body: string): string {
    const trimmed = body.trim();
    if (trimmed.includes(GENERATED_MARKER)) {
        return trimmed.endsWith("\n") ? trimmed : `${trimmed}\n`;
    }
    return `${GENERATED_MARKER}\n\n${trimmed}\n`;
}

/** A plain TOC from what we know, before the LLM enriches it. */
export function buildBaseToc(entries: { path: string; summary: string }[]): string {
    const lines = ["# Table of Contents", ""];
    for (const { path, summary } of entries) {
        lines.push(`- [${basename(path)}](${path})`);
        for (const bullet of summary.split("\n").map((l) => l.trim()).filter(Boolean)) {
            lines.push(`  ${bullet.startsWith("-") ? bullet : `- ${bullet}`}`);
        }
    }
    return lines.join("\n");
}

export async function synthesizeWorkspace(deps: SynthesisDeps): Promise<SynthesisResult> {
    const provider = deps.provider ?? "claude";
    const progress = deps.onProgress ?? (() => {});

    const all = await deps.listFiles();
    // Never feed our own output back in: a second run would summarize the TOC it
    // wrote on the first, and the topic labels would drift toward describing the
    // index rather than the notes.
    const candidates = all.filter((p) => !GENERATED.has(basename(p)));
    const notes = candidates.slice(0, MAX_NOTES);
    const skipped = candidates.length - notes.length;

    if (notes.length === 0) {
        throw new Error("No notes to synthesize — the workspace has no markdown files.");
    }
    if (skipped > 0) {
        progress(`Using the first ${MAX_NOTES} of ${candidates.length} notes.`);
    }

    const injector = new ContentInjector(provider);
    const entries: { path: string; summary: string }[] = [];

    for (const [i, path] of notes.entries()) {
        progress(`Summarizing ${basename(path)} (${i + 1}/${notes.length})`);
        const content = await deps.readFile(path);
        if (!content.trim()) continue;
        const summary = await injector.generateSummary(content);
        entries.push({ path: deps.toRelative(path), summary });
    }

    if (entries.length === 0) {
        throw new Error("No notes to synthesize — every markdown file was empty.");
    }

    const summaries = entries.map((e) => e.summary);

    progress("Clustering topics");
    const topic = await new TopicRefiner(provider).analyzeTopic(summaries);

    progress("Generating the table of contents");
    const byFile: Record<string, string[]> = {};
    for (const e of entries) byFile[e.path] = e.summary.split("\n").filter(Boolean);
    const toc = await new TOCGenerator(provider).enrichTOC(buildBaseToc(entries), byFile);

    const existingReadmePath = all.find((p) => basename(p) === README_FILENAME);
    let existingReadme: string | null = null;
    if (existingReadmePath) {
        try {
            existingReadme = await deps.readFile(existingReadmePath);
        } catch {
            existingReadme = null;
        }
    }
    const pick = pickReadmeFilename(existingReadme);

    progress("Generating README");
    const primaryTopic = topic.suggestedLabels[0] ?? "This workspace";
    const readmeBody = await new ReadmeGenerator(provider).generateReadme(
        primaryTopic,
        topic.suggestedLabels,
        summaries
    );
    const readme = wrapGeneratedReadme(readmeBody);

    const tocPath = deps.joinWorkspace(TOC_FILENAME);
    const readmePath = deps.joinWorkspace(pick.filename);

    progress(
        pick.collided ? "Writing TOC.md and README.motion.md" : "Writing TOC.md and README.md"
    );
    await deps.writeFile(tocPath, toc);
    await deps.writeFile(readmePath, readme);

    return {
        noteCount: entries.length,
        skipped,
        topic,
        tocPath,
        readmePath,
        readmeFilename: pick.filename,
        readmeCollided: pick.collided,
    };
}
