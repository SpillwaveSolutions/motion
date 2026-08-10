/**
 * User settings for Motion — shared by the Settings UI, the Bun server, and
 * the `motion` CLI. Stored as JSON under the platform config dir so the CLI
 * can read launch preferences without a browser.
 */

export type LaunchMode = "web" | "desktop";

export interface MotionSettings {
    /** How `motion <dir>` launches the app. Default: web. */
    launchMode: LaunchMode;
    /** Dev-server port for web mode. Default: 3000. */
    port: number;
    /** Open the system browser after starting web mode. Default: true. */
    openBrowser: true | false;
    /**
     * Root font scale, 1 = 100%. Persisted here rather than in localStorage so
     * the level carries across web and desktop mode and survives a restart.
     */
    zoom: number;
}

/** Bounds for {@link MotionSettings.zoom}. Below 0.75 the UI stops being usable. */
export const ZOOM_MIN = 0.75;
export const ZOOM_MAX = 2;

export const DEFAULT_SETTINGS: MotionSettings = {
    launchMode: "web",
    port: 3000,
    openBrowser: true,
    zoom: 1,
};

export function mergeSettings(partial: Partial<MotionSettings> | null | undefined): MotionSettings {
    const p = partial ?? {};
    const launchMode: LaunchMode =
        p.launchMode === "desktop" || p.launchMode === "web" ? p.launchMode : DEFAULT_SETTINGS.launchMode;
    const portRaw = typeof p.port === "number" && Number.isFinite(p.port) ? Math.trunc(p.port) : DEFAULT_SETTINGS.port;
    const port = portRaw >= 1 && portRaw <= 65535 ? portRaw : DEFAULT_SETTINGS.port;
    const openBrowser = typeof p.openBrowser === "boolean" ? p.openBrowser : DEFAULT_SETTINGS.openBrowser;
    // Clamped here, the single validation choke point every setting passes
    // through, for the same reason port is: a hand-edited settings file must
    // not be able to leave the app unreadable with no way back but more JSON.
    const zoomRaw =
        typeof p.zoom === "number" && Number.isFinite(p.zoom) ? p.zoom : DEFAULT_SETTINGS.zoom;
    const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoomRaw));
    return { launchMode, port, openBrowser, zoom };
}

/**
 * Resolve a CLI path argument to an absolute directory path.
 * Rejects missing paths and non-directories (pure helper — no FS side effects
 * beyond the resolver you pass in).
 */
export function resolveWorkspaceArg(
    arg: string | undefined,
    cwd: string,
    resolvePath: (p: string) => string,
    isDirectory: (abs: string) => boolean
): { ok: true; path: string } | { ok: false; error: string } {
    const raw = (arg ?? ".").trim() || ".";
    let abs: string;
    try {
        abs = resolvePath(raw.startsWith("/") || /^[A-Za-z]:[\\/]/.test(raw) ? raw : `${cwd.replace(/[/\\]$/, "")}/${raw}`);
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
    // Normalize trailing slashes for display consistency
    abs = abs.replace(/[/\\]+$/, "") || abs;
    if (!isDirectory(abs)) {
        return { ok: false, error: `Not a directory: ${abs}` };
    }
    return { ok: true, path: abs };
}

/** Default config file path segments under the user home. */
export function settingsRelPath(): string[] {
    return [".config", "motion", "settings.json"];
}

export function settingsFilePath(homeDir: string, join: (...parts: string[]) => string): string {
    return join(homeDir, ...settingsRelPath());
}

export function parseSettingsJson(text: string): MotionSettings {
    try {
        const data = JSON.parse(text) as Partial<MotionSettings>;
        return mergeSettings(data);
    } catch {
        return { ...DEFAULT_SETTINGS };
    }
}
