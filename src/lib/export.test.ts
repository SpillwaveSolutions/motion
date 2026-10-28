import { describe, expect, test } from "bun:test";
import { markdownToBlocks } from "./exportBlocks";
import { exportDocx } from "./exportDocx";
import { renderThemedHtml } from "./exportHtml";
import { exportPdf } from "./exportPdf";
import { CLAY, ICE_SNOWSTORM, findTheme, parseHex, sanitizeCustomThemes, slugThemeId } from "./themes";

const TABLE_KEYS = ["tableHeaderBg", "tableHeaderText", "tableRowBg", "tableRowAltBg", "tableBorder"] as const;

const TABLE = `| Name | Role |
| --- | --- |
| Ada | Engineer |
| Grace | Admiral |
| Linus | Kernel |
`;

const SAMPLE = `# Ice

A **bold** note with [a link](other.md).

- one
- two

> quoted

\`\`\`
code
\`\`\`

| Name | Role |
| --- | --- |
| Ada | Engineer |
`;

describe("themes", () => {
    test("builtins are ice-snowstorm and clay", () => {
        expect(ICE_SNOWSTORM.heading).toBe("#0B1F4B");
        expect(ICE_SNOWSTORM.text).toBe("#111111");
        expect(ICE_SNOWSTORM.accent).toBe("#1D4E89");
        expect(CLAY.page).toBe("#FAF9F5");
        expect(CLAY.heading).toBe("#141413");
        expect(CLAY.accent).toBe("#D97757");
        expect(CLAY.headingFont).toBe("serif");
    });

    test("custom themes cannot steal a builtin id and bad colors fall back", () => {
        const themes = sanitizeCustomThemes([
            { id: "ice-snowstorm", name: "Nope", page: "#fff" },
            { id: "harbor", name: "Harbor", page: "#123456", text: "nope", heading: "#abc", accent: "#D97757" },
        ]);
        expect(themes.map((theme) => theme.id)).toEqual(["harbor"]);
        expect(themes[0]?.page).toBe("#123456");
        expect(themes[0]?.heading).toBe("#AABBCC");
        expect(themes[0]?.text).toBe(CLAY.text);
        expect(findTheme("missing", themes).id).toBe("ice-snowstorm");
        expect(findTheme("harbor", themes).name).toBe("Harbor");
    });

    test("both builtins style table headers and alternate rows", () => {
        for (const theme of [ICE_SNOWSTORM, CLAY]) {
            for (const key of TABLE_KEYS) expect(parseHex(theme[key])).toBe(theme[key]);
            expect(theme.tableRowAltBg).not.toBe(theme.tableRowBg);
            expect(theme.tableHeaderBg).not.toBe(theme.tableRowBg);
        }
        expect(ICE_SNOWSTORM.tableHeaderBg).toBe("#1D4E89");
        expect(CLAY.tableHeaderBg).toBe("#D97757");
    });

    test("a theme saved without table colors keeps its old table look", () => {
        const [legacy] = sanitizeCustomThemes([
            { id: "old", name: "Old", page: "#101010", heading: "#202020", muted: "#303030", codeBg: "#404040" },
        ]);
        expect(legacy).toMatchObject({
            tableHeaderBg: "#404040",
            tableHeaderText: "#202020",
            tableRowBg: "#101010",
            tableRowAltBg: "#101010",
            tableBorder: "#303030",
        });
    });

    test("a bad table hex falls back to the default table color, not the legacy look", () => {
        const [bad] = sanitizeCustomThemes([
            { id: "bad", name: "Bad", codeBg: "#404040", tableHeaderBg: "#1D4E8", tableRowAltBg: "#abc" },
        ]);
        expect(bad?.tableHeaderBg).toBe(CLAY.tableHeaderBg);
        expect(bad?.tableHeaderText).toBe(CLAY.tableHeaderText);
        expect(bad?.tableRowAltBg).toBe("#AABBCC");
    });

    test("slug avoids builtin ids", () => {
        expect(slugThemeId("Clay", ["clay"])).toBe("clay-custom");
        expect(slugThemeId("Harbor", ["harbor"])).toBe("harbor-2");
    });
});

