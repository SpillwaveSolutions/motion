/**
 * Themed Word document. Heading and body fonts follow the theme
 * (Georgia for serif, Calibri for sans, Consolas for mono).
 */
import {
    BorderStyle,
    Document,
    HeadingLevel,
    Packer,
    Paragraph,
    ShadingType,
    Table,
    TableCell,
    TableRow,
    TextRun,
    WidthType,
    type FileChild,
} from "docx";
import { markdownToBlocks, type ExportBlock, type InlineRun } from "./exportBlocks";
import { hexBare, type ExportTheme, type ThemeFont } from "./themes";

const FONT: Record<ThemeFont, string> = {
    serif: "Georgia",
    sans: "Calibri",
    mono: "Consolas",
};

const HEADING: Record<1 | 2 | 3 | 4 | 5 | 6, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
    1: HeadingLevel.HEADING_1,
    2: HeadingLevel.HEADING_2,
    3: HeadingLevel.HEADING_3,
    4: HeadingLevel.HEADING_4,
    5: HeadingLevel.HEADING_5,
    6: HeadingLevel.HEADING_6,
};

export async function exportDocx(markdown: string, theme: ExportTheme, title: string): Promise<Blob> {
    const children = blocksToChildren(markdownToBlocks(markdown), theme);
    if (children.length === 0) {
        children.push(paragraph(title || "Untitled", theme, { heading: true, size: 36 }));
    }
    const doc = new Document({
        title,
        background: { color: hexBare(theme.page) },
        styles: {
            default: {
                document: {
                    run: { font: FONT[theme.font], size: 22, color: hexBare(theme.text) },
                },
            },
        },
        sections: [{ children }],
    });
    return Packer.toBlob(doc);
}

// Paragraph spacing in twips (1/20 pt). Word adds none by default, so headings
// touch the text and two tables merge into one.
const AFTER = 160;
const HEADING_SPACING: Record<1 | 2 | 3 | 4 | 5 | 6, { before: number; after: number }> = {
    1: { before: 240, after: 200 },
    2: { before: 360, after: 120 },
    3: { before: 280, after: 80 },
    4: { before: 240, after: 80 },
    5: { before: 240, after: 80 },
    6: { before: 240, after: 80 },
};

function blocksToChildren(blocks: ExportBlock[], theme: ExportTheme): FileChild[] {
    const children: FileChild[] = [];
    for (const block of blocks) {
        if (block.type === "heading") {
            children.push(
                new Paragraph({
                    heading: HEADING[block.level],
                    spacing: HEADING_SPACING[block.level],
                    keepNext: true,
                    border:
                        block.level === 1
                            ? { bottom: { style: BorderStyle.SINGLE, size: 12, color: hexBare(theme.accent), space: 4 } }
                            : undefined,
                    children: [
                        new TextRun({
                            text: block.text,
                            bold: true,
                            font: FONT[theme.headingFont],
                            color: hexBare(theme.heading),
                            size: block.level === 1 ? 40 : block.level === 2 ? 32 : 26,
                        }),
                    ],
                }),
            );
            continue;
        }
        if (block.type === "paragraph") {
            children.push(new Paragraph({ spacing: { after: AFTER }, children: runs(block.runs, theme) }));
            continue;
        }
        if (block.type === "list") {
            block.items.forEach((item, index) => {
                const marker = block.ordered ? `${index + 1}. ` : "• ";
                children.push(
                    new Paragraph({
                        spacing: { after: index === block.items.length - 1 ? AFTER : 60 },
                        children: [new TextRun({ text: marker, font: FONT[theme.font], color: hexBare(theme.text) }), ...runs(item, theme)],
                    }),
                );
            });
            continue;
        }
        if (block.type === "quote") {
            children.push(
                paragraph(block.text, theme, { italic: true, color: theme.muted, indent: 360 }),
            );
            continue;
        }
        if (block.type === "code") {
            children.push(
                new Paragraph({
                    spacing: { after: AFTER },
                    shading: { type: ShadingType.CLEAR, fill: hexBare(theme.codeBg) },
                    children: [
                        new TextRun({
                            text: block.text,
                            font: FONT.mono,
                            color: hexBare(theme.codeText),
                            size: 18,
                        }),
                    ],
                }),
            );
            continue;
        }
        if (block.type === "hr") {
            children.push(
                new Paragraph({
                    spacing: { after: AFTER },
                    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: hexBare(theme.accent), space: 1 } },
                    children: [new TextRun("")],
                }),
            );
            continue;
        }
        children.push(table(block.header, block.rows, theme));
        // Word joins two tables that touch. An empty paragraph keeps them apart.
        children.push(new Paragraph({ spacing: { after: 0 }, children: [] }));
    }
    return children;
}

function paragraph(
    text: string,
    theme: ExportTheme,
    opts: { heading?: boolean; size?: number; italic?: boolean; color?: string; indent?: number },
): Paragraph {
    return new Paragraph({
        spacing: { after: AFTER },
        indent: opts.indent ? { left: opts.indent } : undefined,
        children: [
            new TextRun({
                text,
                italics: opts.italic,
                bold: opts.heading,
                size: opts.size,
                font: FONT[opts.heading ? theme.headingFont : theme.font],
                color: hexBare(opts.color ?? theme.text),
            }),
        ],
    });
}

function runs(items: InlineRun[], theme: ExportTheme): TextRun[] {
    return items.map(
        (run) =>
            new TextRun({
                text: run.text,
                bold: run.bold,
                italics: run.italic,
                font: run.code ? FONT.mono : FONT[theme.font],
                color: hexBare(run.href ? theme.accent : run.code ? theme.codeText : theme.text),
                size: run.code ? 20 : 22,
            }),
    );
}

function table(header: string[], rows: string[][], theme: ExportTheme): Table {
    const cell = (text: string, fill: string, color: string, headerCell: boolean) =>
        new TableCell({
            shading: { type: ShadingType.CLEAR, fill: hexBare(fill) },
            children: [
                new Paragraph({
                    children: [
                        new TextRun({
                            text,
                            bold: headerCell,
                            font: FONT[theme.font],
                            color: hexBare(color),
                        }),
                    ],
                }),
            ],
        });
    const line = { style: BorderStyle.SINGLE, size: 4, color: hexBare(theme.tableBorder) };
    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: { top: line, bottom: line, left: line, right: line, insideHorizontal: line, insideVertical: line },
        rows: [
            new TableRow({
                tableHeader: true,
                children: header.map((text) => cell(text, theme.tableHeaderBg, theme.tableHeaderText, true)),
            }),
            ...rows.map(
                (row, index) =>
                    new TableRow({
                        children: row.map((text) =>
                            cell(text, index % 2 === 1 ? theme.tableRowAltBg : theme.tableRowBg, theme.text, false),
                        ),
                    }),
            ),
        ],
    });
}
