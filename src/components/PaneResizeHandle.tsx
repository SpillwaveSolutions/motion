import { useEffect, useRef } from "react";

type PaneResizeHandleProps = {
    ariaLabel: string;
    ariaValuemin: number;
    ariaValuemax: number;
    ariaValuenow: number;
    testId: string;
    className?: string;
    onPointerDelta: (dx: number, startValue: number) => void;
    startValue: number;
    onKeyDown: (key: string) => boolean;
};

/**
 * Vertical separator between two panes. Pointer drag reports dx from the
 * pointer-down origin against window listeners so Playwright's mouse API
 * (and a fast drag off the 6px hit target) still tracks. Arrow keys are
 * delegated to the parent so sidebar (pixels) and split (ratio) share chrome.
 */
export default function PaneResizeHandle({
    ariaLabel,
    ariaValuemin,
    ariaValuemax,
    ariaValuenow,
    testId,
    className,
    onPointerDelta,
    startValue,
    onKeyDown,
}: PaneResizeHandleProps) {
    const startValueRef = useRef(startValue);
    startValueRef.current = startValue;
    const onDeltaRef = useRef(onPointerDelta);
    onDeltaRef.current = onPointerDelta;
    const drag = useRef<{ x: number; value: number } | null>(null);

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!drag.current) return;
            onDeltaRef.current(e.clientX - drag.current.x, drag.current.value);
        };
        const onUp = () => {
            drag.current = null;
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        return () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
    }, []);

    return (
        <div
            role="separator"
            aria-orientation="vertical"
            aria-label={ariaLabel}
            aria-valuemin={ariaValuemin}
            aria-valuemax={ariaValuemax}
            aria-valuenow={ariaValuenow}
            tabIndex={0}
            data-testid={testId}
            className={className ?? "pane-resize"}
            onMouseDown={(e) => {
                if (e.button !== 0) return;
                e.preventDefault();
                drag.current = { x: e.clientX, value: startValueRef.current };
            }}
            onKeyDown={(e) => {
                if (onKeyDown(e.key)) e.preventDefault();
            }}
        />
    );
}