describe("markdownToBlocks", () => {
    test("keeps headings, marks, lists, quotes, code, and tables", () => {
        const blocks = markdownToBlocks(SAMPLE);
        expect(blocks[0]).toEqual({ type: "heading", level: 1, text: "Ice" });
        const paragraph = blocks.find((block) => block.type === "paragraph");
        expect(paragraph && paragraph.type === "paragraph" && paragraph.runs.some((run) => run.bold)).toBe(true);
        expect(paragraph && paragraph.type === "paragraph" && paragraph.runs.some((run) => run.href === "other.md")).toBe(true);
        expect(blocks.some((block) => block.type === "list")).toBe(true);
        expect(blocks.some((block) => block.type === "quote")).toBe(true);
        expect(blocks.some((block) => block.type === "code" && block.text === "code")).toBe(true);
        const table = blocks.find((block) => block.type === "table");
        expect(table).toMatchObject({ type: "table", header: ["Name", "Role"], rows: [["Ada", "Engineer"]] });
    });
});

describe("themed export", () => {
    test("preview HTML carries the theme colors", () => {
        const ice = renderThemedHtml(SAMPLE, ICE_SNOWSTORM, "Ice");
        expect(ice).toContain("#0B1F4B");
        expect(ice).toContain("#1D4E89");
        expect(ice).toContain("<h1>Ice</h1>");
        const clay = renderThemedHtml(SAMPLE, CLAY, "Ice");
        expect(clay).toContain("#FAF9F5");
        expect(clay).toContain("#D97757");
        expect(clay).toContain("Georgia");
    });

    test("PDF is a real PDF and includes the heading", () => {
        const bytes = exportPdf(SAMPLE, CLAY, "Ice");
        const text = new TextDecoder().decode(bytes);
        expect(text.startsWith("%PDF")).toBe(true);
        expect(text).toContain("Ice");
        expect(text).toContain("0.851 0.467 0.341");
    });

    test("preview HTML styles the table header, rows, stripes, and borders", () => {
        const html = renderThemedHtml(TABLE, CLAY, "T");
        expect(html).toContain(`th { background: ${CLAY.tableHeaderBg}; color: ${CLAY.tableHeaderText}; }`);
        expect(html).toContain(`tbody tr:nth-child(even) td { background: ${CLAY.tableRowAltBg}; }`);
        expect(html).toContain(`border: 1px solid ${CLAY.tableBorder}`);
    });

    test("PDF draws a table grid: one text object per cell, a filled header, and stripes", () => {
        const text = new TextDecoder().decode(exportPdf(TABLE, ICE_SNOWSTORM, "T"));
        for (const cell of ["Name", "Role", "Ada", "Engineer", "Grace", "Admiral"]) {
            expect(text).toContain(`(${cell}) Tj`);
        }
        expect(text).not.toContain("Ada   Engineer");
        expect(text).toContain("0.72 0.78 0.86 RG");
        // Ice: navy header, then white, ice, white body rows. jsPDF writes white as gray `1. g`.
        const header = "0.11 0.31 0.54 rg";
        const row = "1. g";
        const alt = "0.89 0.93 0.97 rg";
        expect(pdfCells(text).map((cell) => cell.fill)).toEqual([header, header, row, row, alt, alt, row, row]);
    });

    test("PDF rows grow to the tallest wrapped cell, and the next block starts below the table", () => {
        const long = "word ".repeat(80).trim();
        const text = new TextDecoder().decode(
            exportPdf(`| Name | Role |\n| --- | --- |\n| Ada | ${long} |\n| Grace | Admiral |\n\nAfter.\n`, CLAY, "T"),
        );
        const cells = pdfCells(text);
        expect(cells).toHaveLength(6);
        const [head, , ada, adaRole, grace] = cells;
        expect(ada!.h).toBe(adaRole!.h);
        expect(ada!.h).toBeGreaterThan(head!.h * 2);
        expect(grace!.h).toBe(head!.h);
        // PDF y grows upward. Each row starts where the row above it ends.
        expect(ada!.y).toBeCloseTo(head!.y - head!.h);
        expect(grace!.y).toBeCloseTo(ada!.y - ada!.h);
        const after = /([\d.]+) Td\n\(After\.\) Tj/.exec(text);
        expect(Number(after?.[1])).toBeLessThan(grace!.y - grace!.h);
    });

    test("PDF repeats the table header on every page the table runs onto", () => {
        const rows = Array.from({ length: 80 }, (_, i) => `| R${i} | x |`).join("\n");
        const text = new TextDecoder().decode(exportPdf(`| Name | Role |\n| --- | --- |\n${rows}\n`, CLAY, "T"));
        const pages = text.match(/\/Type \/Page\b/g)?.length ?? 0;
        expect(pages).toBeGreaterThan(1);
        expect(text.match(/\(Name\) Tj/g)?.length).toBe(pages);
        expect(text).toContain("(R79) Tj");
    });

    test("Word table uses the theme header, stripe, and border colors", async () => {
        const blob = await exportDocx(TABLE, CLAY, "T");
        const xml = (await unzipText(new Uint8Array(await blob.arrayBuffer()))).find((entry) =>
            entry.name.endsWith("document.xml"),
        )?.text ?? "";
        expect(xml).toContain(`w:fill="${CLAY.tableHeaderBg.slice(1)}"`);
        expect(xml).toContain(`w:fill="${CLAY.tableRowAltBg.slice(1)}"`);
        const fills = [...xml.matchAll(/w:fill="([0-9A-F]{6})"/g)].map((match) => `#${match[1]}`);
        const { tableHeaderBg: h, tableRowBg: r, tableRowAltBg: a } = CLAY;
        expect(fills).toEqual([h, h, r, r, a, a, r, r]);
        expect(xml).toContain(`w:color="${CLAY.tableBorder.slice(1)}"`);
        expect(xml).toContain("<w:tblHeader");
    });

    test("Word file is a docx zip that names the theme fonts and colors", async () => {
        const blob = await exportDocx(SAMPLE, ICE_SNOWSTORM, "Ice");
        const bytes = new Uint8Array(await blob.arrayBuffer());
        expect(bytes[0]).toBe(0x50);
        expect(bytes[1]).toBe(0x4b);
        const entries = await unzipText(bytes);
        const xml = entries.find((entry) => entry.name.endsWith("document.xml"))?.text ?? "";
        expect(xml).toContain("Ice");
        expect(xml).toContain("0B1F4B");
        expect(xml).toContain("Calibri");
        const clay = await exportDocx("# Title", CLAY, "Title");
        const clayXml = (await unzipText(new Uint8Array(await clay.arrayBuffer()))).find((entry) =>
            entry.name.endsWith("document.xml"),
        )?.text ?? "";
        expect(clayXml).toContain("Georgia");
        expect(clayXml).toContain("D97757");
    });
});

/**
 * Table cells in an uncompressed jsPDF stream: each is `x y w -h re` then `B`
 * (fill and stroke), drawn with the last fill operator outside a text object.
 */
function pdfCells(text: string): Array<{ y: number; h: number; fill: string }> {
    const cells: Array<{ y: number; h: number; fill: string }> = [];
    const lines = text.split("\n");
    let fill = "";
    let inText = false;
    lines.forEach((line, i) => {
        if (line === "BT") inText = true;
        else if (line === "ET") inText = false;
        else if (!inText && / (rg|g)$/.test(line)) fill = line;
        const rect = /^\S+ (\S+) \S+ -(\S+) re$/.exec(line);
        if (rect && lines[i + 1] === "B") cells.push({ y: Number(rect[1]), h: Number(rect[2]), fill });
    });
    return cells;
}

async function unzipText(bytes: Uint8Array): Promise<Array<{ name: string; text: string }>> {
    const { unzipSync } = await import("fflate");
    const files = unzipSync(bytes);
    return Object.entries(files).map(([name, data]) => ({
        name,
        text: new TextDecoder().decode(data),
    }));
}
