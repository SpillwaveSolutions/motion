import { ZOOM_MAX, ZOOM_MIN } from "./settings";

export { ZOOM_MAX, ZOOM_MIN };

export const ZOOM_STEP = 0.1;
/** Matches `html { font-size: 16px }` in src/index.css — the rem anchor. */
export const ZOOM_BASE_PX = 16;

export type ZoomDirection = "in" | "out" | "reset";

/**
 * Next scale for a zoom keystroke, clamped to the settings bounds.
 *
 * Rounded to two places because 1 + 0.1 + 0.1 is 1.2000000000000002 in binary
 * floating point, and that lands in the settings file and in a font-size.
 */
export function nextZoom(current: number, direction: ZoomDirection): number {
    if (direction === "reset") return 1;
    const raw = direction === "in" ? current + ZOOM_STEP : current - ZOOM_STEP;
    const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, raw));
    return Math.round(clamped * 100) / 100;
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
 * Rescale the whole window.
 *
 * Every size token in src/index.css is rem-anchored to the root font size --
 * --text-xs…--text-3xl and --space-1…--space-12 alike -- so one value rescales
 * text and spacing together, in proportion, the way browser zoom does.
 */
export function applyZoom(scale: number): void {
    document.documentElement.style.fontSize = `${ZOOM_BASE_PX * scale}px`;
}
