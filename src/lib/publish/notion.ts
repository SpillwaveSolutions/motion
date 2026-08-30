/**
 * Markdown → Notion block trees, plus page-id parsing.
 *
 * Covers the blocks technical notes actually use: headings, paragraphs, lists,
 * quotes, code fences. Tables and Mermaid fences degrade to code blocks.
 * Chunk at 100 — Notion's children limit per request.
 */

export type NotionBlock = {
    object: "block";
    type: string;
    [key: string]: unknown;
};

export type PublishResult = {
    ok: boolean;
    url?: string;
    error?: string;
};

const UUID_RE =
    /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;
const HEX32_RE = /[0-9a-fA-F]{32}/;

export function parseNotionPageId(input: string): string {
    const trimmed = input.trim();
    const dashed = trimmed.match(UUID_RE);
    if (dashed) return dashed[0].toLowerCase();
    const hex = trimmed.match(HEX32_RE);
    if (hex) {
        const h = hex[0].toLowerCase();
        return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
    }
    throw new Error("Not a Notion page id or URL");
}

function rich(text: string) {
    return [{ type: "text", text: { content: text.slice(0, 2000) } }];
}

function block(type: string, extra: Record<string, unknown>): NotionBlock {
    return { object: "block", type, [type]: extra };
}

const NOTION_LANG: Record<string, string> = {
    js: "javascript",
    javascript: "javascript",
    ts: "typescript",
    typescript: "typescript",
    py: "python",
    python: "python",
    rb: "ruby",
    rust: "rust",
    go: "go",
    json: "json",
    html: "html",
    css: "css",
    sql: "sql",
    bash: "bash",
    sh: "bash",
    yaml: "yaml",
    yml: "yaml",
    md: "markdown",
    markdown: "markdown",
};

function notionLang(lang: string): string {
    return NOTION_LANG[lang.trim().toLowerCase()] ?? "plain text";
}

export function markdownToNotionBlocks(md: string): NotionBlock[] {
    const lines = md.replace(/\r\n/g, "\n").split("\n");
    const blocks: NotionBlock[] = [];
    let i = 0;
    let para: string[] = [];

    const flushPara = () => {
        const text = para.join(" ").trim();
        para = [];
        if (text) blocks.push(block("paragraph", { rich_text: rich(text) }));
    };

    while (i < lines.length) {
        const line = lines[i] ?? "";

        if (line.startsWith("```")) {
            flushPara();
            const lang = line.slice(3).trim();
            const body: string[] = [];
            i += 1;
            while (i < lines.length && !(lines[i] ?? "").startsWith("```")) {
                body.push(lines[i] ?? "");
                i += 1;
            }
            i += 1;
            blocks.push(block("code", { rich_text: rich(body.join("\n")), language: notionLang(lang) }));
            continue;
        }

        const heading = /^(#{1,3})\s+(.*)$/.exec(line);
        if (heading) {
            flushPara();
            const hashes = heading[1] ?? "#";
            const type = `heading_${hashes.length}`;
            blocks.push(block(type, { rich_text: rich(heading[2] ?? "") }));
            i += 1;
            continue;
        }

        const ul = /^[-*+]\s+(.*)$/.exec(line);
        if (ul) {
            flushPara();
            blocks.push(block("bulleted_list_item", { rich_text: rich(ul[1] ?? "") }));
            i += 1;
            continue;
        }

        const ol = /^\d+[.)]\s+(.*)$/.exec(line);
        if (ol) {
            flushPara();
            blocks.push(block("numbered_list_item", { rich_text: rich(ol[1] ?? "") }));
            i += 1;
            continue;
        }

        const quote = /^>\s?(.*)$/.exec(line);
        if (quote) {
            flushPara();
            blocks.push(block("quote", { rich_text: rich(quote[1] ?? "") }));
            i += 1;
            continue;
        }

        if (/^\s*$/.test(line)) {
            flushPara();
            i += 1;
            continue;
        }

        para.push(line);
        i += 1;
    }
    flushPara();
    return blocks;
}

export function chunkBlocks<T>(blocks: T[], size = 100): T[][] {
    if (size <= 0) throw new Error("chunk size must be positive");
    const out: T[][] = [];
    for (let i = 0; i < blocks.length; i += size) {
        out.push(blocks.slice(i, i + size));
    }
    return out.length ? out : [[]];
}

export function parseNotionResponse(status: number, body: unknown): PublishResult {
    const obj = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
    if (status >= 400) {
        const msg = typeof obj.message === "string"
            ? obj.message
            : `Notion publish failed (${status})`;
        return { ok: false, error: msg };
    }
    const url = typeof obj.url === "string" ? obj.url : undefined;
    if (!url) return { ok: false, error: "Notion response missing url" };
    return { ok: true, url };
}

export async function publishNotion(opts: {
    token: string;
    parentPageId: string;
    title: string;
    chunks: NotionBlock[][];
    fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
    apiBase?: string;
}): Promise<PublishResult> {
    if (!opts.token.trim()) return { ok: false, error: "missing-token" };
    const base = (opts.apiBase ?? "https://api.notion.com").replace(/\/+$/, "");
    const headers: Record<string, string> = {
        Authorization: `Bearer ${opts.token}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
    };
    const first = opts.chunks[0] ?? [];
    let res: Response;
    try {
        res = await opts.fetch(`${base}/v1/pages`, {
            method: "POST",
            headers,
            body: JSON.stringify({
                parent: { page_id: opts.parentPageId },
                properties: {
                    title: {
                        title: [{ text: { content: opts.title.slice(0, 2000) } }],
                    },
                },
                children: first,
            }),
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { ok: false, error: message };
    }
    let body: unknown = null;
    try {
        body = await res.json();
    } catch {
        /* non-JSON */
    }
    const created = parseNotionResponse(res.status, body);
    if (!created.ok) return created;
    const obj = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
    const id = typeof obj.id === "string" ? obj.id : null;
    if (id) {
        for (const chunk of opts.chunks.slice(1)) {
            let append: Response;
            try {
                append = await opts.fetch(`${base}/v1/blocks/${id}/children`, {
                    method: "PATCH",
                    headers,
                    body: JSON.stringify({ children: chunk }),
                });
            } catch (err) {
                return {
                    ok: false,
                    url: created.url,
                    error: err instanceof Error ? err.message : String(err),
                };
            }
            if (!append.ok) {
                let ab: unknown = null;
                try {
                    ab = await append.json();
                } catch {
                    /* non-JSON */
                }
                const parsed = parseNotionResponse(append.status, ab);
                return { ok: false, url: created.url, error: parsed.error };
            }
        }
    }
    return created;
}

