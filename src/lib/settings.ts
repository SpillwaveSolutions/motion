/**
 * User settings for Motion. Stored as JSON under the platform config dir
 * (`~/.config/motion/settings.json`) so desktop and web mode share one file.
 *
 * Only `zoom` is read by the app today. Unknown keys are preserved on write
 * so an older settings file (launchMode, port, …) is not wiped.
 */

export interface MotionSettings {
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
    zoom: 1,
};

export function mergeSettings(partial: Partial<MotionSettings> | null | undefined): MotionSettings {
    const p = partial ?? {};
    const zoomRaw =
        typeof p.zoom === "number" && Number.isFinite(p.zoom) ? p.zoom : DEFAULT_SETTINGS.zoom;
    const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoomRaw));
    return { zoom };
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
