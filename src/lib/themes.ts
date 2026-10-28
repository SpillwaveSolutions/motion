/**
 * Export themes. Builtins ship with the app. Custom themes live in settings.
 * `ice-snowstorm` is a cold navy page. `clay` follows Anthropic's paper-and-
 * terracotta palette (ivory #FAF9F5, ink #141413, clay #D97757).
 */

export type ThemeFont = "serif" | "sans" | "mono";

export interface ExportTheme {
    id: string;
    name: string;
    /** Builtins cannot be deleted or overwritten. */
    builtin: boolean;
    page: string;
    text: string;
    heading: string;
    accent: string;
    muted: string;
    codeBg: string;
    codeText: string;
    tableHeaderBg: string;
    tableHeaderText: string;
    tableRowBg: string;
    /** Every second body row, for the striped look. */
    tableRowAltBg: string;
    tableBorder: string;
    font: ThemeFont;
    headingFont: ThemeFont;
}

export const ICE_SNOWSTORM: ExportTheme = {
    id: "ice-snowstorm",
    name: "Ice Snowstorm",
    builtin: true,
    page: "#F3F6FB",
    text: "#111111",
    heading: "#0B1F4B",
    accent: "#1D4E89",
    muted: "#4A6280",
    codeBg: "#E4EDF7",
    codeText: "#0B1F4B",
    tableHeaderBg: "#1D4E89",
    tableHeaderText: "#FFFFFF",
    tableRowBg: "#FFFFFF",
    tableRowAltBg: "#E4EDF7",
    tableBorder: "#B8C7DB",
    font: "sans",
    headingFont: "sans",
};

/** Anthropic clay: warm ivory paper, near-black ink, terracotta accent. */
export const CLAY: ExportTheme = {
    id: "clay",
    name: "Clay",
    builtin: true,
    page: "#FAF9F5",
    text: "#3D3D3A",
    heading: "#141413",
    accent: "#D97757",
    muted: "#5E5D59",
    codeBg: "#F0EEE6",
    codeText: "#141413",
    tableHeaderBg: "#D97757",
    tableHeaderText: "#141413",
    tableRowBg: "#FAF9F5",
    tableRowAltBg: "#F0EEE6",
    tableBorder: "#E8E6DC",
    font: "sans",
    headingFont: "serif",
};

export const BUILTIN_THEMES: readonly ExportTheme[] = [ICE_SNOWSTORM, CLAY];

export const DEFAULT_EXPORT_THEME_ID = ICE_SNOWSTORM.id;

const FONTS: readonly ThemeFont[] = ["serif", "sans", "mono"];

export function parseHex(input: string): string | null {
    const raw = input.trim().replace(/^#/, "");
    if (/^[0-9a-fA-F]{3}$/.test(raw)) {
        const expanded = raw.split("").map((c) => c + c).join("");
        return `#${expanded.toUpperCase()}`;
    }
    if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toUpperCase()}`;
    return null;
}

export function hexToRgb(input: string): [number, number, number] {
    const hex = parseHex(input) ?? "#000000";
    return [
        Number.parseInt(hex.slice(1, 3), 16),
        Number.parseInt(hex.slice(3, 5), 16),
        Number.parseInt(hex.slice(5, 7), 16),
    ];
}

/** docx colors are RRGGBB with no hash. */
export function hexBare(input: string): string {
    return (parseHex(input) ?? "#000000").slice(1);
}

export function isBuiltinThemeId(id: string): boolean {
    return BUILTIN_THEMES.some((theme) => theme.id === id);
}

function fontOf(value: unknown, fallback: ThemeFont): ThemeFont {
    return FONTS.includes(value as ThemeFont) ? (value as ThemeFont) : fallback;
}

function colorOf(value: unknown, fallback: string): string {
    return typeof value === "string" ? (parseHex(value) ?? fallback) : fallback;
}

const TABLE_KEYS = ["tableHeaderBg", "tableHeaderText", "tableRowBg", "tableRowAltBg", "tableBorder"] as const;

type TableColors = Pick<ExportTheme, (typeof TABLE_KEYS)[number]>;

/** The table look themes had before table colors existed: tinted header, plain rows. */
function legacyTable(page: string, heading: string, muted: string, codeBg: string): TableColors {
    return { tableHeaderBg: codeBg, tableHeaderText: heading, tableRowBg: page, tableRowAltBg: page, tableBorder: muted };
}

function tableColors(raw: Record<string, unknown>, fallback: TableColors): TableColors {
    return {
        tableHeaderBg: colorOf(raw.tableHeaderBg, fallback.tableHeaderBg),
        tableHeaderText: colorOf(raw.tableHeaderText, fallback.tableHeaderText),
        tableRowBg: colorOf(raw.tableRowBg, fallback.tableRowBg),
        tableRowAltBg: colorOf(raw.tableRowAltBg, fallback.tableRowAltBg),
        tableBorder: colorOf(raw.tableBorder, fallback.tableBorder),
    };
}

export function sanitizeTheme(value: unknown, fallback: ExportTheme): ExportTheme | null {
    if (!value || typeof value !== "object") return null;
    const raw = value as Record<string, unknown>;
    const id = typeof raw.id === "string" ? raw.id.trim() : "";
    const name = typeof raw.name === "string" ? raw.name.trim() : "";
    if (!id || !name || isBuiltinThemeId(id)) return null;
    if (!/^[a-z0-9][a-z0-9-]{0,40}$/.test(id)) return null;
    const page = colorOf(raw.page, fallback.page);
    const heading = colorOf(raw.heading, fallback.heading);
    const muted = colorOf(raw.muted, fallback.muted);
    const codeBg = colorOf(raw.codeBg, fallback.codeBg);
    return {
        id,
        name: name.slice(0, 40),
        builtin: false,
        page,
        text: colorOf(raw.text, fallback.text),
        heading,
        accent: colorOf(raw.accent, fallback.accent),
        muted,
        codeBg,
        codeText: colorOf(raw.codeText, fallback.codeText),
        ...tableColors(raw, TABLE_KEYS.some((key) => key in raw) ? fallback : legacyTable(page, heading, muted, codeBg)),
        font: fontOf(raw.font, fallback.font),
        headingFont: fontOf(raw.headingFont, fallback.headingFont),
    };
}

export function sanitizeCustomThemes(value: unknown): ExportTheme[] {
    if (!Array.isArray(value)) return [];
    const out: ExportTheme[] = [];
    const seen = new Set<string>();
    for (const item of value) {
        const theme = sanitizeTheme(item, CLAY);
        if (!theme || seen.has(theme.id)) continue;
        seen.add(theme.id);
        out.push(theme);
        if (out.length >= 24) break;
    }
    return out;
}

export function listThemes(custom: readonly ExportTheme[]): ExportTheme[] {
    return [...BUILTIN_THEMES, ...custom];
}

export function findTheme(id: string, custom: readonly ExportTheme[]): ExportTheme {
    return listThemes(custom).find((theme) => theme.id === id) ?? ICE_SNOWSTORM;
}

export function slugThemeId(name: string, taken: readonly string[]): string {
    const base = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 32) || "theme";
    const safe = isBuiltinThemeId(base) ? `${base}-custom` : base;
    let id = safe;
    let n = 2;
    const used = new Set(taken);
    while (used.has(id) || isBuiltinThemeId(id)) {
        id = `${safe}-${n}`;
        n += 1;
    }
    return id;
}
