/**
 * DocCommands registry.
 *
 * Four document ops, applied to markdown (not Tiptap). Slash / Ask AI / later
 * voice all dispatch here. The host previews the planned list, then commits
 * the resulting markdown as one undo step.
 *
 * Browser-safe: no Bun, no SDK.
 */

export const DOC_COMMAND_OPS = [
    "replace_range",
    "insert_after_block",
    "table_add_row",
    "table_update_cell",
] as const;

export type DocCommandOp = (typeof DOC_COMMAND_OPS)[number];

export type ReplaceRangeCommand = {
    op: "replace_range";
    old_text: string;
    new_text: string;
};

export type InsertAfterBlockCommand = {
    op: "insert_after_block";
    after: string;
    markdown: string;
};

export type TableAddRowCommand = {
    op: "table_add_row";
    table: number;
    cells: string[];
    after_row?: number;
};

export type TableUpdateCellCommand = {
    op: "table_update_cell";
    table: number;
    row: number;
    col: number;
    text: string;
};

export type DocCommand =
    | ReplaceRangeCommand
    | InsertAfterBlockCommand
    | TableAddRowCommand
    | TableUpdateCellCommand;

export type PlannedEdit = {
    op: DocCommandOp;
    summary: string;
    command: DocCommand;
};

export type PlanResult =
    | { ok: true; markdown: string; edits: PlannedEdit[] }
    | { ok: false; error: string };

export type DocCommandTool = {
    name: DocCommandOp;
    description: string;
    input_schema: {
        type: "object";
        properties: Record<string, unknown>;
        required: string[];
    };
};

const OP_SET = new Set<string>(DOC_COMMAND_OPS);

export function isDocCommandOp(value: unknown): value is DocCommandOp {
    return typeof value === "string" && OP_SET.has(value);
}

export function clipSummary(text: string, cap = 48): string {
    const one = text.replace(/\s+/g, " ").trim();
    if (!one) return "";
    if (one.length <= cap) return one;
    return one.slice(0, cap - 1) + "…";
}

export function summarizeCommand(command: DocCommand): string {
    switch (command.op) {
        case "replace_range":
            return `Replace "${clipSummary(command.old_text)}" with "${clipSummary(command.new_text)}"`;
        case "insert_after_block":
            return `Insert after "${clipSummary(command.after)}"`;
        case "table_add_row": {
            const cells = command.cells.map((c) => clipSummary(c, 24)).join(", ");
            return cells
                ? `Add row to table ${command.table}: ${cells}`
                : `Add row to table ${command.table}`;
        }
        case "table_update_cell":
            return `Set table ${command.table} r${command.row}c${command.col} to "${clipSummary(command.text)}"`;
    }
}

export const DOC_COMMAND_TOOLS: readonly DocCommandTool[] = [
    {
        name: "replace_range",
        description:
            "Replace a unique existing markdown span with new markdown. old_text must occur exactly once in the document.",
        input_schema: {
            type: "object",
            properties: {
                old_text: { type: "string", description: "Exact existing span to replace." },
                new_text: { type: "string", description: "Replacement markdown." },
            },
            required: ["old_text", "new_text"],
        },
    },
    {
        name: "insert_after_block",
        description:
            "Insert markdown after the unique block that contains `after` (a heading line, paragraph excerpt, or table fragment).",
        input_schema: {
            type: "object",
            properties: {
                after: { type: "string", description: "Unique excerpt identifying the block." },
                markdown: { type: "string", description: "Markdown to insert after that block." },
            },
            required: ["after", "markdown"],
        },
    },
    {
        name: "table_add_row",
        description:
            "Append a row to a GFM table, or insert it after after_row (0 = header). table is 1-based in document order. Extra cells are truncated; missing cells are padded.",
        input_schema: {
            type: "object",
            properties: {
                table: { type: "integer", description: "1-based table index." },
                cells: { type: "array", items: { type: "string" }, description: "Cell text for the new row." },
                after_row: {
                    type: "integer",
                    description: "0-based row index to insert after (0 = header). Omit to append.",
                },
            },
            required: ["table", "cells"],
        },
    },
    {
        name: "table_update_cell",
        description: "Set one GFM table cell. table is 1-based; row 0 is the header; col is 0-based.",
        input_schema: {
            type: "object",
            properties: {
                table: { type: "integer", description: "1-based table index." },
                row: { type: "integer", description: "0-based row (0 = header)." },
                col: { type: "integer", description: "0-based column." },
                text: { type: "string", description: "New cell text (unescaped)." },
            },
            required: ["table", "row", "col", "text"],
        },
    },
];

