export type AiScope = "selection" | "cursor" | "document";
export type AiApplyMode = "replace" | "insert-below";

export type WysiwygApply =
    | { kind: "setContent" }
    | { kind: "replaceRange"; from: number; to: number }
    | { kind: "insertAt"; pos: number };

export function visibleApplyModes(scope: AiScope): AiApplyMode[] {
    if (scope === "document") return ["replace"];
    if (scope === "cursor") return ["insert-below"];
    return ["replace", "insert-below"];
}

export function planWysiwygApply(
    scope: AiScope,
    mode: AiApplyMode,
    range: { from: number; to: number } | null
): WysiwygApply {
    if (scope === "document") return { kind: "setContent" };
    if (mode === "insert-below") {
        return { kind: "insertAt", pos: range?.to ?? 1 };
    }
    if (range) return { kind: "replaceRange", from: range.from, to: range.to };
    return { kind: "setContent" };
}

export function clampPos(pos: number, docSize: number): number {
    if (docSize <= 0) return 0;
    return Math.min(Math.max(1, pos), docSize);
}
