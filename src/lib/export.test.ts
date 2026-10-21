import { describe, expect, test } from "bun:test";
import { markdownToBlocks } from "./exportBlocks";
import { exportDocx } from "./exportDocx";
import { renderThemedHtml } from "./exportHtml";
import { exportPdf } from "./exportPdf";
import { CLAY, ICE_SNOWSTORM, findTheme, sanitizeCustomThemes, slugThemeId } from "./themes";

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

async function unzipText(bytes: Uint8Array): Promise<Array<{ name: string; text: string }>> {
    const { unzipSync } = await import("fflate");
    const files = unzipSync(bytes);
    return Object.entries(files).map(([name, data]) => ({
        name,
        text: new TextDecoder().decode(data),
    }));
}
