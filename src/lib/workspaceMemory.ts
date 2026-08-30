/**
 * Remember the last desktop workspace so a relaunch opens where you left off.
 *
 * In-memory `rememberWorkspaceRoot` is still the jail helper; this is the
 * durable copy. Browser mode must NOT auto-restore — E2E specs click
 * Open Folder explicitly and would race a restored tree.
 */

export const WORKSPACE_ROOT_KEY = "motion.workspace.root";
export const WORKSPACE_FILE_KEY = "motion.workspace.file";

export interface Kv {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}

export function memoryKv(seed: Record<string, string> = {}): Kv {
    const map = new Map(Object.entries(seed));
    return {
        getItem: (k) => map.get(k) ?? null,
        setItem: (k, v) => {
            map.set(k, v);
        },
        removeItem: (k) => {
            map.delete(k);
        },
    };
}

function defaultKv(): Kv | null {
    try {
        if (typeof localStorage === "undefined") return null;
        return localStorage;
    } catch {
        return null;
    }
}

export function persistWorkspace(
    root: string | null,
    file: string | null,
    store: Kv | null = defaultKv(),
): void {
    if (!store) return;
    if (root) store.setItem(WORKSPACE_ROOT_KEY, root);
    else store.removeItem(WORKSPACE_ROOT_KEY);
    if (file) store.setItem(WORKSPACE_FILE_KEY, file);
    else store.removeItem(WORKSPACE_FILE_KEY);
}

export function loadPersistedWorkspace(
    store: Kv | null = defaultKv(),
): { root: string | null; file: string | null } {
    if (!store) return { root: null, file: null };
    return {
        root: store.getItem(WORKSPACE_ROOT_KEY),
        file: store.getItem(WORKSPACE_FILE_KEY),
    };
}