export const CLI_DOCCOMMANDS_TRAILER = `If you need targeted edits, reply with a single fenced JSON array and nothing else:

\`\`\`doccommands
[{"op":"replace_range","old_text":"existing unique span","new_text":"replacement"}]
\`\`\`

Valid ops: replace_range, insert_after_block, table_add_row, table_update_cell.
table is 1-based; table row 0 is the header. Otherwise return only the markdown for the result. No preamble.`;

function asString(value: unknown): string | null {
    if (typeof value === "string") return value;
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    return null;
}

function asInt(value: unknown): number | null {
    if (typeof value === "number" && Number.isInteger(value)) return value;
    if (typeof value === "string" && /^-?\d+$/.test(value.trim())) return Number(value.trim());
    return null;
}

function asStringArray(value: unknown): string[] | null {
    if (!Array.isArray(value)) return null;
    const cells: string[] = [];
    for (const item of value) {
        const text = asString(item);
        if (text === null) return null;
        cells.push(text);
    }
    return cells;
}

export function parseDocCommand(raw: unknown): DocCommand | { error: string } {
    if (!raw || typeof raw !== "object") return { error: "Command is not an object." };
    const rec = raw as Record<string, unknown>;
    const op = rec["op"];
    if (!isDocCommandOp(op)) {
        return { error: `Unknown command op: ${String(op ?? "(missing)")}.` };
    }
    if (op === "replace_range") {
        const old_text = asString(rec["old_text"]);
        const new_text = asString(rec["new_text"]);
        if (old_text === null || new_text === null) {
            return { error: "replace_range needs old_text and new_text." };
        }
        return { op, old_text, new_text };
    }
    if (op === "insert_after_block") {
        const after = asString(rec["after"]);
        const markdown = asString(rec["markdown"]);
        if (after === null || markdown === null) {
            return { error: "insert_after_block needs after and markdown." };
        }
        return { op, after, markdown };
    }
    if (op === "table_add_row") {
        const table = asInt(rec["table"]);
        const cells = asStringArray(rec["cells"]);
        if (table === null || cells === null) {
            return { error: "table_add_row needs table and cells." };
        }
        const cmd: TableAddRowCommand = { op, table, cells };
        if (rec["after_row"] !== undefined) {
            const after_row = asInt(rec["after_row"]);
            if (after_row === null) return { error: "table_add_row after_row must be an integer." };
            cmd.after_row = after_row;
        }
        return cmd;
    }
    const table = asInt(rec["table"]);
    const row = asInt(rec["row"]);
    const col = asInt(rec["col"]);
    const text = asString(rec["text"]);
    if (table === null || row === null || col === null || text === null) {
        return { error: "table_update_cell needs table, row, col, and text." };
    }
    return { op, table, row, col, text };
}

export function parseDocCommands(raw: unknown): DocCommand[] | { error: string } {
    if (!Array.isArray(raw)) {
        const one = parseDocCommand(raw);
        if ("error" in one) return one;
        return [one];
    }
    const out: DocCommand[] = [];
    for (let i = 0; i < raw.length; i++) {
        const one = parseDocCommand(raw[i]);
        if ("error" in one) return { error: `Command ${i + 1}: ${one.error}` };
        out.push(one);
    }
    return out;
}

export function commandFromToolUse(name: string, input: unknown): DocCommand | { error: string } {
    const rec = input && typeof input === "object" ? { ...(input as Record<string, unknown>), op: name } : { op: name };
    return parseDocCommand(rec);
}

