import { useEffect, useRef, useState } from "react";
import { fetchSettings, updateSettings } from "./settingsClient";
import { applyZoom, nextZoom, zoomActionFor } from "./zoom";

/** Key repeat while holding Cmd+plus would otherwise write the file per repeat. */
const PERSIST_DEBOUNCE_MS = 500;

/**
 * Cmd+plus / Cmd+minus / Cmd+0 zoom, remembered in the settings file.
 *
 * The settings file rather than localStorage because the level then carries
 * across web and desktop mode and survives a restart, which is what the user
 * asked for -- localStorage is per-origin and the webview has its own.
 *
 * Registered on window, matching the Cmd+S listener in the Editor, so it works
 * wherever focus sits. preventDefault also suppresses the browser's own page
 * zoom in web mode; Tauri's webview has no competing shortcut.
 */
export function useZoom(): void {
    const [scale, setScale] = useState(1);
    // Skips the write that would otherwise fire immediately for the value we
    // just read back from disk.
    const loaded = useRef(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const { settings } = await fetchSettings();
                if (cancelled) return;
                setScale(settings.zoom);
                applyZoom(settings.zoom);
            } catch (error) {
                console.error("Failed to load zoom level:", error);
            } finally {
                if (!cancelled) loaded.current = true;
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const direction = zoomActionFor(e);
            if (!direction) return;
            e.preventDefault();
            setScale((current) => nextZoom(current, direction));
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    useEffect(() => {
        if (!loaded.current) return;
        applyZoom(scale);
        const timer = setTimeout(() => {
            updateSettings({ zoom: scale }).catch((error) => {
                console.error("Failed to save zoom level:", error);
            });
        }, PERSIST_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [scale]);
}
