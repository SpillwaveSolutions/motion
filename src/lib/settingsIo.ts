/**
 * Node/Bun-side settings I/O. Not imported from the browser bundle — only from
 * the server and the CLI (guard:client would fail if this reached main.tsx).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { homedir } from "os";
import {
    DEFAULT_SETTINGS,
    type MotionSettings,
    mergeSettings,
    parseSettingsJson,
    settingsFilePath,
} from "./settings";

/**
 * MOTION_SETTINGS_FILE redirects the whole settings file, so a test run never
 * writes the developer's real ~/.config/motion/settings.json. E2E already
 * toggles launch mode; zoom would have left the dev's app permanently resized.
 */
export function defaultSettingsPath(): string {
    const override = process.env["MOTION_SETTINGS_FILE"];
    if (override && override.trim()) return override.trim();
    return settingsFilePath(homedir(), join);
}

export function loadSettings(filePath: string = defaultSettingsPath()): MotionSettings {
    if (!existsSync(filePath)) return { ...DEFAULT_SETTINGS };
    try {
        return parseSettingsJson(readFileSync(filePath, "utf8"));
    } catch {
        return { ...DEFAULT_SETTINGS };
    }
}

export function saveSettings(
    partial: Partial<MotionSettings>,
    filePath: string = defaultSettingsPath()
): MotionSettings {
    const next = mergeSettings({ ...loadSettings(filePath), ...partial });
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, JSON.stringify(next, null, 2) + "\n", "utf8");
    return next;
}
