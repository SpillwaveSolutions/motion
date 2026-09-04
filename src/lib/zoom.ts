import { ZOOM_MAX, ZOOM_MIN } from "./settings";

export { ZOOM_MAX, ZOOM_MIN };

export const ZOOM_STEP = 0.1;
/** Matches `html { font-size: 16px }` in src/index.css — chrome stays here. */
export const ZOOM_BASE_PX = 16;

export type ZoomDirection = "in" | "out" | "reset";

/**
 * Next scale for a zoom keystroke, clamped to the settings bounds.
 *
 * Rounded to two places because 1 + 0.1 + 0.1 is 1.2000000000000002 in binary
 * floating point, and that lands in the settings file and in CSS.
 */
export function nextZoom(current: number, direction: ZoomDirection): number {
    if (direction === "reset") return 1;
    const raw = direction === "in" ? current + ZOOM_STEP : current - ZOOM_STEP;
    const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, raw));
    return Math.round(clamped * 100) / 100;
}

/** Rounded percentage for the HUD (110, 100, 75, …). */
export function zoomPercent(scale: number): number {
    return Math.round(scale * 100);
}

/**
 * Which zoom action a keystroke means, or null if it means nothing.
 *
 * Cmd+plus arrives as "=" unshifted and "+" shifted; Cmd+minus as "-" or "_".
 * All four are matched, and Ctrl is accepted alongside Meta so the shortcut
 * also works when Motion runs in a browser on a non-Mac keyboard.
 */
export function zoomActionFor(e: {
    key: string;
    metaKey: boolean;
    ctrlKey: boolean;
}): ZoomDirection | null {
    if (!e.metaKey && !e.ctrlKey) return null;
    if (e.key === "=" || e.key === "+") return "in";
    if (e.key === "-" || e.key === "_") return "out";
    if (e.key === "0") return "reset";
    return null;
}

/**
 * Scale the editor surface and the file tree, not the chrome.
 *
 * Writes `--zoom` on the root and clears any leftover inline font-size from
 * v0.6.3, which used to rescale the whole window by changing html font-size.
 * Content roots opt in with `zoom: var(--zoom)` in CSS.
 */
export function applyZoom(scale: number): void {
    const root = document.documentElement;
    root.style.removeProperty("font-size");
    root.style.setProperty("--zoom", String(scale));
}
