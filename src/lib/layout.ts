/** Sidebar and split-pane geometry. CSS default `--sidebar-width: 280px`. */

export const SIDEBAR_MIN = 180;
export const SIDEBAR_MAX = 480;
export const SIDEBAR_DEFAULT = 280;
export const SIDEBAR_STEP = 16;

export const SPLIT_MIN = 0.25;
export const SPLIT_MAX = 0.75;
export const SPLIT_DEFAULT = 0.5;
export const SPLIT_STEP = 0.02;

function clamp(n: number, min: number, max: number): number {
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
}

export function clampSidebarWidth(px: number): number {
    return Math.round(clamp(px, SIDEBAR_MIN, SIDEBAR_MAX));
}

export function clampSplitRatio(ratio: number): number {
    const clamped = clamp(ratio, SPLIT_MIN, SPLIT_MAX);
    return Math.round(clamped * 1000) / 1000;
}

/** New sidebar width after a pointer moved `dx` px from the drag start. */
export function sidebarWidthFromPointer(startWidth: number, dx: number): number {
    return clampSidebarWidth(startWidth + dx);
}

/**
 * New left-pane ratio after a pointer moved `dx` px across a container
 * `containerWidth` px wide. A zero/negative container is a no-op.
 */
export function splitRatioFromPointer(
    startRatio: number,
    dx: number,
    containerWidth: number
): number {
    if (!Number.isFinite(containerWidth) || containerWidth <= 0) {
        return clampSplitRatio(startRatio);
    }
    return clampSplitRatio(startRatio + dx / containerWidth);
}

export function sidebarWidthFromKey(current: number, key: string): number | null {
    if (key === "ArrowLeft") return clampSidebarWidth(current - SIDEBAR_STEP);
    if (key === "ArrowRight") return clampSidebarWidth(current + SIDEBAR_STEP);
    if (key === "Home") return SIDEBAR_MIN;
    if (key === "End") return SIDEBAR_MAX;
    return null;
}

export function splitRatioFromKey(current: number, key: string): number | null {
    if (key === "ArrowLeft") return clampSplitRatio(current - SPLIT_STEP);
    if (key === "ArrowRight") return clampSplitRatio(current + SPLIT_STEP);
    if (key === "Home") return SPLIT_MIN;
    if (key === "End") return SPLIT_MAX;
    return null;
}