export function extractDocCommandsFence(text: string): DocCommand[] | null {
    const trimmed = text.replace(/^\uFEFF/, "").trim();
    const fence =
        /```doccommands\s*\n([\s\S]*?)\n```/i.exec(trimmed) ??
        /```json\s*\n(\s*\[[\s\S]*?\])\s*\n```/i.exec(trimmed);
    const candidate = fence?.[1]?.trim() ?? (/^\s*\[/.test(trimmed) ? trimmed : "");
    if (!candidate) return null;
    try {
        const parsed: unknown = JSON.parse(candidate);
        const commands = parseDocCommands(parsed);
        if ("error" in commands || commands.length === 0) return null;
        return commands;
    } catch {
        return null;
    }
}

type Block = { start: number; end: number; text: string };

type ParsedTable = {
    index: number;
    startLine: number;
    endLine: number;
    header: string[];
    rows: string[][];
};

function countOccurrences(haystack: string, needle: string): number {
    if (!needle) return 0;
    let count = 0;
    let from = 0;
    while (from <= haystack.length - needle.length) {
        const at = haystack.indexOf(needle, from);
        if (at === -1) break;
        count += 1;
        from = at + needle.length;
    }
    return count;
}

export function splitPipeRow(line: string): string[] | null {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) return null;
    const inner =
        trimmed.endsWith("|") && trimmed.length >= 2 ? trimmed.slice(1, -1) : trimmed.slice(1);
    const cells: string[] = [];
    let cur = "";
    for (let i = 0; i < inner.length; i++) {
        const ch = inner[i];
        if (ch === "\\" && inner[i + 1] === "|") {
            cur += "\\|";
            i += 1;
            continue;
        }
        if (ch === "|") {
            cells.push(cur.trim());
            cur = "";
            continue;
        }
        cur += ch;
    }
    cells.push(cur.trim());
    return cells;
}

function isSepRow(cells: string[]): boolean {
    return cells.length > 0 && cells.every((c) => /^:?-{1,}:?$/.test(c.replace(/\s/g, "")) && c.includes("-"));
}

function unescapeCell(text: string): string {
    return text.replace(/\\\|/g, "|");
}

function escapeCell(text: string): string {
    return text.replace(/\s*\n\s*/g, " ").replace(/\|/g, "\\|").trim();
}

function formatRow(cells: string[]): string {
    return `| ${cells.map(escapeCell).join(" | ")} |`;
}

function formatTable(header: string[], rows: string[][]): string[] {
    const width = Math.max(header.length, ...rows.map((r) => r.length), 1);
    const pad = (cells: string[]) => {
        const next = cells.slice(0, width);
        while (next.length < width) next.push("");
        return next;
    };
    const h = pad(header);
    const sep = h.map(() => "---");
    return [formatRow(h), formatRow(sep), ...rows.map((r) => formatRow(pad(r)))];
}

function splitLines(md: string): string[] {
    return md.split(/\r?\n/);
}

function scanTables(lines: string[]): ParsedTable[] {
    const tables: ParsedTable[] = [];
    let i = 0;
    let inFence = false;
    while (i < lines.length) {
        const line = lines[i] ?? "";
        const trim = line.trim();
        if (trim.startsWith("```")) {
            inFence = !inFence;
            i += 1;
            continue;
        }
        if (inFence) {
            i += 1;
            continue;
        }
        const header = splitPipeRow(line);
        const sep = i + 1 < lines.length ? splitPipeRow(lines[i + 1] ?? "") : null;
        if (header && sep && isSepRow(sep) && header.length > 0) {
            const rows: string[][] = [];
            let j = i + 2;
            while (j < lines.length) {
                const row = splitPipeRow(lines[j] ?? "");
                if (!row || isSepRow(row)) break;
                rows.push(row.map(unescapeCell));
                j += 1;
            }
            tables.push({
                index: tables.length + 1,
                startLine: i,
                endLine: j,
                header: header.map(unescapeCell),
                rows,
            });
            i = j;
            continue;
        }
        i += 1;
    }
    return tables;
}

