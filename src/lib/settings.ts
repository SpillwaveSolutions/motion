/**
 * User settings for Motion. Stored as JSON under the platform config dir
 * (`~/.config/motion/settings.json`) so desktop and web mode share one file.
 *
 * Unknown keys are preserved on write so an older settings file
 * (launchMode, port, …) is not wiped.
 */

import {
    SIDEBAR_DEFAULT,
    SIDEBAR_MAX,
    SIDEBAR_MIN,
    SPLIT_DEFAULT,
    SPLIT_MAX,
    SPLIT_MIN,
    clampSidebarWidth,
    clampSplitRatio,
} from "./layout";

export interface MotionSettings {
    /**
     * Content scale, 1 = 100%. Applied to the editor surface and the file tree,
     * not the header chrome. Persisted here rather than in localStorage so the
     * level carries across web and desktop mode and survives a restart.
     */
    zoom: number;
    /** Sidebar column width in CSS pixels. */
    sidebarWidth: number;
    /** Left pane fraction in Split view, 0.25–0.75. */
    splitRatio: number;
}

/** Bounds for {@link MotionSettings.zoom}. Below 0.75 the UI stops being usable. */
export const ZOOM_MIN = 0.75;
export const ZOOM_MAX = 2;

export const DEFAULT_SETTINGS: MotionSettings = {
    zoom: 1,
    sidebarWidth: SIDEBAR_DEFAULT,
    splitRatio: SPLIT_DEFAULT,
};

function finiteNumber(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function mergeSettings(partial: Partial<MotionSettings> | null | undefined): MotionSettings {
    const p = partial ?? {};
    const zoomRaw = finiteNumber(p.zoom) ?? DEFAULT_SETTINGS.zoom;
    const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoomRaw));
    const sidebarRaw = finiteNumber(p.sidebarWidth) ?? DEFAULT_SETTINGS.sidebarWidth;
    const splitRaw = finiteNumber(p.splitRatio) ?? DEFAULT_SETTINGS.splitRatio;
    return {
        zoom,
        sidebarWidth: clampSidebarWidth(sidebarRaw),
        splitRatio: clampSplitRatio(splitRaw),
    };
}

// Re-export so callers that only imported settings keep compiling.
export { SIDEBAR_MIN, SIDEBAR_MAX, SPLIT_MIN, SPLIT_MAX };

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
