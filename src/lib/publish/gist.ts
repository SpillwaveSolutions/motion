/**
 * Pure GitHub Gist publish helpers. Fetch is injected so unit tests never
 * touch the network, and so the Bun server / Tauri command can supply their
 * own transport.
 */

export type GistRequest = {
    filename: string;
    content: string;
    description?: string;
    public?: boolean;
};

export type PublishResult = {
    ok: boolean;
    url?: string;
    error?: string;
};

export function gistFilename(name: string): string {
    const trimmed = name.trim() || "note.md";
    return trimmed.replace(/[/\\]+/g, "-");
}

export function buildGistPayload(req: GistRequest) {
    return {
        description: req.description ?? "",
        public: Boolean(req.public),
        files: {
            [gistFilename(req.filename)]: { content: req.content },
        },
    };
}

export function parseGistResponse(status: number, body: unknown): PublishResult {
    const obj = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
    if (status >= 400) {
        const msg = typeof obj.message === "string"
            ? obj.message
            : `Gist publish failed (${status})`;
        return { ok: false, error: msg };
    }
    const url = typeof obj.html_url === "string" ? obj.html_url : undefined;
    if (!url) return { ok: false, error: "Gist response missing html_url" };
    return { ok: true, url };
}

export async function publishGist(opts: GistRequest & {
    token: string;
    fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
    apiBase?: string;
}): Promise<PublishResult> {
    if (!opts.token.trim()) return { ok: false, error: "missing-token" };
    const base = (opts.apiBase ?? "https://api.github.com").replace(/\/+$/, "");
    let res: Response;
    try {
        res = await opts.fetch(`${base}/gists`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${opts.token}`,
                Accept: "application/vnd.github+json",
                "Content-Type": "application/json",
                "User-Agent": "Motion",
            },
            body: JSON.stringify(buildGistPayload(opts)),
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
    return parseGistResponse(res.status, body);
}