function findTable(lines: string[], index: number): ParsedTable | { error: string } {
    const tables = scanTables(lines);
    if (index < 1 || index > tables.length) {
        const n = tables.length;
        const noun = n === 1 ? "table" : "tables";
        return { error: `no table ${index} (document has ${n} ${noun})` };
    }
    return tables[index - 1]!;
}

function padCells(cells: string[], width: number): string[] {
    const next = cells.slice(0, width).map((c) => c);
    while (next.length < width) next.push("");
    return next;
}

function scanBlocks(md: string): Block[] {
    const lines = splitLines(md);
    const blocks: Block[] = [];
    let offset = 0;
    let i = 0;
    const lineStart: number[] = [];
    for (const line of lines) {
        lineStart.push(offset);
        offset += line.length + 1;
    }

    const posAt = (lineIdx: number, end: boolean): number => {
        if (lineIdx >= lines.length) return md.length;
        const start = lineStart[lineIdx] ?? md.length;
        if (!end) return Math.min(start, md.length);
        const line = lines[lineIdx] ?? "";
        return Math.min(start + line.length, md.length);
    };

    while (i < lines.length) {
        const line = lines[i] ?? "";
        if (!line.trim()) {
            i += 1;
            continue;
        }
        const startLine = i;
        const trim = line.trim();
        if (trim.startsWith("```")) {
            i += 1;
            while (i < lines.length && !((lines[i] ?? "").trim().startsWith("```"))) i += 1;
            if (i < lines.length) i += 1;
        } else if (/^#{1,6}\s/.test(trim)) {
            i += 1;
        } else {
            const header = splitPipeRow(line);
            const sep = i + 1 < lines.length ? splitPipeRow(lines[i + 1] ?? "") : null;
            if (header && sep && isSepRow(sep)) {
                i += 2;
                while (i < lines.length) {
                    const row = splitPipeRow(lines[i] ?? "");
                    if (!row || isSepRow(row)) break;
                    i += 1;
                }
            } else {
                i += 1;
                while (i < lines.length) {
                    const next = lines[i] ?? "";
                    if (!next.trim()) break;
                    if (/^#{1,6}\s/.test(next.trim())) break;
                    if (next.trim().startsWith("```")) break;
                    const h = splitPipeRow(next);
                    const s = i + 1 < lines.length ? splitPipeRow(lines[i + 1] ?? "") : null;
                    if (h && s && isSepRow(s)) break;
                    i += 1;
                }
            }
        }
        const endLine = i - 1;
        const start = posAt(startLine, false);
        const end = posAt(endLine, true);
        blocks.push({ start, end, text: md.slice(start, end) });
    }
    return blocks;
}

function applyReplace(md: string, cmd: ReplaceRangeCommand): string {
    if (!cmd.old_text) throw new Error("replace_range: old_text is empty");
    const n = countOccurrences(md, cmd.old_text);
    if (n === 0) throw new Error(`replace_range: "${clipSummary(cmd.old_text)}" was not found`);
    if (n > 1) {
        throw new Error(
            `replace_range: "${clipSummary(cmd.old_text)}" matches ${n} places; it must be unique`
        );
    }
    const at = md.indexOf(cmd.old_text);
    return md.slice(0, at) + cmd.new_text + md.slice(at + cmd.old_text.length);
}

function applyInsertAfter(md: string, cmd: InsertAfterBlockCommand): string {
    if (!cmd.after) throw new Error("insert_after_block: after is empty");
    const n = countOccurrences(md, cmd.after);
    if (n === 0) throw new Error(`insert_after_block: no block matches "${clipSummary(cmd.after)}"`);
    if (n > 1) {
        throw new Error(
            `insert_after_block: "${clipSummary(cmd.after)}" matches ${n} places; it must be unique`
        );
    }
    const at = md.indexOf(cmd.after);
    const block = scanBlocks(md).find((b) => b.start <= at && at < b.end);
    const end = block?.end ?? at + cmd.after.length;
    const insertion = cmd.markdown.trim();
    if (!insertion) throw new Error("insert_after_block: markdown is empty");
    const rest = md.slice(end).replace(/^\n+/, "");
    const head = md.slice(0, end).replace(/\n+$/, "");
    return rest ? `${head}\n\n${insertion}\n\n${rest}` : `${head}\n\n${insertion}\n`;
}

function applyAddRow(md: string, cmd: TableAddRowCommand): string {
    if (cmd.table < 1) throw new Error("table_add_row: table must be >= 1");
    const lines = splitLines(md);
    const table = findTable(lines, cmd.table);
    if ("error" in table) throw new Error(`table_add_row: ${table.error}`);
    const width = Math.max(table.header.length, ...table.rows.map((r) => r.length), 1);
    const row = padCells(cmd.cells, width);
    const totalRows = 1 + table.rows.length;
    let rows: string[][];
    if (cmd.after_row === undefined) {
        rows = [...table.rows, row];
    } else {
        if (cmd.after_row < 0 || cmd.after_row >= totalRows) {
            throw new Error(
                `table_add_row: after_row ${cmd.after_row} is out of range (table has ${totalRows} rows)`
            );
        }
        if (cmd.after_row === 0) {
            rows = [row, ...table.rows];
        } else {
            rows = [
                ...table.rows.slice(0, cmd.after_row),
                row,
                ...table.rows.slice(cmd.after_row),
            ];
        }
    }
    const rendered = formatTable(table.header, rows);
    return [...lines.slice(0, table.startLine), ...rendered, ...lines.slice(table.endLine)].join("\n");
}

function applyUpdateCell(md: string, cmd: TableUpdateCellCommand): string {
    if (cmd.table < 1) throw new Error("table_update_cell: table must be >= 1");
    if (cmd.row < 0 || cmd.col < 0) throw new Error("table_update_cell: row and col must be >= 0");
    const lines = splitLines(md);
    const table = findTable(lines, cmd.table);
    if ("error" in table) throw new Error(`table_update_cell: ${table.error}`);
    const width = Math.max(table.header.length, ...table.rows.map((r) => r.length), 1);
    if (cmd.col >= width) {
        throw new Error(`table_update_cell: col ${cmd.col} is out of range (table has ${width} columns)`);
    }
    const header = padCells(table.header, width);
    const rows = table.rows.map((r) => padCells(r, width));
    if (cmd.row === 0) {
        header[cmd.col] = cmd.text;
    } else {
        const bodyIndex = cmd.row - 1;
        if (bodyIndex >= rows.length) {
            throw new Error(
                `table_update_cell: row ${cmd.row} is out of range (table has ${1 + rows.length} rows)`
            );
        }
        rows[bodyIndex]![cmd.col] = cmd.text;
    }
    const rendered = formatTable(header, rows);
    return [...lines.slice(0, table.startLine), ...rendered, ...lines.slice(table.endLine)].join("\n");
}

export function applyDocCommand(markdown: string, command: DocCommand): string {
    switch (command.op) {
        case "replace_range":
            return applyReplace(markdown, command);
        case "insert_after_block":
            return applyInsertAfter(markdown, command);
        case "table_add_row":
            return applyAddRow(markdown, command);
        case "table_update_cell":
            return applyUpdateCell(markdown, command);
    }
}

export function dispatchDocCommands(markdown: string, commands: DocCommand[]): PlanResult {
    if (commands.length === 0) return { ok: false, error: "No document edits to apply." };
    const edits: PlannedEdit[] = [];
    let current = markdown;
    for (let i = 0; i < commands.length; i++) {
        const command = commands[i]!;
        try {
            current = applyDocCommand(current, command);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return { error: `Edit ${i + 1}: ${message}`, ok: false };
        }
        edits.push({ op: command.op, summary: summarizeCommand(command), command });
    }
    return { ok: true, markdown: current, edits };
}

export const planDocCommands = dispatchDocCommands;
