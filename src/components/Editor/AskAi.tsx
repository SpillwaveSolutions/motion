import { useEffect, useRef } from "react";
import {
    cannedForScope,
    summarizeCommand,
    type AiApplyMode,
    type AiScope,
    type CannedPrompt,
    type DocCommand,
    type PlannedEdit,
} from "../../lib/ai";

export type AskAiPhase = "idle" | "bubble" | "prompt" | "working" | "preview" | "error";

export type AskAiState =
    | { phase: "idle" }
    | {
          phase: "bubble";
          range: { from: number; to: number };
          selectedText: string;
          top: number;
          left: number;
      }
    | {
          phase: "prompt" | "working" | "preview" | "error";
          scope: AiScope;
          range: { from: number; to: number } | null;
          selectedText: string;
          instruction: string;
          reply?: string;
          commands?: DocCommand[];
          edits?: PlannedEdit[];
          error?: string;
      };

function commandsEqual(a?: DocCommand[], b?: DocCommand[]): boolean {
    const left = a ?? [];
    const right = b ?? [];
    if (left.length !== right.length) return false;
    if (left.length === 0) return true;
    return JSON.stringify(left) === JSON.stringify(right);
}

function editsEqual(a?: PlannedEdit[], b?: PlannedEdit[]): boolean {
    const left = a ?? [];
    const right = b ?? [];
    if (left.length !== right.length) return false;
    return left.every((edit, i) => edit.summary === right[i]?.summary && edit.op === right[i]?.op);
}

export function isAskAiPanelOpen(
    state: AskAiState
): state is Extract<AskAiState, { phase: "prompt" | "working" | "preview" | "error" }> {
    return (
        state.phase === "prompt" ||
        state.phase === "working" ||
        state.phase === "preview" ||
        state.phase === "error"
    );
}

export function askAiStatesEqual(a: AskAiState, b: AskAiState): boolean {
    if (a.phase !== b.phase) return false;
    if (a.phase === "idle") return true;
    if (a.phase === "bubble" && b.phase === "bubble") {
        return (
            a.range.from === b.range.from &&
            a.range.to === b.range.to &&
            a.selectedText === b.selectedText &&
            Math.round(a.top) === Math.round(b.top) &&
            Math.round(a.left) === Math.round(b.left)
        );
    }
    if (!isAskAiPanelOpen(a) || !isAskAiPanelOpen(b)) return false;
    return (
        a.scope === b.scope &&
        a.instruction === b.instruction &&
        a.selectedText === b.selectedText &&
        a.reply === b.reply &&
        a.error === b.error &&
        a.range?.from === b.range?.from &&
        a.range?.to === b.range?.to &&
        commandsEqual(a.commands, b.commands) &&
        editsEqual(a.edits, b.edits)
    );
}

export function applyEditsLabel(count: number): string {
    return count === 1 ? "Apply 1 edit" : `Apply ${count} edits`;
}

export function AskAiBubble({
    top,
    left,
    onAsk,
}: {
    top: number;
    left: number;
    onAsk: () => void;
}) {
    return (
        <button
            type="button"
            className="ask-ai-bubble"
            aria-label="Ask AI"
            style={{ top, left }}
            onMouseDown={(e) => {
                e.preventDefault();
                onAsk();
            }}
        >
            Ask AI
        </button>
    );
}

function ProposedEdits({ edits }: { edits: PlannedEdit[] }) {
    return (
        <ul className="ask-ai-edits" role="list" aria-label="Proposed edits">
            {edits.map((edit, i) => (
                <li key={`${edit.op}-${i}`} className="ask-ai-edit">
                    {edit.summary}
                </li>
            ))}
        </ul>
    );
}

