import { useEffect } from "react";

/**
 * Screenshot capture mode, driven by localStorage so an agent can seed it
 * before the page loads — no click path or URL parameter required.
 *
 *   localStorage.setItem("motion-ui-freeze", "1")   // hold the UI still
 *   localStorage.setItem("motion-ui-reveal", "1")   // force hover affordances visible
 *
 * DEV-only: production never reads the flags (bundle defines NODE_ENV).
 * See docs/ui/README.md and the `.ui-freeze` / `.ui-reveal` rules in index.css.
 */
export const FREEZE_KEY = "motion-ui-freeze";
export const REVEAL_KEY = "motion-ui-reveal";

function enabled(key: string): boolean {
    try {
        const v = window.localStorage.getItem(key);
        return v === "1" || v === "true";
    } catch {
        // Storage can throw in private mode; never take the app down over a
        // debug affordance.
        return false;
    }
}

function isDev(): boolean {
    // Bun's browser bundle injects process.env.NODE_ENV via the server define.
    try {
        return process.env.NODE_ENV !== "production";
    } catch {
        return true;
    }
}

export function useCaptureMode(): void {
    useEffect(() => {
        if (!isDev()) return;

        const root = document.documentElement;
        const apply = () => {
            root.classList.toggle("ui-freeze", enabled(FREEZE_KEY));
            root.classList.toggle("ui-reveal", enabled(REVEAL_KEY));
        };
        apply();

        // Lets an agent flip modes mid-session (rest → reveal) without a reload.
        window.addEventListener("storage", apply);
        return () => window.removeEventListener("storage", apply);
    }, []);
}
