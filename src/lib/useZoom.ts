import { useEffect, useRef, useState } from "react";
import { fetchSettings, updateSettings } from "./settingsClient";
import { applyZoom, nextZoom, zoomActionFor, type ZoomDirection } from "./zoom";

/** Key repeat while holding Cmd+plus would otherwise write the file per repeat. */
const PERSIST_DEBOUNCE_MS = 500;

/**
 * Cmd+plus / Cmd+minus / Cmd+0 zoom, remembered in the settings file.
 *
 * Registered on window, matching the Cmd+S listener in the Editor, so it works
 * wherever focus sits. preventDefault also suppresses the browser's own page
 * zoom in web mode. View menu items dispatch the same steps via motion-menu.
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
            } catch {
                if (!cancelled) applyZoom(1);
            } finally {
                if (!cancelled) loaded.current = true;
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        const step = (direction: ZoomDirection) => {
            setScale((current) => nextZoom(current, direction));
        };
        const onKeyDown = (e: KeyboardEvent) => {
            const direction = zoomActionFor(e);
            if (!direction) return;
            e.preventDefault();
            step(direction);
        };
        const onMenu = (e: Event) => {
            const id = (e as CustomEvent<string>).detail;
            if (id === "zoom_in") step("in");
            else if (id === "zoom_out") step("out");
            else if (id === "zoom_reset") step("reset");
        };
        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("motion-menu", onMenu);
        return () => {
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("motion-menu", onMenu);
        };
    }, []);

    useEffect(() => {
        if (!loaded.current) return;
        applyZoom(scale);
        const timer = setTimeout(() => {
            updateSettings({ zoom: scale }).catch(() => {
                /* Persistence failing must not spam the console: E2E gates on it. */
            });
        }, PERSIST_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [scale]);
}
