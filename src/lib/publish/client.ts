/**
 * UI-facing publish transport. Mirrors llmClient.ts: Tauri commands on
 * desktop, `/api/publish/*` in the browser. The webview never talks to
 * api.github.com / api.notion.com directly (CSP + Notion CORS).
 */

import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "../storage";
import { type PublishResult as GistResult } from "./gist";
import {
    chunkBlocks,
    markdownToNotionBlocks,
    parseNotionPageId,
    type PublishResult as NotionResult,
} from "./notion";

export type PublishResult = GistResult | NotionResult;

async function postJson(url: string, body: unknown): Promise<PublishResult> {
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    try {
        return (await res.json()) as PublishResult;
    } catch {
        return { ok: false, error: `Publish failed (${res.status})` };
    }
}

export async function publishToGist(opts: {
    filename: string;
    content: string;
    token: string;
}): Promise<PublishResult> {
    if (isTauri()) {
        return invoke<PublishResult>("publish_gist", {
            token: opts.token,
            filename: opts.filename,
            content: opts.content,
            public: false,
            description: "",
        });
    }
    return postJson("/api/publish/gist", opts);
}

export async function publishToNotion(opts: {
    title: string;
    content: string;
    token: string;
    parentPageId: string;
}): Promise<PublishResult> {
    let parent: string;
    try {
        parent = parseNotionPageId(opts.parentPageId);
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
    const chunks = chunkBlocks(markdownToNotionBlocks(opts.content));
    if (isTauri()) {
        return invoke<PublishResult>("publish_notion", {
            token: opts.token,
            parentPageId: parent,
            title: opts.title,
            chunks,
        });
    }
    return postJson("/api/publish/notion", {
        token: opts.token,
        parentPageId: parent,
        title: opts.title,
        chunks,
    });
}
