import { useCallback, useEffect, useRef, useState } from "react";
import {
    SIDEBAR_DEFAULT,
    SPLIT_DEFAULT,
    clampSidebarWidth,
    clampSplitRatio,
} from "./layout";
import { fetchSettings, updateSettings } from "./settingsClient";

const PERSIST_DEBOUNCE_MS = 500;

function applySidebarWidth(px: number): void {
    document.documentElement.style.setProperty("--sidebar-width", `${px}px`);
}

/**
 * Sidebar width and split ratio, remembered next to zoom in the settings file.
 */
export function useLayout(): {
    sidebarWidth: number;
    splitRatio: number;
    setSidebarWidth: (px: number) => void;
    setSplitRatio: (ratio: number) => void;
} {
    const [sidebarWidth, setSidebarWidthState] = useState(SIDEBAR_DEFAULT);
    const [splitRatio, setSplitRatioState] = useState(SPLIT_DEFAULT);
    const loaded = useRef(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const { settings } = await fetchSettings();
                if (cancelled) return;
                setSidebarWidthState(settings.sidebarWidth);
                setSplitRatioState(settings.splitRatio);
                applySidebarWidth(settings.sidebarWidth);
            } catch {
                if (!cancelled) applySidebarWidth(SIDEBAR_DEFAULT);
            } finally {
                if (!cancelled) loaded.current = true;
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!loaded.current) return;
        applySidebarWidth(sidebarWidth);
        const timer = setTimeout(() => {
            updateSettings({ sidebarWidth }).catch(() => {
                /* Persistence failing must not spam the console: E2E gates on it. */
            });
        }, PERSIST_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [sidebarWidth]);

    useEffect(() => {
        if (!loaded.current) return;
        const timer = setTimeout(() => {
            updateSettings({ splitRatio }).catch(() => {
                /* Persistence failing must not spam the console: E2E gates on it. */
            });
        }, PERSIST_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [splitRatio]);

    const setSidebarWidth = useCallback((px: number) => {
        setSidebarWidthState(clampSidebarWidth(px));
    }, []);

    const setSplitRatio = useCallback((ratio: number) => {
        setSplitRatioState(clampSplitRatio(ratio));
    }, []);

    return { sidebarWidth, splitRatio, setSidebarWidth, setSplitRatio };
}
