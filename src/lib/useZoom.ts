import { useEffect, useRef, useState } from "react";
import { fetchSettings, updateSettings } from "./settingsClient";
import { applyZoom, nextZoom, zoomActionFor, type ZoomDirection } from "./zoom";

/** Key repeat while holding Cmd+plus would otherwise write the file per repeat. */
const PERSIST_DEBOUNCE_MS = 500;
/** HUD stays up this long after the last step. Holding a key resets it. */
const HUD_MS = 1000;

/**
 * Cmd+plus / Cmd+minus / Cmd+0 zoom, remembered in the settings file.
 *
 * Registered on window, matching the Cmd+S listener in the Editor, so it works
 * wherever focus sits. preventDefault also suppresses the browser's own page
 * zoom in web mode. View menu items dispatch the same steps via motion-menu.
 */
export function useZoom(): { scale: number; hudVisible: boolean } {
    const [scale, setScale] = useState(1);
    const [hudVisible, setHudVisible] = useState(false);
    const loaded = useRef(false);
    const hudTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const flashHud = () => {
        setHudVisible(true);
        if (hudTimer.current) clearTimeout(hudTimer.current);
        hudTimer.current = setTimeout(() => setHudVisible(false), HUD_MS);
    };

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
            if (hudTimer.current) clearTimeout(hudTimer.current);
        };
    }, []);

    useEffect(() => {
        const step = (direction: ZoomDirection) => {
            setScale((current) => nextZoom(current, direction));
            flashHud();
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

    return { scale, hudVisible };
}
