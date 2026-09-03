/**
 * Browser/webview client for Motion settings. Uses fetch in web mode and
 * Tauri invoke on desktop — never imports Bun/fs (guard:client safe).
 */
import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "./storage";
import type { MotionSettings } from "./settings";
import { mergeSettings } from "./settings";

export interface SettingsResponse {
    settings: MotionSettings;
    path: string;
}

export async function fetchSettings(): Promise<SettingsResponse> {
    if (isTauri()) {
        const res = await invoke<SettingsResponse>("get_settings");
        return {
            ...res,
            settings: mergeSettings(res.settings),
        };
    }
    const r = await fetch("/api/settings");
    if (!r.ok) throw new Error(`Failed to load settings: ${r.status}`);
    const data = (await r.json()) as SettingsResponse;
    return { ...data, settings: mergeSettings(data.settings) };
}

export async function updateSettings(partial: Partial<MotionSettings>): Promise<MotionSettings> {
    if (isTauri()) {
        const res = await invoke<{ settings: MotionSettings }>("set_settings", { partial });
        return mergeSettings(res.settings);
    }
    const r = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partial),
    });
    if (!r.ok) {
        let detail = `${r.status}`;
        try {
            const body = await r.json();
            if (body?.error) detail = body.error;
        } catch {
            /* ignore */
        }
        throw new Error(`Failed to save settings: ${detail}`);
    }
    const data = (await r.json()) as { settings: MotionSettings };
    return mergeSettings(data.settings);
}
