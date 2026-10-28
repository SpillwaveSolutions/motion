/**
 * Themed PDF. Standard PDF fonts only (Helvetica, Times, Courier) so the file
 * opens everywhere without embedding. Colors come from the export theme.
 */
import { jsPDF } from "jspdf";
import { markdownToBlocks, runsToText, type ExportBlock, type InlineRun } from "./exportBlocks";
import { hexToRgb, type ExportTheme, type ThemeFont } from "./themes";

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 64;

const PDF_FONT: Record<ThemeFont, "helvetica" | "times" | "courier"> = {
    sans: "helvetica",
    serif: "times",
    mono: "courier",
};

type Style = "normal" | "bold" | "italic" | "bolditalic";

// Points of space above a heading, by level (4 to 6 use the level 3 value).
const HEADING_BEFORE: Record<number, number> = { 1: 18, 2: 16, 3: 12 };

interface Cursor {
    doc: jsPDF;
    y: number;
    theme: ExportTheme;
}

export function exportPdf(markdown: string, theme: ExportTheme, title: string): Uint8Array {
    const doc = new jsPDF({ unit: "pt", format: "letter", compress: false });
    doc.setProperties({ title });
    const cursor: Cursor = { doc, y: MARGIN, theme };
    paintPage(cursor);
    const blocks = markdownToBlocks(markdown);
    if (blocks.length === 0) {
        writeLines(cursor, title || "Untitled", 18, theme.headingFont, "bold", theme.heading, 0);
    }
    for (const block of blocks) drawBlock(cursor, block);
    return new Uint8Array(doc.output("arraybuffer"));
}

function paintPage(cursor: Cursor) {
    const [r, g, b] = hexToRgb(cursor.theme.page);
    cursor.doc.setFillColor(r, g, b);
    cursor.doc.rect(0, 0, PAGE_W, PAGE_H, "F");
}

function ensure(cursor: Cursor, need: number) {
    if (cursor.y + need <= PAGE_H - MARGIN) return;
    cursor.doc.addPage();
    paintPage(cursor);
    cursor.y = MARGIN;
}

function writeLines(
    cursor: Cursor,
    text: string,
    size: number,
    font: ThemeFont,
    style: Style,
    color: string,
    indent: number,
) {
    const doc = cursor.doc;
    doc.setFont(PDF_FONT[font], style);
    doc.setFontSize(size);
    const [r, g, b] = hexToRgb(color);
    doc.setTextColor(r, g, b);
    const maxW = PAGE_W - MARGIN * 2 - indent;
    const lines = doc.splitTextToSize(text || " ", maxW) as string[];
    const lineH = size * 1.35;
    for (const line of lines) {
        ensure(cursor, lineH);
        doc.text(line, MARGIN + indent, cursor.y);
        cursor.y += lineH;
    }
}

function drawBlock(cursor: Cursor, block: ExportBlock) {
    const theme = cursor.theme;
    if (block.type === "heading") {
        const size = block.level === 1 ? 22 : block.level === 2 ? 16 : 13;
        // Space above, except at the top of a page. Keep the heading with the next lines.
        if (cursor.y > MARGIN) cursor.y += HEADING_BEFORE[Math.min(block.level, 3)]!;
        ensure(cursor, size * 1.35 + 40);
        writeLines(cursor, block.text, size, theme.headingFont, "bold", theme.heading, 0);
        if (block.level === 1) {
            const [r, g, b] = hexToRgb(theme.accent);
            cursor.doc.setDrawColor(r, g, b);
            cursor.doc.setLineWidth(1.5);
            const rule = cursor.y - size * 0.6;
            cursor.doc.line(MARGIN, rule, PAGE_W - MARGIN, rule);
            cursor.y = rule + 22;
        } else {
            cursor.y += 4;
        }
        return;
    }
    if (block.type === "paragraph") {
        writeRuns(cursor, block.runs);
        cursor.y += 6;
        return;
    }
    if (block.type === "list") {
        block.items.forEach((item, index) => {
            const marker = block.ordered ? `${index + 1}.` : "•";
            writeLines(cursor, `${marker}  ${runsToText(item)}`, 11, theme.font, "normal", theme.text, 8);
        });
        cursor.y += 6;
        return;
    }
    if (block.type === "quote") {
        writeLines(cursor, block.text, 11, theme.font, "italic", theme.muted, 12);
        cursor.y += 6;
        return;
    }
    if (block.type === "code") {
        writeLines(cursor, block.text, 9, "mono", "normal", theme.codeText, 8);
        cursor.y += 8;
        return;
    }
    if (block.type === "hr") {
        ensure(cursor, 12);
        const [r, g, b] = hexToRgb(theme.accent);
        cursor.doc.setDrawColor(r, g, b);
        cursor.doc.setLineWidth(0.8);
        cursor.doc.line(MARGIN, cursor.y, PAGE_W - MARGIN, cursor.y);
        cursor.y += 12;
        return;
    }
    drawTable(cursor, block);
}

