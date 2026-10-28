/**
 * Markdown → a small block list shared by the HTML preview, PDF, and Word
 * exporters. GFM tables, lists, quotes, and inline marks survive. Custom
 * fenced blocks (mermaid, dataset, …) export as code.
 */
import { marked, type Token, type Tokens } from "marked";
import { splitFrontmatter } from "./frontmatter";

export interface InlineRun {
    text: string;
    bold?: boolean;
    italic?: boolean;
    code?: boolean;
    href?: string;
}

export type ExportBlock =
    | { type: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
    | { type: "paragraph"; runs: InlineRun[] }
    | { type: "list"; ordered: boolean; items: InlineRun[][] }
    | { type: "quote"; text: string }
    | { type: "code"; text: string }
    | { type: "hr" }
    | { type: "table"; header: string[]; rows: string[][] };

/**
 * Front matter is note metadata, not page content, so it never exports. A
 * front matter `title:` becomes the H1 only when the note has no H1 of its own.
 */
export function markdownToBlocks(markdown: string): ExportBlock[] {
    const { frontmatter, body } = splitFrontmatter(markdown);
    const blocks = tokensToBlocks(marked.lexer(body, { gfm: true }));
    const title = frontMatterTitle(frontmatter ?? "");
    if (title && !blocks.some((block) => block.type === "heading" && block.level === 1)) {
        blocks.unshift({ type: "heading", level: 1, text: title });
    }
    return blocks;
}

function frontMatterTitle(yaml: string): string {
    const value = /^title:[ \t]*(.*?)[ \t]*$/m.exec(yaml)?.[1] ?? "";
    return value.replace(/^(["'])(.*)\1$/, "$2");
}

function tokensToBlocks(tokens: Token[]): ExportBlock[] {
    const blocks: ExportBlock[] = [];
    for (const token of tokens) {
        if (token.type === "space") continue;
        if (token.type === "heading") {
            const level = Math.min(6, Math.max(1, token.depth)) as ExportBlock & { type: "heading" } extends infer _ ? 1 | 2 | 3 | 4 | 5 | 6 : never;
            blocks.push({ type: "heading", level, text: inlinePlain(token.tokens, token.text) });
            continue;
        }
        if (token.type === "paragraph") {
            const runs = inlineRuns(token.tokens);
            if (runs.length) blocks.push({ type: "paragraph", runs });
            continue;
        }
        if (token.type === "text") {
            const runs = token.tokens ? inlineRuns(token.tokens) : [{ text: token.text }];
            if (runs.length) blocks.push({ type: "paragraph", runs });
            continue;
        }
        if (token.type === "list") {
            blocks.push({
                type: "list",
                ordered: token.ordered,
                items: token.items.map((item: Tokens.ListItem) => inlineRuns(item.tokens)),
            });
            continue;
        }
        if (token.type === "blockquote") {
            const text = tokensToBlocks(token.tokens ?? [])
                .map(blockPlain)
                .filter(Boolean)
                .join("\n");
            if (text) blocks.push({ type: "quote", text });
            continue;
        }
        if (token.type === "code") {
            blocks.push({ type: "code", text: token.text.replace(/\n$/, "") });
            continue;
        }
        if (token.type === "hr") {
            blocks.push({ type: "hr" });
            continue;
        }
        if (token.type === "table") {
            blocks.push(tableBlock(token as Tokens.Table));
            continue;
        }
        if (token.type === "html" && token.text.trim()) {
            blocks.push({ type: "paragraph", runs: [{ text: token.text.trim() }] });
        }
    }
    return blocks;
}

function tableBlock(token: Tokens.Table): ExportBlock {
    const header = token.header.map((cell) => inlinePlain(cell.tokens, cell.text));
    const rows = token.rows.map((row) => row.map((cell) => inlinePlain(cell.tokens, cell.text)));
    return { type: "table", header, rows };
}

function inlineRuns(tokens: Token[] | undefined): InlineRun[] {
    if (!tokens) return [];
    const runs: InlineRun[] = [];
    for (const token of tokens) {
        if (token.type === "escape" || token.type === "text") {
            if ("tokens" in token && token.tokens) runs.push(...inlineRuns(token.tokens));
            else if (token.text) runs.push({ text: token.text });
            continue;
        }
        if (token.type === "strong") {
            for (const run of inlineRuns(token.tokens)) runs.push({ ...run, bold: true });
            continue;
        }
        if (token.type === "em") {
            for (const run of inlineRuns(token.tokens)) runs.push({ ...run, italic: true });
            continue;
        }
        if (token.type === "codespan") {
            runs.push({ text: token.text, code: true });
            continue;
        }
        if (token.type === "link") {
            const text = inlinePlain(token.tokens, token.text) || token.href;
            if (text) runs.push({ text, href: token.href });
            continue;
        }
        if (token.type === "br") {
            runs.push({ text: "\n" });
            continue;
        }
        if (token.type === "paragraph" || token.type === "list" || token.type === "blockquote") {
            const nested = tokensToBlocks([token]);
            const text = nested.map(blockPlain).filter(Boolean).join(" ");
            if (text) runs.push({ text });
            continue;
        }
        if ("text" in token && typeof token.text === "string" && token.text) {
            runs.push({ text: token.text });
        }
    }
    return runs.filter((run) => run.text.length > 0);
}

function inlinePlain(tokens: Token[] | undefined, fallback: string): string {
    const runs = inlineRuns(tokens);
    const text = runs.map((run) => run.text).join("");
    return text || fallback;
}

function blockPlain(block: ExportBlock): string {
    if (block.type === "heading") return block.text;
    if (block.type === "paragraph") return block.runs.map((run) => run.text).join("");
    if (block.type === "list") return block.items.map((item) => item.map((run) => run.text).join("")).join("\n");
    if (block.type === "quote" || block.type === "code") return block.text;
    if (block.type === "table") return [...block.header, ...block.rows.flat()].join(" ");
    return "";
}

export function runsToText(runs: InlineRun[]): string {
    return runs.map((run) => run.text).join("");
}
