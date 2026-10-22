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
        cursor.y += 6;
        const size = block.level === 1 ? 22 : block.level === 2 ? 16 : 13;
        writeLines(cursor, block.text, size, theme.headingFont, "bold", theme.heading, 0);
        if (block.level === 1) {
            ensure(cursor, 8);
            const [r, g, b] = hexToRgb(theme.accent);
            cursor.doc.setDrawColor(r, g, b);
            cursor.doc.setLineWidth(1.5);
            cursor.doc.line(MARGIN, cursor.y, PAGE_W - MARGIN, cursor.y);
            cursor.y += 10;
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
    for (const row of [block.header, ...block.rows]) {
        writeLines(cursor, row.join("   "), 10, theme.font, "normal", theme.text, 0);
    }
    cursor.y += 6;
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
