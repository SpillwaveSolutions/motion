export interface AiOp {
    instruction: string;
    selection: string | null;
    resultSummary: string;
    ts: number;
}

const DEFAULT_MAX = 8;

export class AiSessionLog {
    private ops: AiOp[] = [];

    constructor(private readonly maxOps = DEFAULT_MAX) {}

    push(op: AiOp): void {
        this.ops = [...this.ops, op].slice(-this.maxOps);
    }

    list(): readonly AiOp[] {
        return this.ops;
    }

    clear(): void {
        this.ops = [];
    }
}

const logs = new Map<string, AiSessionLog>();

export function sessionForDoc(path: string | null | undefined): AiSessionLog {
    const key = path ?? "__untitled__";
    let log = logs.get(key);
    if (!log) {
        log = new AiSessionLog();
        logs.set(key, log);
    }
    return log;
}

/** Test-only: drop the process-wide map. */
export function resetSessionsForTests(): void {
    logs.clear();
}

export function summarizeReply(reply: string, cap = 240): string {
    const oneLine = reply.replace(/\s+/g, " ").trim();
    if (oneLine.length <= cap) return oneLine;
    return oneLine.slice(0, cap - 1) + "…";
}