export function AskAiPanel({
    phase,
    scope,
    instruction,
    reply,
    commands,
    edits,
    error,
    onInstruction,
    onSubmit,
    onCanned,
    onReplace,
    onInsertBelow,
    onApplyCommands,
    onTryAgain,
    onDiscard,
}: {
    phase: "prompt" | "working" | "preview" | "error";
    scope: AiScope;
    instruction: string;
    reply?: string;
    commands?: DocCommand[];
    edits?: PlannedEdit[];
    error?: string;
    onInstruction: (value: string) => void;
    onSubmit: () => void;
    onCanned: (chip: CannedPrompt) => void;
    onReplace: () => void;
    onInsertBelow: () => void;
    onApplyCommands: () => void;
    onTryAgain: () => void;
    onDiscard: () => void;
}) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const chips = cannedForScope(scope);
    const modes: AiApplyMode[] =
        scope === "document" ? ["replace"] : scope === "cursor" ? ["insert-below"] : ["replace", "insert-below"];
    const planned =
        edits && edits.length > 0
            ? edits
            : (commands ?? []).map((command) => ({
                  op: command.op,
                  summary: summarizeCommand(command),
                  command,
              }));
    const commandPreview = planned.length > 0;

    useEffect(() => {
        if (phase === "prompt") {
            textareaRef.current?.focus();
        }
    }, [phase]);

    const regionLabel = phase === "prompt" || phase === "working" ? "Ask AI" : "AI preview";

    return (
        <div
            className="ask-ai-panel"
            role="region"
            aria-label={regionLabel}
            aria-busy={phase === "working"}
        >
            {phase === "prompt" && (
                <>
                    {chips.length > 0 && (
                        <div className="ask-ai-chips">
                            {chips.map((chip) => (
                                <button
                                    key={chip.id}
                                    type="button"
                                    className="ask-ai-chip"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => onCanned(chip)}
                                >
                                    {chip.label}
                                </button>
                            ))}
                        </div>
                    )}
                    <textarea
                        ref={textareaRef}
                        className="ask-ai-instruction"
                        aria-label="Ask AI instruction"
                        placeholder="Tell Motion what to do…"
                        value={instruction}
                        onChange={(e) => onInstruction(e.target.value)}
                        onKeyDown={(e) => {
                            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                                e.preventDefault();
                                onSubmit();
                            }
                        }}
                    />
                    <div className="ask-ai-actions">
                        <button
                            type="button"
                            className="ask-ai-btn ask-ai-btn-primary"
                            onClick={onSubmit}
                            disabled={!instruction.trim()}
                        >
                            Ask AI
                        </button>
                        <button type="button" className="ask-ai-btn" onClick={onDiscard}>
                            Discard
                        </button>
                    </div>
                </>
            )}

            {phase === "working" && (
                <>
                    <p role="status" className="ask-ai-status">
                        Asking AI…
                    </p>
                    {commandPreview ? (
                        <ProposedEdits edits={planned} />
                    ) : reply ? (
                        <pre className="ask-ai-preview-body">{reply}</pre>
                    ) : null}
                    <div className="ask-ai-actions">
                        <button type="button" className="ask-ai-btn" onClick={onDiscard}>
                            Discard
                        </button>
                    </div>
                </>
            )}

            {phase === "preview" && (
                <>
                    {commandPreview ? (
                        <ProposedEdits edits={planned} />
                    ) : (
                        <pre className="ask-ai-preview-body">{reply}</pre>
                    )}
                    <div className="ask-ai-actions">
                        {commandPreview ? (
                            <button
                                type="button"
                                className="ask-ai-btn ask-ai-btn-primary"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={onApplyCommands}
                            >
                                {applyEditsLabel(planned.length)}
                            </button>
                        ) : (
                            <>
                                {modes.includes("replace") && (
                                    <button
                                        type="button"
                                        className="ask-ai-btn ask-ai-btn-primary"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={onReplace}
                                    >
                                        Replace
                                    </button>
                                )}
                                {modes.includes("insert-below") && (
                                    <button
                                        type="button"
                                        className="ask-ai-btn ask-ai-btn-primary"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={onInsertBelow}
                                    >
                                        Insert below
                                    </button>
                                )}
                            </>
                        )}
                        <button type="button" className="ask-ai-btn" onClick={onTryAgain}>
                            Try again
                        </button>
                        <button type="button" className="ask-ai-btn" onClick={onDiscard}>
                            Discard
                        </button>
                    </div>
                </>
            )}

            {phase === "error" && (
                <>
                    <p role="alert" className="ask-ai-error">
                        {error || "Ask AI failed."}
                    </p>
                    <div className="ask-ai-actions">
                        <button type="button" className="ask-ai-btn ask-ai-btn-primary" onClick={onTryAgain}>
                            Try again
                        </button>
                        <button type="button" className="ask-ai-btn" onClick={onDiscard}>
                            Discard
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