const TABLE_SIZE = 10;
const TABLE_LINE = 1.3;
const CELL_PAD = 5;
// Extra space above and below a table, so two tables never touch.
const TABLE_GAP = 6;

interface TableRowLayout {
    lines: string[][];
    height: number;
}

/**
 * Bordered grid with a filled header row and striped body rows. The header
 * repeats at the top of each page the table runs onto.
 */
function drawTable(cursor: Cursor, block: ExportBlock & { type: "table" }) {
    const { doc, theme } = cursor;
    const cols = Math.max(block.header.length, ...block.rows.map((row) => row.length));
    if (cols === 0) return;
    const pad = (row: string[]) => Array.from({ length: cols }, (_, i) => row[i] ?? "");
    const header = pad(block.header);
    const rows = block.rows.map(pad);
    // ponytail: widths follow character counts, not measured text. Weigh by doc.getTextWidth if columns look off.
    const weights = header.map((_, i) => Math.min(40, Math.max(4, ...[header, ...rows].map((row) => row[i]!.length))));
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    const widths = weights.map((weight) => (weight / total) * (PAGE_W - MARGIN * 2));
    const lineH = TABLE_SIZE * TABLE_LINE;
    // cursor.y is the next text baseline. The grid works from the row top.
    let top = cursor.y - TABLE_SIZE + TABLE_GAP;

    const layout = (cells: string[], style: Style): TableRowLayout => {
        doc.setFont(PDF_FONT[theme.font], style);
        doc.setFontSize(TABLE_SIZE);
        const lines = cells.map((cell, i) => doc.splitTextToSize(cell || " ", widths[i]! - CELL_PAD * 2) as string[]);
        return { lines, height: Math.max(...lines.map((cell) => cell.length)) * lineH + CELL_PAD * 2 };
    };

    const paint = (row: TableRowLayout, style: Style, fill: string, color: string) => {
        doc.setFont(PDF_FONT[theme.font], style);
        doc.setFontSize(TABLE_SIZE);
        doc.setDrawColor(...hexToRgb(theme.tableBorder));
        doc.setLineWidth(0.5);
        let x = MARGIN;
        row.lines.forEach((lines, i) => {
            doc.setFillColor(...hexToRgb(fill));
            doc.rect(x, top, widths[i]!, row.height, "FD");
            doc.setTextColor(...hexToRgb(color));
            doc.text(lines, x + CELL_PAD, top + CELL_PAD + TABLE_SIZE * 0.8, { lineHeightFactor: TABLE_LINE });
            x += widths[i]!;
        });
        top += row.height;
    };

    // ponytail: a single row taller than a page overflows it. Split the cell lines across pages if a note needs that.
    const fits = (height: number) => top + height <= PAGE_H - MARGIN;
    const newPage = () => {
        doc.addPage();
        paintPage(cursor);
        top = MARGIN;
    };
    const head = layout(header, "bold");
    const paintHead = () => paint(head, "bold", theme.tableHeaderBg, theme.tableHeaderText);
    const first = rows[0] ? layout(rows[0], "normal").height : 0;
    if (!fits(head.height + first)) newPage();
    paintHead();
    rows.forEach((cells, i) => {
        const row = layout(cells, "normal");
        if (!fits(row.height)) {
            newPage();
            paintHead();
        }
        paint(row, "normal", i % 2 === 1 ? theme.tableRowAltBg : theme.tableRowBg, theme.text);
    });
    cursor.y = top + TABLE_SIZE + TABLE_GAP + 10;
}

function writeRuns(cursor: Cursor, runs: InlineRun[]) {
    const theme = cursor.theme;
    const style: Style = runs.some((run) => run.bold && run.italic)
        ? "bolditalic"
        : runs.some((run) => run.bold)
          ? "bold"
          : runs.some((run) => run.italic)
            ? "italic"
            : "normal";
    const color = runs.some((run) => run.href)
        ? theme.accent
        : runs.some((run) => run.code)
          ? theme.codeText
          : theme.text;
    const font = runs.length > 0 && runs.every((run) => run.code) ? "mono" : theme.font;
    writeLines(cursor, runsToText(runs), 11, font, style, color, 0);
}
