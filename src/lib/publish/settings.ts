import { memoryKv, type Kv } from "../workspaceMemory";

export const GITHUB_TOKEN_KEY = "motion.publish.githubToken";
export const NOTION_TOKEN_KEY = "motion.publish.notionToken";
export const NOTION_PARENT_KEY = "motion.publish.notionParentPageId";

export type PublishSettings = {
    githubToken: string;
    notionToken: string;
    notionParentPageId: string;
};

const EMPTY: PublishSettings = {
    githubToken: "",
    notionToken: "",
    notionParentPageId: "",
};

function defaultKv(): Kv | null {
    try {
        if (typeof localStorage === "undefined") return null;
        return localStorage;
    } catch {
        return null;
    }
}

export function loadPublishSettings(store: Kv | null = defaultKv()): PublishSettings {
    if (!store) return { ...EMPTY };
    return {
        githubToken: store.getItem(GITHUB_TOKEN_KEY) ?? "",
        notionToken: store.getItem(NOTION_TOKEN_KEY) ?? "",
        notionParentPageId: store.getItem(NOTION_PARENT_KEY) ?? "",
    };
}

export function savePublishSettings(
    next: PublishSettings,
    store: Kv | null = defaultKv(),
): void {
    if (!store) return;
    const write = (key: string, value: string) => {
        if (value) store.setItem(key, value);
        else store.removeItem(key);
    };
    write(GITHUB_TOKEN_KEY, next.githubToken.trim());
    write(NOTION_TOKEN_KEY, next.notionToken.trim());
    write(NOTION_PARENT_KEY, next.notionParentPageId.trim());
}

/** Test helper. */
export { memoryKv };
